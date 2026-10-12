import { menu } from "./menu.js?v=att-20261012";
import { API_ORIGIN } from "./config.js";

const app = document.querySelector("#app");
const dialog = document.querySelector("#drink-dialog");
const storageKey = "peak-tea:v1";
const state = { group: null, category: "all", search: "", tab: "menu", draft: null, originalEntry: null, busy: false };
const esc = value => String(value ?? "").replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
const money = value => `NT$ ${Number(value).toLocaleString("zh-TW")}`;
const today = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Taipei", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
const dateLabel = date => new Intl.DateTimeFormat("zh-TW", { timeZone: "Asia/Taipei", month: "long", day: "numeric", weekday: "long" }).format(new Date(`${date}T12:00:00+08:00`));
const deadlineLabel = value => value ? new Intl.DateTimeFormat("zh-TW", { timeZone: "Asia/Taipei", month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(value)) : "主揪手動截止";
const sugarLabel = value => menu.sugars.find(s => s.value === value)?.label ?? "";
const addonNames = entry => [
  ...entry.addons.map(id => menu.addons.find(a => a.id === id)?.name).filter(Boolean),
  ...(entry.oatMilk ? ["換燕麥奶"] : [])
];
const choices = entry => `${entry.size === "M" ? "中杯" : "大杯"} · ${entry.temperature === "冰" ? entry.ice : entry.temperature} · ${sugarLabel(entry.sugar)}${addonNames(entry).length ? ` · ${addonNames(entry).join("＋")}` : ""}`;
let stored;
let storageAvailable = true;
try { stored = JSON.parse(localStorage.getItem(storageKey) ?? "{}"); } catch { stored = {}; }
if (!stored || typeof stored !== "object" || Array.isArray(stored)) stored = {};
stored.groups ??= {};
stored.mine ??= {};
if (!stored.editKey || !/^[a-f0-9]{64}$/.test(stored.editKey)) {
  stored.editKey = [...crypto.getRandomValues(new Uint8Array(32))].map(b => b.toString(16).padStart(2, "0")).join("");
}
function save() {
  try { localStorage.setItem(storageKey, JSON.stringify(stored)); }
  catch { storageAvailable = false; }
}
save();
const params = new URLSearchParams(location.search);
const groupId = params.get("g");
const incomingHostKey = new URLSearchParams(location.hash.slice(1)).get("host");
if (groupId && incomingHostKey && /^[a-f0-9]{64}$/.test(incomingHostKey)) {
  stored.groups[groupId] = { ...(stored.groups[groupId] ?? {}), hostKey: incomingHostKey };
  save();
  history.replaceState(null, "", `${location.pathname}${location.search}`);
}
const hostKey = () => stored.groups[state.group?.id ?? groupId]?.hostKey ?? "";
const guestUrl = id => `${location.origin}${location.pathname}?g=${encodeURIComponent(id)}`;
const hostUrl = id => `${guestUrl(id)}#host=${stored.groups[id]?.hostKey ?? ""}`;

function toast(message) {
  const node = document.querySelector("#toast");
  node.textContent = message;
  node.hidden = false;
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => { node.hidden = true; }, 4500);
}
async function api(path, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);
  try {
    const response = await fetch(`${API_ORIGIN}${path}`, {
      ...options,
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        "X-Edit-Key": stored.editKey,
        ...(hostKey() ? { "X-Host-Key": hostKey() } : {}),
        ...options.headers
      },
      cache: "no-store"
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "暫時無法完成，請稍後再試");
    return data;
  } catch (error) {
    if (error.name === "AbortError") throw new Error("連線較慢，請再試一次；已送出的飲料不會重複新增");
    throw error;
  } finally { clearTimeout(timeout); }
}
function mount(html) { app.innerHTML = html; app.setAttribute("aria-busy", "false"); }
function home() {
  const groups = Object.entries(stored.groups).filter(([, g]) => g.title).sort((a, b) => b[1].date.localeCompare(a[1].date));
  mount(`
    <section class="home-hero">
      <div class="hero-copy">
        <span class="eyebrow">${esc(menu.branch)} · 同事飲料團</span>
        <h1>忙裡，<br>一起喝杯好茶。</h1>
        <p>開一團，分享給同事。<br>大家自己選，杯數和金額幫你算好。</p>
        <a class="button primary" href="#create">開一個飲料團 <span aria-hidden="true">＋</span></a>
        <div class="hero-pills"><span>免登入填單</span><span>每團獨立連結</span><span>自動彙整</span></div>
      </div>
      <div class="hero-art"><img src="./tea-art.svg" alt="兩杯茶飲與青山的插畫"><span class="art-caption">一杯給自己，一杯給好同事。</span></div>
    </section>
    <section class="create-section" id="create">
      <div class="section-intro"><span class="eyebrow">LET'S GET STARTED</span><h2>今天誰來揪？</h2><p>先定日期，再把連結丟進群組。</p>
        <ol class="steps"><li><span>01</span>開團、分享連結</li><li><span>02</span>同事選茶、填名字</li><li><span>03</span>帶著清單去買</li></ol>
      </div>
      <form id="create-form" class="create-card">
        <div class="field-row">
          <label>訂單日期<input type="date" name="date" value="${today()}" required></label>
          <label>主揪名字<input name="hostName" value="${esc(stored.name ?? "")}" placeholder="怎麼稱呼你？" maxlength="30" autocomplete="name" required></label>
        </div>
        <label>這團叫什麼<input name="title" value="青山下午茶" placeholder="例如：週一補充茶能量" maxlength="60" required></label>
        <div class="field-row">
          <label>截止時間 <span class="optional">選填</span><input name="deadline" type="datetime-local"><small>留空就由你手動截止，時間為台灣時間。</small></label>
          <label>門市<input value="青山青茶 · ${esc(menu.branch)}" readonly><small>採用 ATT 百貨門市價格。</small></label>
        </div>
        <label>給同事的小提醒 <span class="optional">選填</span><textarea name="note" rows="2" maxlength="300" placeholder="例如：15:00 出發買，請在出發前填好。"></textarea></label>
        <p class="form-error" id="create-error" role="alert" hidden></p>
        <button class="button primary full" type="submit">建立飲料團 <span aria-hidden="true">→</span></button>
        <p class="fine-print">拿到訂單連結的人可看本團名字與飲料。主揪管理連結請自己保存。</p>
      </form>
    </section>
    ${groups.length ? `<section class="recent-section"><div class="section-heading"><h2>我開過的團</h2><span class="muted">保存在這台裝置</span></div><div class="recent-grid">${groups.map(([id, g]) => `<a class="recent-card" href="${esc(guestUrl(id))}"><span class="eyebrow">${esc(g.date)}</span><strong>${esc(g.title)}</strong><span>回到這團 <span aria-hidden="true">↗</span></span></a>`).join("")}</div></section>` : ""}
  `);
  document.querySelector("#create-form").addEventListener("submit", createGroup);
}
async function createGroup(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const button = form.querySelector('button[type="submit"]');
  const error = document.querySelector("#create-error");
  const values = Object.fromEntries(new FormData(form));
  error.hidden = true;
  if (!storageAvailable) {
    error.textContent = "瀏覽器目前無法保存管理連結，請允許網站儲存資料或改用一般瀏覽模式再開團。";
    error.hidden = false;
    return;
  }
  button.disabled = true;
  button.textContent = "正在開團…";
  try {
    values.deadline = values.deadline ? new Date(`${values.deadline}:00+08:00`).toISOString() : null;
    const result = await api("/api/groups", { method: "POST", body: JSON.stringify(values) });
    stored.name = values.hostName;
    stored.groups[result.id] = { hostKey: result.hostKey, title: values.title, date: values.date };
    save();
    location.href = hostUrl(result.id);
  } catch (e) {
    error.textContent = e.message; error.hidden = false;
    button.disabled = false; button.innerHTML = '建立飲料團 <span aria-hidden="true">→</span>';
  }
}
async function refresh(initial = false) {
  if (!groupId || refresh.running) return;
  refresh.running = true;
  try {
    const group = await api(`/api/groups/${encodeURIComponent(groupId)}`);
    const previousOpen = state.group?.open;
    state.group = group;
    if (stored.groups[group.id]) {
      stored.groups[group.id] = { ...stored.groups[group.id], title: group.title, date: group.date };
      save();
    }
    if (initial) renderGroup();
    else {
      updateStats();
      if (state.tab !== "menu") renderTab();
      if (previousOpen !== group.open) {
        renderStatus();
        if (state.tab === "menu") renderMenu();
        if (dialog.open) syncDraft();
      }
    }
    const sync = document.querySelector("#sync-status");
    if (sync) sync.textContent = `已同步 ${new Intl.DateTimeFormat("zh-TW", { hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date())}`;
  } catch (e) {
    if (initial) mount(`<section class="error-page"><span class="eyebrow">連結確認</span><h1>暫時找不到這一團</h1><p>${esc(e.message)}</p><button class="button primary" id="retry">再試一次</button><a href="./" class="button secondary">回首頁</a></section>`);
    else {
      const sync = document.querySelector("#sync-status");
      if (sync) { sync.textContent = "同步失敗，資料可能不是最新"; sync.classList.add("sync-error"); }
    }
  } finally {
    refresh.running = false;
    document.querySelector("#retry")?.addEventListener("click", () => refresh(true), { once: true });
  }
}
function renderGroup() {
  const g = state.group;
  mount(`
    <section class="group-hero">
      <div><div class="group-meta"><span class="eyebrow">${esc(dateLabel(g.date))}</span><span id="group-status"></span></div>
        <h1>${esc(g.title)}</h1><p>青山青茶 · ${esc(menu.branch)} <span class="meta-dot">·</span> 主揪 ${esc(g.hostName)}</p>
        ${g.note ? `<div class="group-note">${esc(g.note)}</div>` : ""}
      </div>
      <div class="group-actions"><button class="button primary" id="share-group">分享填單連結 <span aria-hidden="true">↗</span></button><span class="deadline">截止：${esc(deadlineLabel(g.deadline))}</span></div>
    </section>
    <section class="stats-row" id="stats-row" aria-label="訂單統計"></section>
    ${g.isHost ? `<section class="host-bar"><div><span class="host-label">主揪管理</span><span class="muted">你可調整所有飲料與收單狀態</span></div><div><button id="copy-host" class="text-button">保存管理連結</button><button id="toggle-status" class="button small secondary"></button></div></section>` : ""}
    <section class="order-workspace">
      <div class="workspace-nav"><div class="tabs" role="tablist" aria-label="訂單工作區">
        <button id="tab-menu" class="tab active" data-tab="menu" role="tab" aria-selected="true">選一杯好茶</button>
        <button id="tab-list" class="tab" data-tab="list" role="tab" aria-selected="false">大家點了什麼 <span id="entry-count"></span></button>
        <button id="tab-purchase" class="tab" data-tab="purchase" role="tab" aria-selected="false">去買清單</button>
      </div><span id="sync-status" class="sync-status">正在同步</span></div>
      <div id="tab-content" role="tabpanel" aria-labelledby="tab-menu"></div>
    </section>
    <section class="bottom-note"><span>每 10 秒同步 · 自己的飲料可在原填單裝置修改${g.isHost ? " · 請保留主揪管理連結" : ""}</span><span>價格含所選加料；實際供應與金額依門市現場為準。</span></section>
  `);
  renderStatus(); updateStats(); renderTab();
  document.querySelector("#share-group").addEventListener("click", () => copy(guestUrl(g.id), "填單連結已複製，可以分享給同事了"));
  document.querySelector("#copy-host")?.addEventListener("click", () => copy(hostUrl(g.id), "主揪管理連結已複製，請自己保存"));
  document.querySelector("#toggle-status")?.addEventListener("click", toggleStatus);
  document.querySelectorAll("[data-tab]").forEach(button => button.addEventListener("click", () => {
    state.tab = button.dataset.tab;
    document.querySelectorAll("[data-tab]").forEach(tab => {
      const selected = tab.dataset.tab === state.tab;
      tab.classList.toggle("active", selected); tab.setAttribute("aria-selected", String(selected));
    });
    renderTab();
  }));
}
function renderStatus() {
  const g = state.group;
  document.querySelector("#group-status").innerHTML = `<span class="status-badge ${g.open ? "open" : "closed"}"><i></i>${g.open ? "揪團中" : "已截止"}</span>`;
  const button = document.querySelector("#toggle-status");
  if (button) button.textContent = g.open ? "截止收單" : "重新開放";
}
function updateStats() {
  const entries = state.group.entries;
  const cups = entries.reduce((sum, e) => sum + e.quantity, 0);
  const total = entries.reduce((sum, e) => sum + e.total, 0);
  const people = new Set(entries.map(e => e.name.trim())).size;
  document.querySelector("#stats-row").innerHTML = `
    <div class="stat"><span>已填單名字</span><strong>${people}<small>位</small></strong><p>同名合併統計</p></div>
    <div class="stat"><span>今天的茶能量</span><strong>${cups}<small>杯</small></strong><p>${entries.length} 筆飲料</p></div>
    <div class="stat total-stat"><span>預估總金額</span><strong><small>NT$</small> ${total.toLocaleString("zh-TW")}</strong><p>已含加料與奶類升級</p></div>
    <div class="stat stat-tip"><span class="tip-icon" aria-hidden="true">✦</span><p>選好茶，<br>留一點時間給自己。</p></div>`;
  document.querySelector("#entry-count").textContent = entries.length ? `(${entries.length})` : "";
}
function renderTab() {
  const content = document.querySelector("#tab-content");
  content.setAttribute("aria-labelledby", `tab-${state.tab}`);
  if (state.tab === "menu") {
    content.innerHTML = `<div class="menu-toolbar"><div class="category-scroll"><button class="category ${state.category === "all" ? "active" : ""}" data-category="all">全部茶飲</button>${menu.categories.map(c => `<button class="category ${state.category === c.id ? "active" : ""}" data-category="${c.id}">${esc(c.name)}</button>`).join("")}</div><label class="search-box"><span aria-hidden="true">⌕</span><input id="menu-search" type="search" value="${esc(state.search)}" placeholder="找找想喝的茶" aria-label="搜尋飲料"></label></div>
      <div id="closed-notice"></div><div id="drink-grid" class="drink-grid"></div>
      <p class="menu-footnote">採用信義 ATT 百貨門市中／大杯價格。奶蓋僅少冰、果茶至少 1 分糖、冬露至少半糖；其他冷熱供應請依門市確認。</p>`;
    content.querySelectorAll("[data-category]").forEach(button => button.addEventListener("click", () => {
      state.category = button.dataset.category;
      content.querySelectorAll("[data-category]").forEach(b => b.classList.toggle("active", b.dataset.category === state.category));
      renderMenu();
    }));
    document.querySelector("#menu-search").addEventListener("input", event => { state.search = event.target.value; renderMenu(); });
    renderMenu();
  } else if (state.tab === "list") renderList();
  else renderPurchase();
}
function renderMenu() {
  const notice = document.querySelector("#closed-notice");
  if (!notice) return;
  notice.innerHTML = state.group.open ? "" : `<div class="notice">本團已截止收單。可查看飲料與購買清單；需要調整請找主揪。</div>`;
  const drinks = menu.drinks.filter(d => (state.category === "all" || d.category === state.category) && `${d.name}${d.description ?? ""}${d.tags.join("")}`.includes(state.search.trim()));
  document.querySelector("#drink-grid").innerHTML = drinks.length ? drinks.map(drink => `
    <button class="drink-card ${drink.category}" data-drink="${drink.id}" ${!state.group.open ? "disabled" : ""}>
      <div class="drink-card-top"><span class="drink-category">${esc(menu.categories.find(c => c.id === drink.category).name)}</span><span class="drink-symbol" aria-hidden="true">${drink.category === "fruit" ? "◒" : drink.category === "toppings" ? "⠿" : "♧"}</span></div>
      <h3>${esc(drink.name)}</h3><p class="drink-description">${esc(drink.description ?? (drink.included ? `已含${drink.included.join("、")}` : drink.cap ? "香濃奶蓋・僅少冰" : drink.minSugar === 50 ? "冬露風味・至少半糖" : "依喜好選冷熱與甜度"))}</p>
      <div class="drink-tags">${drink.tags.map(tag => `<span class="${tag === "推薦" ? "recommended" : ""}">${esc(tag)}</span>`).join("")}</div>
      <div class="drink-bottom"><span class="drink-prices">${Object.entries(drink.prices).map(([size, price]) => `<span>${size} <b>$${price}</b></span>`).join("")}</span><span class="add-circle" aria-hidden="true">＋</span></div>
    </button>`).join("") : `<div class="empty-state"><h3>還沒找到這款茶</h3><p>換個關鍵字，或看看其他分類。</p></div>`;
  document.querySelectorAll("[data-drink]").forEach(button => button.addEventListener("click", () => openDrink(button.dataset.drink)));
}
function canEdit(entry) { return state.group.isHost || (state.group.open && (stored.mine[state.group.id] ?? []).includes(entry.id)); }
function renderList() {
  const entries = state.group.entries;
  document.querySelector("#tab-content").innerHTML = `
    <div class="section-heading list-heading"><div><h2>大家的茶，都在這裡。</h2><p class="muted">確認名字和飲料，出發前就不怕漏單。</p></div><button class="text-button" id="manual-refresh">重新整理 ↻</button></div>
    ${entries.length ? `<div class="entry-list">${entries.map(e => `<article class="entry-card">
      <div class="avatar" aria-hidden="true">${esc([...e.name][0])}</div><div class="entry-main"><h3>${esc(e.name)} <span>${esc(e.drinkName)}</span></h3><p>${esc(choices(e))}</p>${e.note ? `<p class="entry-note">備註：${esc(e.note)}</p>` : ""}</div>
      <div class="entry-price"><strong>${money(e.total)}</strong><span>${e.quantity} 杯 · 每杯 $${e.unitPrice}</span>${e.actualUnitPrice !== null && e.actualUnitPrice !== undefined ? `<span>主揪實付校正：${esc(e.priceNote)}</span>` : ""}</div>
      ${canEdit(e) ? `<div class="entry-actions"><button data-edit="${e.id}" class="text-button">修改</button><button data-delete="${e.id}" class="text-button danger">移除</button></div>` : ""}
    </article>`).join("")}</div>` : `<div class="empty-state roomy"><span aria-hidden="true">♧</span><h3>第一杯，就差你了。</h3><p>分享連結給同事，或先幫自己選一杯。</p><button class="button primary" id="go-menu">去選茶</button></div>`}`;
  document.querySelector("#manual-refresh").addEventListener("click", () => refresh());
  document.querySelector("#go-menu")?.addEventListener("click", () => document.querySelector('[data-tab="menu"]').click());
  document.querySelectorAll("[data-edit]").forEach(button => button.addEventListener("click", () => {
    const entry = state.group.entries.find(e => e.id === button.dataset.edit);
    if (entry) openDrink(entry.drinkId, entry);
  }));
  document.querySelectorAll("[data-delete]").forEach(button => button.addEventListener("click", () => removeEntry(button.dataset.delete)));
}
function purchasingGroups() {
  const groups = new Map();
  for (const entry of state.group.entries) {
    const key = JSON.stringify([entry.drinkId, entry.size, entry.temperature, entry.sugar, entry.ice, [...entry.addons].sort(), entry.oatMilk, entry.note, entry.unitPrice]);
    const grouped = groups.get(key) ?? { ...entry, quantity: 0, total: 0, names: [] };
    grouped.quantity += entry.quantity; grouped.total += entry.total;
    grouped.names.push(`${entry.name}${entry.quantity > 1 ? ` ×${entry.quantity}` : ""}`);
    groups.set(key, grouped);
  }
  return [...groups.values()];
}
function renderPurchase() {
  const entries = state.group.entries;
  const grouped = purchasingGroups();
  document.querySelector("#tab-content").innerHTML = `
    <div class="section-heading list-heading"><div><h2>帶著這張單，去買茶。</h2><p class="muted">相同飲料、甜度、冰量與加料會合併；有不同備註則分開列。</p></div><div class="purchase-actions"><button class="button secondary small" id="copy-purchase" ${!entries.length ? "disabled" : ""}>複製清單</button><button class="button secondary small" id="download-csv" ${!entries.length ? "disabled" : ""}>下載 CSV</button><button class="text-button" id="print-order">列印</button></div></div>
    ${state.group.open ? `<div class="notice soft">目前仍在收單，清單可能變動。出發前可由主揪截止收單。</div>` : ""}
    ${grouped.length ? `<div class="purchase-list">${grouped.map((e, i) => `<article class="purchase-item"><span class="purchase-number">${String(i + 1).padStart(2, "0")}</span><div><h3>${esc(e.drinkName)} <span>× ${e.quantity}</span></h3><p>${esc(choices(e))}</p>${e.note ? `<p class="entry-note">備註：${esc(e.note)}</p>` : ""}<p class="purchase-names">${esc(e.names.join("、"))}</p></div><strong>${money(e.total)}</strong></article>`).join("")}</div><div class="purchase-total"><span>共 ${entries.reduce((s, e) => s + e.quantity, 0)} 杯</span><strong>${money(entries.reduce((s, e) => s + e.total, 0))}</strong></div>` :
      `<div class="empty-state roomy"><h3>還沒有飲料，先揪大家來點吧。</h3></div>`}
    <p class="fine-print">此工具整理購買需求，不會傳送訂單給門市，也不會線上付款。</p>`;
  document.querySelector("#copy-purchase").addEventListener("click", () => copy(purchaseText(), "現場購買清單已複製"));
  document.querySelector("#download-csv").addEventListener("click", downloadCsv);
  document.querySelector("#print-order").addEventListener("click", () => window.print());
}
function purchaseText() {
  const g = state.group;
  return [
    `${g.date}｜${g.title}`, `青山青茶・${menu.branch}｜主揪 ${g.hostName}`,
    ...purchasingGroups().map((e, i) => `${i + 1}. ${e.drinkName} ×${e.quantity}\n   ${choices(e)}${e.note ? `｜備註：${e.note}` : ""}\n   ${e.names.join("、")}｜${money(e.total)}`),
    `共 ${g.entries.reduce((s, e) => s + e.quantity, 0)} 杯｜預估 ${money(g.entries.reduce((s, e) => s + e.total, 0))}`,
    "實際供應與金額依門市現場為準。"
  ].join("\n");
}
function downloadCsv() {
  const cell = value => {
    const raw = String(value ?? "");
    // 防止名字／備註被試算表當作公式執行。
    const safe = /^[=+\-@\t\r]/.test(raw) ? `'${raw}` : raw;
    return `"${safe.replaceAll('"', '""')}"`;
  };
  const rows = [["日期", "團名", "名字", "飲料", "杯型", "冷熱", "甜度", "冰量", "加料／奶類", "杯數", "單價", "金額", "備註", "菜單每杯估價", "價格校正說明"],
    ...state.group.entries.map(e => [state.group.date, state.group.title, e.name, e.drinkName, e.size, e.temperature, sugarLabel(e.sugar), e.ice, addonNames(e).join("、"), e.quantity, e.unitPrice, e.total, e.note, e.estimatedUnitPrice ?? e.unitPrice, e.priceNote ?? ""])];
  const blob = new Blob(["\ufeff" + rows.map(row => row.map(cell).join(",")).join("\r\n")], { type: "text/csv;charset=utf-8" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob); link.download = `青山飲料團_${state.group.date}.csv`;
  link.click(); setTimeout(() => URL.revokeObjectURL(link.href), 1000);
}
async function copy(value, success) {
  try { await navigator.clipboard.writeText(value); toast(success); }
  catch {
    const area = document.createElement("textarea"); area.value = value; area.className = "copy-helper"; document.body.append(area); area.select();
    const worked = document.execCommand("copy"); area.remove();
    if (worked) toast(success);
    else {
      dialog.innerHTML = `<div class="dialog-header"><h2 id="drink-dialog-title">請複製以下內容</h2><button class="icon-button" id="close-copy" aria-label="關閉">×</button></div><textarea class="copy-text" rows="8" readonly>${esc(value)}</textarea>`;
      dialog.showModal(); dialog.querySelector("textarea").select(); document.querySelector("#close-copy").onclick = () => dialog.close();
    }
  }
}
async function toggleStatus() {
  const g = state.group;
  if (g.open && !confirm("截止後，同事將無法新增或修改飲料。確定要截止收單？")) return;
  const button = document.querySelector("#toggle-status"); button.disabled = true;
  try {
    const result = await api(`/api/groups/${g.id}`, { method: "PATCH", body: JSON.stringify({ status: g.open ? "closed" : "open", clearDeadline: !g.open }) });
    state.group = result; renderStatus(); renderTab(); toast(g.open ? "已截止收單，購買清單準備好了" : "已重新開放收單");
  } catch (e) { toast(e.message); }
  finally { button.disabled = false; }
}
async function removeEntry(id) {
  const entry = state.group.entries.find(e => e.id === id);
  if (!entry || !confirm(`要移除 ${entry.name} 的「${entry.drinkName}」${entry.quantity} 杯嗎？`)) return;
  try {
    await api(`/api/groups/${state.group.id}/entries/${entry.id}`, { method: "DELETE", body: JSON.stringify({ version: entry.version }) });
    await refresh(); toast("已移除這筆飲料");
  } catch (e) { toast(e.message); await refresh(); }
}
function openDrink(id, entry = null) {
  const drink = menu.drinks.find(d => d.id === id);
  if (!drink) return;
  state.originalEntry = entry;
  state.draft = entry ? { ...entry, addons: [...entry.addons], editing: true } : {
    id: crypto.randomUUID(), drinkId: id, name: stored.name ?? "", size: Object.hasOwn(drink.prices, "L") ? "L" : "M",
    temperature: "冰", sugar: Math.max(30, drink.minSugar ?? 0), ice: drink.cap ? "少冰" : "少冰",
    addons: [], oatMilk: false, quantity: 1, note: "", editing: false
  };
  const d = state.draft;
  dialog.innerHTML = `<form id="drink-form">
    <div class="dialog-header"><div><span class="eyebrow">${esc(menu.categories.find(c => c.id === drink.category).name)}</span><h2 id="drink-dialog-title">${esc(drink.name)}</h2></div><button type="button" class="icon-button" id="close-dialog" aria-label="關閉點餐視窗">×</button></div>
    ${drink.included ? `<p class="included-note">這杯已含${esc(drink.included.join("、"))}，下方為額外加一份。</p>` : ""}
    <label class="name-field">你的名字<input name="name" id="entry-name" maxlength="30" required placeholder="讓主揪知道這杯是誰的" value="${esc(d.name)}" autocomplete="name"></label>
    <fieldset><legend>杯型</legend><div class="option-grid two">${Object.entries(drink.prices).map(([size, price]) => `<label class="option"><input type="radio" name="size" value="${size}" ${d.size === size ? "checked" : ""}><span>${size === "M" ? "中杯 M" : "大杯 L"}<small>$${price}</small></span></label>`).join("")}</div></fieldset>
    <fieldset><legend>冷熱</legend><div class="option-grid three">${menu.temperatures.map(temp => `<label class="option"><input type="radio" name="temperature" value="${temp}" ${d.temperature === temp ? "checked" : ""}><span>${temp === "冰" ? "冰飲" : temp}</span></label>`).join("")}</div></fieldset>
    <fieldset><legend>甜度 <small id="sugar-rule"></small></legend><div class="option-grid three">${menu.sugars.map(s => `<label class="option"><input type="radio" name="sugar" value="${s.value}" ${d.sugar === s.value ? "checked" : ""}><span>${s.label}<small>${s.percent}</small></span></label>`).join("")}</div></fieldset>
    <fieldset id="ice-field"><legend>冰塊 <small id="ice-rule"></small></legend><div class="option-grid four">${menu.ice.map(ice => `<label class="option"><input type="radio" name="ice" value="${ice}" ${d.ice === ice ? "checked" : ""}><span>${ice}</span></label>`).join("")}</div></fieldset>
    <fieldset><legend>額外加料 <small>可複選</small></legend><div class="addon-grid">${menu.addons.map(a => `<label class="addon-option"><input type="checkbox" name="addons" value="${a.id}" ${d.addons.includes(a.id) ? "checked" : ""}><span>${esc(a.name)}</span><small>+$${a.price}</small></label>`).join("")}</div></fieldset>
    ${drink.oatMilk ? `<label class="oat-option"><input type="checkbox" name="oatMilk" ${d.oatMilk ? "checked" : ""}><span>升級燕麥奶</span><small id="oat-price"></small></label>` : ""}
    <div class="field-row"><label>杯數<input name="quantity" type="number" min="1" max="20" step="1" value="${d.quantity}" required></label><label>備註 <span class="optional">選填</span><input name="note" maxlength="200" value="${esc(d.note)}" placeholder="特殊需求，主揪現場確認"></label></div>
    ${state.group.isHost ? `<div class="field-row"><label>門市實際每杯單價 <span class="optional">選填</span><input name="actualUnitPrice" type="number" min="0" max="1000" step="1" value="${d.actualUnitPrice ?? ""}" placeholder="留空依 ATT 菜單計算"></label><label>價格校正說明<input name="priceNote" maxlength="100" value="${esc(d.priceNote ?? "")}" placeholder="例如：門市原價、活動折扣"></label></div>` : ""}
    <p class="form-error" id="drink-error" role="alert" hidden></p>
    <p id="price-breakdown" class="fine-print"></p>
    <div class="dialog-footer"><div><span>每杯 <b id="unit-price"></b></span><strong id="draft-total"></strong></div><button class="button primary" id="submit-drink" type="submit">${d.editing ? "儲存修改" : "加入訂單"} <span aria-hidden="true">＋</span></button></div>
    <p class="fine-print">填單免登入；請在同一瀏覽器修改自己的飲料。</p>
  </form>`;
  document.querySelector("#close-dialog").addEventListener("click", () => {
    if (!state.busy) dialog.close();
  });
  document.querySelector("#drink-form").addEventListener("change", syncDraft);
  document.querySelector("#drink-form").addEventListener("input", event => {
    if (["quantity", "actualUnitPrice"].includes(event.target.name)) syncDraft();
  });
  document.querySelector("#drink-form").addEventListener("submit", submitDrink);
  syncDraft();
  dialog.showModal();
  document.querySelector("#entry-name").focus({ preventScroll: true });
}
function syncDraft() {
  const form = document.querySelector("#drink-form");
  if (!form || !state.draft) return;
  const d = state.draft;
  const values = new FormData(form);
  const drink = menu.drinks.find(item => item.id === d.drinkId);
  d.size = values.get("size");
  d.addons = values.getAll("addons");
  d.oatMilk = values.get("oatMilk") === "on";
  const cap = drink.cap || d.addons.some(id => menu.addons.find(a => a.id === id).cap);
  d.temperature = cap ? "冰" : values.get("temperature");
  form.querySelectorAll('[name="temperature"]').forEach(input => {
    input.disabled = cap && input.value !== "冰";
    input.checked = input.value === d.temperature;
  });
  d.sugar = Math.max(Number(values.get("sugar")), drink.minSugar ?? 0);
  form.querySelectorAll('[name="sugar"]').forEach(input => {
    input.disabled = Number(input.value) < (drink.minSugar ?? 0);
    input.checked = Number(input.value) === d.sugar;
  });
  document.querySelector("#sugar-rule").textContent = drink.minSugar === 50 ? "冬露至少半糖" : drink.minSugar ? "不提供無糖" : "";
  d.ice = d.temperature === "冰" ? (cap ? "少冰" : values.get("ice") ?? "少冰") : "不適用";
  document.querySelector("#ice-field").hidden = d.temperature !== "冰";
  form.querySelectorAll('[name="ice"]').forEach(input => {
    input.disabled = d.temperature !== "冰" || (cap && input.value !== "少冰");
    input.checked = input.value === d.ice;
  });
  document.querySelector("#ice-rule").textContent = cap ? "奶蓋僅供少冰" : "";
  d.quantity = Number(values.get("quantity"));
  const quantityValid = Number.isInteger(d.quantity) && d.quantity >= 1 && d.quantity <= 20;
  const oatPrice = d.oatMilk ? (d.size === "M" ? 10 : 15) : 0;
  d.estimatedUnitPrice = drink.prices[d.size] + d.addons.reduce((s, id) => s + menu.addons.find(a => a.id === id).price, 0) + oatPrice;
  if (state.group.isHost) d.actualUnitPrice = values.get("actualUnitPrice") === "" ? null : Number(values.get("actualUnitPrice"));
  else if (state.originalEntry) {
    const original = state.originalEntry;
    const sameRecipe = ["drinkId", "size", "temperature", "sugar", "ice", "oatMilk"].every(key => original[key] === d[key]) &&
      JSON.stringify([...original.addons].sort()) === JSON.stringify([...d.addons].sort());
    d.actualUnitPrice = sameRecipe ? original.actualUnitPrice ?? null : null;
  }
  d.unitPrice = d.actualUnitPrice ?? d.estimatedUnitPrice;
  d.total = quantityValid ? d.unitPrice * d.quantity : 0;
  document.querySelector("#unit-price").textContent = `$${d.unitPrice}`;
  document.querySelector("#draft-total").textContent = quantityValid ? money(d.total) : "請輸入 1–20 杯";
  document.querySelector("#price-breakdown").textContent = [
    `茶飲 $${drink.prices[d.size]}`,
    ...d.addons.map(id => { const addon = menu.addons.find(a => a.id === id); return `${addon.name} $${addon.price}`; }),
    ...(oatPrice ? [`燕麥奶升級 $${oatPrice}`] : [])
  ].join(" ＋ ") + (d.actualUnitPrice !== null && d.actualUnitPrice !== undefined ? `；主揪校正每杯 $${d.actualUnitPrice}` : "");
  const oat = document.querySelector("#oat-price");
  if (oat) oat.textContent = `+$${d.size === "M" ? 10 : 15}`;
  const button = document.querySelector("#submit-drink");
  const actualValid = d.actualUnitPrice === null || d.actualUnitPrice === undefined || (Number.isInteger(d.actualUnitPrice) && d.actualUnitPrice >= 0 && d.actualUnitPrice <= 1000);
  button.disabled = state.busy || !quantityValid || !actualValid || (!state.group.open && !state.group.isHost);
}
async function submitDrink(event) {
  event.preventDefault();
  if (state.busy) return;
  syncDraft();
  const form = event.currentTarget;
  const values = new FormData(form);
  const d = state.draft;
  d.name = String(values.get("name")).trim(); d.note = String(values.get("note")).trim();
  if (state.group.isHost) d.priceNote = String(values.get("priceNote") ?? "").trim();
  const error = document.querySelector("#drink-error"); error.hidden = true;
  state.busy = true; syncDraft();
  const button = document.querySelector("#submit-drink"); button.textContent = "正在送出…";
  document.querySelector("#close-dialog").disabled = true;
  try {
    const path = `/api/groups/${state.group.id}/entries${d.editing ? `/${d.id}` : ""}`;
    const result = await api(path, { method: d.editing ? "PUT" : "POST", body: JSON.stringify(d) });
    stored.name = d.name;
    stored.mine[state.group.id] = [...new Set([...(stored.mine[state.group.id] ?? []), result.id])];
    save();
    dialog.close(); await refresh(); toast(d.editing ? "飲料已修改" : `${d.name} 的好茶已加入訂單`);
  } catch (e) {
    error.textContent = e.message; error.hidden = false; await refresh();
  } finally {
    state.busy = false;
    button.innerHTML = `${d.editing ? "儲存修改" : "加入訂單"} <span aria-hidden="true">＋</span>`;
    document.querySelector("#close-dialog").disabled = false; syncDraft();
  }
}
dialog.addEventListener("cancel", event => { if (state.busy) event.preventDefault(); });
dialog.addEventListener("click", event => {
  if (event.target === dialog && !state.busy) {
    const rect = dialog.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
  }
});
try {
  Object.assign(menu, await api("/api/menu"));
} catch {
  toast("暫時無法確認最新門市價目，先顯示已核對的 ATT 價格");
}
if (groupId) {
  refresh(true);
  setInterval(() => { if (!document.hidden && !state.busy) refresh(); }, 10000);
  document.addEventListener("visibilitychange", () => { if (!document.hidden && !state.busy) refresh(); });
} else home();
