import { chromium, expect } from "@playwright/test";
import { existsSync } from "node:fs";
import { mkdir, readFile } from "node:fs/promises";
import assert from "node:assert/strict";
const base = process.env.TEST_URL ?? "http://127.0.0.1:8787";
const apiBase = process.env.TEST_API_URL ?? base;
const chrome = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const browser = await chromium.launch({ headless: true, ...(existsSync(chrome) ? { executablePath: chrome } : {}) });
const contexts = [];
const errors = [];
let group;
let passed = 0;
const output = new URL("../_private/browser/", import.meta.url);
await mkdir(output, { recursive: true });
async function page(options) {
  const context = await browser.newContext(options);
  contexts.push(context);
  const p = await context.newPage();
  p.on("pageerror", e => errors.push(e.message));
  return p;
}
function pass(message) { passed++; console.log(`✓ ${message}`); }
async function add(p, drinkId, name, change = async () => {}) {
  await p.locator(`[data-drink="${drinkId}"]`).click();
  await p.locator("#entry-name").fill(name);
  await change();
  await p.locator("#submit-drink").click();
  await expect(p.locator("#drink-dialog")).not.toBeVisible();
}
async function noOverflow(p, label) {
  assert.ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), label);
  pass(label);
}
try {
  const host = await page({ viewport: { width: 1440, height: 1000 }, locale: "zh-TW", timezoneId: "Asia/Taipei" });
  await host.goto(base);
  await expect(host.locator("#create-form")).toBeVisible();
  await host.screenshot({ path: new URL("home-desktop.png", output).pathname.replace(/^\/C:/, "C:"), fullPage: true });
  pass("桌機首頁開團表單與視覺");
  await host.locator('[name="hostName"]').fill("測試主揪");
  await host.locator('[name="title"]').fill("瀏覽器測試團（將刪除）");
  await host.locator("#create-form").getByRole("button", { name: "建立飲料團" }).click();
  await host.waitForURL(/g=/);
  await expect(host.locator(".host-bar")).toBeVisible();
  const storage = await host.evaluate(() => JSON.parse(localStorage.getItem("peak-tea:v1")));
  const id = new URL(host.url()).searchParams.get("g");
  group = { id, hostKey: storage.groups[id].hostKey };
  assert.equal(new URL(host.url()).hash, "");
  pass("主揪建立訂單，管理金鑰從網址列移除");
  const guestUrl = `${base}${base.endsWith("/") ? "" : "/"}?g=${group.id}`;
  const guestA = await page({ viewport: { width: 1280, height: 900 }, locale: "zh-TW", timezoneId: "Asia/Taipei" });
  await guestA.goto(guestUrl);
  await expect(guestA.locator('[data-drink="spring-qing"]')).toBeVisible();
  await expect(guestA.locator(".host-bar")).toHaveCount(0);
  await add(guestA, "spring-qing", "同事甲", async () => {
    await guestA.locator('[name="sugar"][value="50"]').check();
    await guestA.locator('[name="ice"][value="微冰"]').check();
    await guestA.locator('[name="addons"][value="amber"]').check();
    await guestA.locator('[name="quantity"]').fill("2");
    await expect(guestA.locator("#draft-total")).toHaveText("NT$ 100");
  });
  pass("免登入同事選飲料、半糖微冰加珍珠，兩杯正確計價");
  const guestB = await page({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, locale: "zh-TW", timezoneId: "Asia/Taipei" });
  await guestB.goto(guestUrl);
  await expect(guestB.locator('[data-drink="salt-cap-spring"]')).toHaveCount(1);
  await add(guestB, "salt-cap-spring", "同事乙", async () => {
    await expect(guestB.locator('[name="temperature"][value="溫熱"]')).toBeDisabled();
    await expect(guestB.locator('[name="ice"][value="去冰"]')).toBeDisabled();
    await expect(guestB.locator('[name="ice"][value="少冰"]')).toBeChecked();
    await expect(guestB.locator("#draft-total")).toHaveText("NT$ 60");
    await noOverflow(guestB, "390px 手機點餐視窗無水平溢位");
    await guestB.screenshot({ path: new URL("mobile-drink.png", output).pathname.replace(/^\/C:/, "C:"), fullPage: true });
  });
  pass("手機同事獨立填單，奶蓋冷熱冰量限制正確");
  const guestC = await page({ viewport: { width: 390, height: 844 }, isMobile: true, locale: "zh-TW", timezoneId: "Asia/Taipei" });
  await guestC.goto(guestUrl);
  await add(guestC, "lychee-spring", "=1+2", async () => {
    await expect(guestC.locator('[name="sugar"][value="0"]')).toBeDisabled();
    await guestC.locator('[name="note"]').fill("<img src=x onerror=alert(1)>");
    await expect(guestC.locator("#draft-total")).toHaveText("NT$ 80");
  });
  pass("果茶無糖被停用，特殊名字與備註可安全顯示");
  await guestA.locator("#tab-list").click();
  await guestA.locator("#manual-refresh").click();
  await expect(guestA.locator(".entry-card")).toHaveCount(3);
  await expect(guestA.locator("[data-edit]")).toHaveCount(1);
  pass("三個裝置共用同一團，同事只看見自己飲料的修改入口");
  await host.locator("#tab-list").click();
  await host.locator("#manual-refresh").click();
  await expect(host.locator(".entry-card")).toHaveCount(3);
  await expect(host.locator("[data-edit]")).toHaveCount(3);
  await expect(host.locator(".total-stat strong")).toHaveText("NT$ 240");
  assert.equal(await host.locator(".entry-note img").count(), 0);
  pass("主揪看見全部三筆／四杯／240 元，HTML 備註不執行");
  await host.locator("#tab-purchase").click();
  await expect(host.locator(".purchase-item")).toHaveCount(3);
  const downloadPromise = host.waitForEvent("download");
  await host.locator("#download-csv").click();
  const download = await downloadPromise;
  const csv = await readFile(await download.path(), "utf8");
  assert.ok(csv.startsWith("\ufeff"));
  assert.ok(csv.includes("\"'=1+2\""));
  pass("CSV 保留中文並防止試算表公式執行");
  await host.screenshot({ path: new URL("purchase-desktop.png", output).pathname.replace(/^\/C:/, "C:"), fullPage: true });
  host.on("dialog", d => d.accept());
  await host.locator("#toggle-status").click();
  await expect(host.locator("#group-status")).toContainText("已截止");
  pass("主揪可截止收單");
  await host.locator("#tab-list").click();
  await host.locator("[data-edit]").first().click();
  await host.locator('[name="quantity"]').fill("1");
  await host.locator("#submit-drink").click();
  await expect(host.locator("#drink-dialog")).not.toBeVisible();
  await expect(host.locator(".total-stat strong")).toHaveText("NT$ 190");
  pass("截止後主揪仍能調整飲料");
  await host.locator("[data-edit]").first().click();
  await host.locator('[name="actualUnitPrice"]').fill("55");
  await host.locator('[name="priceNote"]').fill("門市實際單價");
  await host.locator("#submit-drink").click();
  await expect(host.locator("#drink-dialog")).not.toBeVisible();
  await expect(host.locator(".total-stat strong")).toHaveText("NT$ 195");
  pass("主揪可校正實付單價，總金額同步更新");
  await guestB.locator("#tab-list").click();
  await guestB.locator("#manual-refresh").click();
  await expect(guestB.locator("#group-status")).toContainText("已截止");
  await expect(guestB.locator("[data-edit]")).toHaveCount(0);
  await noOverflow(guestB, "390px 手機明細無水平溢位");
  await guestB.screenshot({ path: new URL("mobile-list.png", output).pathname.replace(/^\/C:/, "C:"), fullPage: true });
  await guestB.locator("#tab-purchase").click();
  await noOverflow(guestB, "390px 手機購買清單無水平溢位");
  await host.locator("#toggle-status").click();
  await expect(host.locator("#group-status")).toContainText("揪團中");
  pass("主揪可重新開放，保留原飲料");
  const small = await page({ viewport: { width: 320, height: 740 }, isMobile: true, locale: "zh-TW" });
  await small.goto(guestUrl);
  await expect(small.locator(".drink-grid")).toBeVisible();
  await noOverflow(small, "320px 小手機選茶頁無水平溢位");
  await small.locator("#tab-list").click();
  await noOverflow(small, "320px 小手機明細無水平溢位");
  await small.locator("#tab-purchase").click();
  await noOverflow(small, "320px 小手機購買清單無水平溢位");
  assert.deepEqual(errors, []);
  pass("所有頁面無 JavaScript 錯誤");
  console.log(`\n${passed} 個瀏覽器檢查通過`);
} finally {
  await browser.close();
  if (group) {
    const response = await fetch(`${apiBase}/api/groups/${group.id}`, { method: "DELETE", headers: { "X-Host-Key": group.hostKey } });
    assert.equal(response.status, 200, "清除瀏覽器測試團");
    console.log("瀏覽器測試團已清除");
  }
}
