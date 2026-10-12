import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
const base = process.env.TEST_URL ?? "http://127.0.0.1:8787";
const owner = randomBytes(32).toString("hex");
const stranger = randomBytes(32).toString("hex");
let group;
let timedGroup;
let passed = 0;
async function request(path, method = "GET", data, extra = {}) {
  const response = await fetch(`${base}${path}`, {
    method, headers: { "Content-Type": "application/json", "X-Edit-Key": owner, ...extra },
    body: data ? JSON.stringify(data) : undefined
  });
  return { status: response.status, data: await response.json() };
}
function check(condition, message) { assert.ok(condition, message); passed++; console.log(`✓ ${message}`); }
try {
  const created = await request("/api/groups", "POST", { title: "自動測試團（將刪除）", hostName: "測試主揪", date: "2026-10-12", note: "" });
  check(created.status === 201, "建立日期團");
  group = created.data;
  const path = `/api/groups/${group.id}`;
  const host = { "X-Host-Key": group.hostKey };
  const read = await request(path);
  check(read.status === 200 && read.data.isHost === false && !JSON.stringify(read.data).includes(group.hostKey), "分享讀取不洩漏管理金鑰");
  const entry = { id: randomUUID(), name: "甲", drinkId: "spring-qing", size: "L", temperature: "冰", sugar: 30, ice: "少冰", addons: ["amber"], oatMilk: false, quantity: 2, note: "", total: 1 };
  const added = await request(`${path}/entries`, "POST", entry);
  check(added.status === 201 && added.data.total === 90, "伺服器重算單價與兩杯金額");
  const duplicate = await Promise.all(Array.from({ length: 4 }, () => request(`${path}/entries`, "POST", entry)));
  const afterDuplicate = await request(path);
  check(duplicate.every(r => r.status === 200) && afterDuplicate.data.entries.length === 1, "重送／併發同筆不重複新增");
  const changed = await request(`${path}/entries/${entry.id}`, "PUT", { ...entry, version: 1, quantity: 3 });
  check(changed.status === 200 && changed.data.total === 135 && changed.data.version === 2, "原填單者可修改");
  const stolen = await request(`${path}/entries/${entry.id}`, "PUT", { ...entry, version: 2 }, { "X-Edit-Key": stranger });
  check(stolen.status === 403, "其他裝置不能修改別人的飲料");
  const stale = await request(`${path}/entries/${entry.id}`, "PUT", { ...entry, version: 1 });
  check(stale.status === 409, "舊版本拒絕覆寫新修改");
  const invalid = await request(`${path}/entries`, "POST", { ...entry, id: randomUUID(), drinkId: "lychee-spring", sugar: 0 });
  check(invalid.status === 400, "後端拒絕果茶無糖");
  const hostlessClose = await request(path, "PATCH", { status: "closed" });
  check(hostlessClose.status === 403, "同事不能截止整團");
  const close = await request(path, "PATCH", { status: "closed" }, host);
  check(close.status === 200 && close.data.open === false, "主揪截止收單");
  const afterClose = await request(`${path}/entries`, "POST", { ...entry, id: randomUUID() });
  const ownClosedEdit = await request(`${path}/entries/${entry.id}`, "PUT", { ...entry, version: 2 });
  check(afterClose.status === 409 && ownClosedEdit.status === 409, "截止後後端拒絕新單與同事修改");
  const hostEdit = await request(`${path}/entries/${entry.id}`, "PUT", { ...entry, version: 2, quantity: 1 }, host);
  check(hostEdit.status === 200 && hostEdit.data.total === 45, "主揪可修正截止後的訂單");
  const reopened = await request(path, "PATCH", { status: "open", clearDeadline: true }, host);
  check(reopened.status === 200 && reopened.data.open, "重新開放收單");
  const concurrent = await Promise.all(Array.from({ length: 8 }, (_, i) => request(`${path}/entries`, "POST", { ...entry, id: randomUUID(), name: `同事 ${i}`, quantity: 1 })));
  const final = await request(path);
  check(concurrent.every(r => r.status === 201) && final.data.entries.length === 9, "不同同事併發填單完整保留");
  const remove = await request(`${path}/entries/${entry.id}`, "DELETE", { version: 3 });
  check(remove.status === 200 && (await request(path)).data.entries.length === 8, "原填單者可移除自己的飲料");
  const alien = await request("/api/groups", "POST", { title: "bad", hostName: "bad", date: "2026-10-12" }, { Origin: "https://untrusted.example" });
  check(alien.status === 403, "拒絕未允許網站來源");
  const timed = await request("/api/groups", "POST", {
    title: "另一日期截止測試團（將刪除）", hostName: "測試主揪", date: "2026-10-13",
    deadline: new Date(Date.now() + 1200).toISOString()
  });
  timedGroup = timed.data;
  const separate = await request(`/api/groups/${timedGroup.id}`);
  check(separate.data.entries.length === 0 && separate.data.date === "2026-10-13", "不同日期各有獨立訂單與明細");
  await new Promise(resolve => setTimeout(resolve, 1400));
  const expired = await request(`/api/groups/${timedGroup.id}/entries`, "POST", { ...entry, id: randomUUID() });
  check(expired.status === 409 && !(await request(`/api/groups/${timedGroup.id}`)).data.open, "伺服器依截止時間拒絕填單");
  const timedReopen = await request(`/api/groups/${timedGroup.id}`, "PATCH", { status: "open", clearDeadline: true }, { "X-Host-Key": timedGroup.hostKey });
  check(timedReopen.status === 200 && timedReopen.data.open && timedReopen.data.deadline === null, "到期團可清除截止時間再開放");
  console.log(`\n${passed} 個整合檢查通過`);
} finally {
  if (timedGroup?.id) {
    assert.equal((await request(`/api/groups/${timedGroup.id}`, "DELETE", undefined, { "X-Host-Key": timedGroup.hostKey })).status, 200);
  }
  if (group) {
    const removed = await request(`/api/groups/${group.id}`, "DELETE", undefined, { "X-Host-Key": group.hostKey });
    assert.equal(removed.status, 200, "清除測試團");
    assert.equal((await request(`/api/groups/${group.id}`)).status, 404, "確認清除");
    console.log("測試团及資料已清除");
  }
}
