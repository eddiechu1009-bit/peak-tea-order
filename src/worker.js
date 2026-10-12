import { menus, stores, DEFAULT_STORE_ID } from "../public/stores.js";
import { AppError, validId, text, groupInput, quoteEntry, isOpen, withActualPrice } from "./domain.js";

const headers = {
  "Cache-Control": "no-store",
  "Content-Type": "application/json; charset=utf-8",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "no-referrer"
};
const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers });
const now = () => new Date().toISOString();
const token = () => [...crypto.getRandomValues(new Uint8Array(32))].map(b => b.toString(16).padStart(2, "0")).join("");
async function hash(value) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, "0")).join("");
}
async function secret(request, name) {
  const key = request.headers.get(name) ?? "";
  return /^[a-f0-9]{64}$/.test(key) ? hash(key) : "";
}
async function body(request) {
  if (!request.headers.get("Content-Type")?.startsWith("application/json")) throw new AppError("請使用 JSON 格式", 415);
  if (Number(request.headers.get("Content-Length") ?? 0) > 12000) throw new AppError("內容過長", 413);
  const raw = await request.text();
  if (raw.length > 12000) throw new AppError("內容過長", 413);
  try {
    const data = JSON.parse(raw);
    if (!data || Array.isArray(data) || typeof data !== "object") throw new Error();
    return data;
  } catch { throw new AppError("內容格式不正確"); }
}
async function getGroup(db, id) {
  const group = await db.prepare("SELECT * FROM groups WHERE id = ?").bind(validId(id)).first();
  if (!group) throw new AppError("這個團購不存在，請向主揪確認連結", 404);
  return group;
}
function outputEntry(row) {
  return { ...JSON.parse(row.data), id: row.id, version: row.version, createdAt: row.created_at, updatedAt: row.updated_at };
}
async function groupResult(db, group, host) {
  const menu = menus[group.store_id ?? DEFAULT_STORE_ID];
  const result = await db.prepare("SELECT id, data, version, created_at, updated_at FROM entries WHERE group_id = ? ORDER BY created_at, id").bind(group.id).all();
  return {
    id: group.id, title: group.title, date: group.date, hostName: group.host_name,
    status: group.status, deadline: group.deadline, note: group.note, createdAt: group.created_at,
    open: isOpen(group), isHost: host, storeId: menu.storeId, shop: menu.shop, branch: menu.branch, menuVersion: menu.version, menu,
    entries: result.results.map(outputEntry), serverTime: now()
  };
}
function enforceOrigin(request, env) {
  const origin = request.headers.get("Origin");
  if (!origin) return;
  const allowed = new Set([new URL(request.url).origin, ...(env.ALLOWED_ORIGINS ?? "").split(",").filter(Boolean)]);
  if (!allowed.has(origin)) throw new AppError("這個網站無法操作訂單", 403);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (!url.pathname.startsWith("/api/")) return env.ASSETS.fetch(request);
    let response;
    try {
      enforceOrigin(request, env);
      if (request.method === "OPTIONS") {
        response = new Response(null, { status: 204, headers });
      } else {
        response = await route(request, env, url);
      }
    } catch (error) {
      if (!(error instanceof AppError)) console.error("API error", error.message);
      response = json({ error: error instanceof AppError ? error.message : "暫時無法完成，請稍後重試" },
        error instanceof AppError ? error.status : 500);
    }
    const origin = request.headers.get("Origin");
    const allowed = new Set([url.origin, ...(env.ALLOWED_ORIGINS ?? "").split(",").filter(Boolean)]);
    if (origin && allowed.has(origin)) {
      response.headers.set("Access-Control-Allow-Origin", origin);
      response.headers.set("Access-Control-Allow-Methods", "GET, POST, PATCH, PUT, DELETE, OPTIONS");
      response.headers.set("Access-Control-Allow-Headers", "Content-Type, X-Host-Key, X-Edit-Key");
      response.headers.set("Vary", "Origin");
    }
    return response;
  }
};

async function route(request, env, url) {
  const { DB } = env;
  const method = request.method;
  if (url.pathname === "/api/health" && method === "GET") {
    await DB.prepare("SELECT 1").first();
    return json({ ok: true });
  }
  if (url.pathname === "/api/stores" && method === "GET") return json(stores);
  if (url.pathname === "/api/menu" && method === "GET") {
    const id = url.searchParams.get("store") ?? DEFAULT_STORE_ID;
    if (!Object.hasOwn(menus, id)) throw new AppError("找不到這家飲料門市", 404);
    return json(menus[id]);
  }
  if (url.pathname === "/api/groups" && method === "POST") {
    const data = groupInput(await body(request));
    const id = crypto.randomUUID();
    const hostKey = token();
    await DB.prepare("INSERT INTO groups (id, title, date, host_name, host_hash, deadline, note, created_at, store_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)")
      .bind(id, data.title, data.date, data.hostName, await hash(hostKey), data.deadline, data.note, now(), data.storeId).run();
    return json({ id, hostKey }, 201);
  }
  const match = url.pathname.match(/^\/api\/groups\/([^/]+)(?:\/entries(?:\/([^/]+))?)?$/);
  if (!match) throw new AppError("找不到此功能", 404);
  const group = await getGroup(DB, match[1]);
  const menu = menus[group.store_id ?? DEFAULT_STORE_ID];
  const hostHash = await secret(request, "X-Host-Key");
  const isHost = !!hostHash && hostHash === group.host_hash;
  const isEntries = url.pathname.includes("/entries");
  if (!isEntries && method === "GET") return json(await groupResult(DB, group, isHost));
  if (!isEntries && method === "PATCH") {
    if (!isHost) throw new AppError("只有主揪可以管理收單狀態", 403);
    const input = await body(request);
    if (input.status !== undefined && !["open", "closed"].includes(input.status)) throw new AppError("收單狀態不正確");
    const note = input.note === undefined ? null : text(input.note, 300, "團購備註");
    if (input.clearDeadline === true) group.deadline = null;
    if (input.status === "open" && group.deadline && new Date(group.deadline).valueOf() <= Date.now()) {
      throw new AppError("原截止時間已過；重新開放時需清除截止時間");
    }
    await DB.prepare("UPDATE groups SET status = COALESCE(?, status), note = COALESCE(?, note), deadline = CASE WHEN ? = 1 THEN NULL ELSE deadline END WHERE id = ?")
      .bind(input.status ?? null, note, input.clearDeadline === true ? 1 : 0, group.id).run();
    return json(await groupResult(DB, await getGroup(DB, group.id), true));
  }
  if (!isEntries && method === "DELETE") {
    if (!isHost) throw new AppError("只有主揪可以刪除整團", 403);
    await DB.batch([
      DB.prepare("DELETE FROM entries WHERE group_id = ?").bind(group.id),
      DB.prepare("DELETE FROM groups WHERE id = ?").bind(group.id)
    ]);
    return json({ deleted: true });
  }
  const ownerHash = await secret(request, "X-Edit-Key");
  if (!ownerHash && !isHost) throw new AppError("無法辨識你的填單裝置，請重新整理", 403);
  if (isEntries && !match[2] && method === "POST") {
    if (!ownerHash) throw new AppError("無法辨識你的填單裝置，請重新整理", 403);
    const input = await body(request);
    const id = validId(input.id);
    const existing = await DB.prepare("SELECT * FROM entries WHERE id = ?").bind(id).first();
    if (existing) {
      if (existing.group_id !== group.id || existing.owner_hash !== ownerHash) throw new AppError("此筆飲料編號已存在", 409);
      return json(outputEntry(existing));
    }
    if (!isOpen(group)) throw new AppError("已截止收單，請聯絡主揪", 409);
    const data = withActualPrice(quoteEntry(input, menu), input, null, isHost, menu);
    const timestamp = now();
    const result = await DB.prepare(
      `INSERT INTO entries (id, group_id, owner_hash, data, created_at, updated_at)
       SELECT ?, id, ?, ?, ?, ? FROM groups
       WHERE id = ? AND status = 'open' AND (deadline IS NULL OR deadline > ?)
       AND (SELECT COUNT(*) FROM entries WHERE group_id = ?) < 200
       ON CONFLICT(id) DO NOTHING`)
      .bind(id, ownerHash, JSON.stringify(data), timestamp, timestamp, group.id, timestamp, group.id).run();
    if (!result.meta.changes) {
      const retried = await DB.prepare("SELECT * FROM entries WHERE id = ?").bind(id).first();
      if (retried && retried.group_id === group.id && retried.owner_hash === ownerHash) return json(outputEntry(retried));
      throw new AppError("已截止或本團已達 200 筆，請聯絡主揪", 409);
    }
    return json({ ...data, id, version: 1, createdAt: timestamp, updatedAt: timestamp }, 201);
  }
  if (match[2] && ["PUT", "DELETE"].includes(method)) {
    const entry = await DB.prepare("SELECT * FROM entries WHERE group_id = ? AND id = ?").bind(group.id, validId(match[2])).first();
    if (!entry) throw new AppError("這筆飲料已不存在", 404);
    if (!isHost && entry.owner_hash !== ownerHash) throw new AppError("只能修改自己在這台裝置填的飲料", 403);
    if (!isHost && !isOpen(group)) throw new AppError("已截止收單，請聯絡主揪修改", 409);
    const input = await body(request);
    if (!Number.isInteger(input.version) || input.version < 1) throw new AppError("請重新整理後再操作");
    const timestamp = now();
    const condition = `group_id = ? AND id = ? AND version = ?
      AND EXISTS (SELECT 1 FROM groups WHERE id = ? AND
      (? = 1 OR (status = 'open' AND (deadline IS NULL OR deadline > ?))))`;
    let result;
    let data;
    if (method === "PUT") {
      data = withActualPrice(quoteEntry(input, menu), input, JSON.parse(entry.data), isHost, menu);
      result = await DB.prepare(`UPDATE entries SET data = ?, version = version + 1, updated_at = ? WHERE ${condition}`)
        .bind(JSON.stringify(data), timestamp, group.id, entry.id, input.version, group.id, isHost ? 1 : 0, timestamp).run();
    } else {
      result = await DB.prepare(`DELETE FROM entries WHERE ${condition}`)
        .bind(group.id, entry.id, input.version, group.id, isHost ? 1 : 0, timestamp).run();
    }
    if (!result.meta.changes) throw new AppError("訂單已更新或收單狀態已變更，請重新整理再操作", 409);
    return json(method === "DELETE" ? { deleted: true } :
      { ...data, id: entry.id, version: input.version + 1, createdAt: entry.created_at, updatedAt: timestamp });
  }
  throw new AppError("不支援此操作", 405);
}
