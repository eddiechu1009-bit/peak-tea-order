import { chromium, expect } from "@playwright/test";
import { existsSync } from "node:fs";
import { mkdir, readFile } from "node:fs/promises";
import assert from "node:assert/strict";

const base = process.env.TEST_URL ?? "http://127.0.0.1:8787";
const apiBase = process.env.TEST_API_URL ?? base;
const chrome = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const browser = await chromium.launch({ headless: true, ...(existsSync(chrome) ? { executablePath: chrome } : {}) });
const groups = [];
const errors = [];
let passed = 0;
const output = new URL("../_private/browser/", import.meta.url);
await mkdir(output, { recursive: true });
function pass(message) { passed++; console.log(`✓ ${message}`); }
async function makePage(mobile = false) {
  const context = await browser.newContext({
    viewport: mobile ? { width: 320, height: 800 } : { width: 1440, height: 1000 },
    isMobile: mobile, locale: "zh-TW", timezoneId: "Asia/Taipei"
  });
  const p = await context.newPage();
  p.on("pageerror", error => errors.push(error.message));
  return p;
}
async function create(p, storeId, title) {
  await p.goto(base);
  await expect(p.locator("#store-select")).toBeVisible();
  await p.locator("#store-select").selectOption(storeId);
  await p.locator('[name="hostName"]').fill("測試主揪");
  await p.locator('[name="title"]').fill(title);
  await p.locator("#create-form").getByRole("button", { name: "建立飲料團" }).click();
  await p.waitForURL(/g=/);
  await expect(p.locator(".host-bar")).toBeVisible();
  const id = new URL(p.url()).searchParams.get("g");
  const hostKey = await p.evaluate(id => JSON.parse(localStorage.getItem("peak-tea:v1")).groups[id].hostKey, id);
  const g = { id, hostKey };
  groups.push(g);
  return g;
}
async function send(p, name) {
  await p.locator("#entry-name").fill(name);
  await p.locator("#submit-drink").click();
  await expect(p.locator("#drink-dialog")).not.toBeVisible();
}
try {
  const host = await makePage();
  const guiji = await create(host, "guiji-a11", "龜記瀏覽器測試（將刪除）");
  await expect(host.locator(".group-hero")).toContainText("龜記茗品 · 信義A11店");
  await expect(host.locator(".drink-card")).toHaveCount(29);
  await expect(host.locator('[data-drink="spring-qing"]')).toHaveCount(0);
  assert.ok((await host.locator(".menu-source").getAttribute("href")).includes("productMenu_d001"));
  pass("選龜記開團後顯示 A11 專用菜單，29 款飲料");
  const guest = await makePage(true);
  await guest.goto(`${base}${base.endsWith("/") ? "" : "/"}?g=${guiji.id}`);
  await expect(guest.locator('[data-drink="guiji-grapefruit-green"]')).toBeVisible();
  await expect(guest.locator(".host-bar")).toHaveCount(0);
  await guest.locator('[data-drink="guiji-grapefruit-green"]').click();
  await expect(guest.locator('[name="temperature"][value="溫熱"]')).toBeDisabled();
  await expect(guest.locator('[name="sugar"][value="80"]')).toHaveCount(1);
  await expect(guest.locator('[name="sugar"][value="70"]')).toHaveCount(0);
  await expect(guest.locator("#drink-dialog")).toContainText("標準杯");
  await expect(guest.locator("#drink-dialog")).not.toContainText("中杯 M");
  await guest.locator('[name="addons"][value="guiji-pearl"]').check();
  await guest.locator('[name="quantity"]').fill("2");
  await expect(guest.locator("#draft-total")).toHaveText("NT$ 194");
  await expect(guest.locator("#price-breakdown")).toContainText("茶飲 $85 ＋ 珍珠 $12");
  assert.ok(await guest.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
  pass("320px 手機填單，紅柚翡翠加珍珠兩杯 194 元，冷熱甜度正確");
  await guest.screenshot({ path: new URL("guiji-mobile-drink.png", output).pathname.replace(/^\/C:/, "C:"), fullPage: true });
  await send(guest, "測試同事");
  await guest.locator('[data-drink="guiji-honey-green"]').click();
  await expect(guest.locator('[name="sugar"]')).toHaveCount(1);
  await expect(guest.locator('[name="sugar"][value="-1"]')).toBeChecked();
  await expect(guest.locator("#draft-total")).toHaveText("NT$ 60");
  await send(guest, "蜂蜜測試");
  pass("蜂蜜綠茶固定甜度可送出並正確計價");
  await guest.locator('[data-drink="guiji-black"]').click();
  await guest.locator('[name="temperature"][value="溫熱"]').check();
  await expect(guest.locator("#ice-field")).toBeHidden();
  await guest.locator('[name="addons"][value="guiji-hongxuan-jelly"]').check();
  await expect(guest.locator('[name="temperature"][value="冰"]')).toBeChecked();
  await expect(guest.locator('[name="temperature"][value="溫熱"]')).toBeDisabled();
  await expect(guest.locator('[name="ice"][value="去冰"]')).toBeEnabled();
  await expect(guest.locator("#draft-total")).toHaveText("NT$ 65");
  await guest.locator("#close-dialog").click();
  pass("茶凍加料切回冷飲，仍可自選冰量");
  await host.locator("#tab-list").click();
  await host.locator("#manual-refresh").click();
  await expect(host.locator(".entry-card")).toHaveCount(2);
  await expect(host.locator(".total-stat strong")).toHaveText("NT$ 254");
  await expect(host.locator(".entry-card").first()).toContainText("標準杯");
  await host.locator("#tab-purchase").click();
  await expect(host.locator(".purchase-total")).toContainText("NT$ 254");
  const dl = host.waitForEvent("download");
  await host.locator("#download-csv").click();
  const csv = await readFile(await (await dl).path(), "utf8");
  assert.ok(csv.includes("紅柚翡翠") && csv.includes("固定甜度"));
  pass("主揪跨裝置彙整、購買清單與 CSV 正確");
  await host.screenshot({ path: new URL("guiji-purchase.png", output).pathname.replace(/^\/C:/, "C:"), fullPage: true });
  const peak = await create(host, "peak-att", "同日期青山測試（將刪除）");
  await expect(host.locator('[data-drink="spring-qing"]')).toBeVisible();
  await expect(host.locator('[data-drink="guiji-black"]')).toHaveCount(0);
  await expect(host.locator(".total-stat strong")).toHaveText("NT$ 0");
  await host.goto(`${base}${base.endsWith("/") ? "" : "/"}?g=${guiji.id}`);
  await expect(host.locator(".group-hero")).toContainText("龜記茗品 · 信義A11店");
  await expect(host.locator(".total-stat strong")).toHaveText("NT$ 254");
  pass("同日期不同店各自獨立；切換新店後回原團仍顯示正確品項與金額");
  await host.goto(base);
  await expect(host.locator(".recent-card")).toHaveCount(2);
  await expect(host.locator(".recent-section")).toContainText("龜記茗品");
  await expect(host.locator(".recent-section")).toContainText("青山青茶");
  pass("首頁可回到兩家店的已開訂單");
  assert.deepEqual(errors, []);
  pass("多門市流程無 JavaScript 錯誤");
  console.log(`\n${passed} 個多門市瀏覽器檢查通過`);
} finally {
  await browser.close();
  for (const group of groups) {
    const response = await fetch(`${apiBase}/api/groups/${group.id}`, { method: "DELETE", headers: { "X-Host-Key": group.hostKey } });
    assert.equal(response.status, 200, "清除多門市測試團");
  }
  console.log("多門市測試團已清除");
}
