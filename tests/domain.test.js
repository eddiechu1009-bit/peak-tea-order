import test from "node:test";
import assert from "node:assert/strict";
import { quoteEntry, groupInput, isOpen, withActualPrice } from "../src/domain.js";
import { menu } from "../public/menu.js";
import { menus } from "../public/stores.js";
import { readFileSync } from "node:fs";
const reference = JSON.parse(readFileSync(new URL("../data/att-price-reference.json", import.meta.url), "utf8"));

const base = {
  name: "測試同事", drinkId: "spring-qing", size: "L", temperature: "冰",
  sugar: 30, ice: "少冰", addons: [], oatMilk: false, quantity: 1, note: ""
};
test("所有價格對照 ATT 門市獨立來源，忽略用戶傳入金額", () => {
  assert.equal(menu.branch, reference.branch);
  assert.equal(menu.drinks.length, reference.drinks.length);
  for (const drink of reference.drinks) {
    assert.deepEqual(menu.drinks.find(d => d.id === drink.id).prices, drink.prices);
    for (const [size, price] of Object.entries(drink.prices)) {
      const local = menu.drinks.find(d => d.id === drink.id);
      const result = quoteEntry({ ...base, drinkId: drink.id, size, sugar: Math.max(30, local.minSugar ?? 0), unitPrice: 1, total: 1 });
      assert.equal(result.unitPrice, price, `${drink.name} ${size}`);
      assert.equal(result.total, price);
    }
  }
  for (const addon of reference.addons) assert.equal(menu.addons.find(a => a.id === addon.id).price, addon.price);
});
test("大杯桂花玄米加海鹽奶蓋為 ATT 原價 70", () => {
  const result = quoteEntry({ ...base, drinkId: "osmanthus-genmai", sugar: 0, addons: ["salt-cap"] });
  assert.equal(result.unitPrice, 70);
  assert.equal(result.total, 70);
});
test("加料、燕麥奶依杯型、杯數計費", () => {
  assert.equal(quoteEntry({ ...base, addons: ["amber", "buckwheat-pearl"], quantity: 3 }).total, (40 + 10 + 15) * 3);
  assert.equal(quoteEntry({ ...base, drinkId: "summer-latte", size: "M", oatMilk: true }).unitPrice, 65);
  assert.equal(quoteEntry({ ...base, drinkId: "summer-latte", size: "L", oatMilk: true }).unitPrice, 80);
});
test("避免不存在的杯型、加料重複、非那堤換奶", () => {
  assert.throws(() => quoteEntry({ ...base, drinkId: "salt-cap-apple", size: "L" }));
  assert.throws(() => quoteEntry({ ...base, addons: ["amber", "amber"] }));
  assert.throws(() => quoteEntry({ ...base, addons: ["unknown"] }));
  assert.throws(() => quoteEntry({ ...base, oatMilk: true }));
});
test("奶蓋與額外加奶蓋強制少冰，禁止溫熱", () => {
  for (const changes of [{ drinkId: "salt-cap-spring" }, { addons: ["salt-cap"] }]) {
    assert.throws(() => quoteEntry({ ...base, ...changes, ice: "去冰" }));
    assert.throws(() => quoteEntry({ ...base, ...changes, temperature: "溫熱", ice: "不適用" }));
    assert.ok(quoteEntry({ ...base, ...changes }));
  }
});
test("果茶至少一分糖，冬露至少半糖", () => {
  assert.throws(() => quoteEntry({ ...base, drinkId: "lychee-spring", sugar: 0 }));
  assert.ok(quoteEntry({ ...base, drinkId: "lychee-spring", sugar: 10 }));
  assert.throws(() => quoteEntry({ ...base, drinkId: "spring-wintermelon", sugar: 30 }));
  assert.ok(quoteEntry({ ...base, drinkId: "spring-wintermelon", sugar: 50 }));
});
test("溫熱不接受冰量，整數杯數與名字必填", () => {
  assert.ok(quoteEntry({ ...base, temperature: "溫熱", ice: "不適用" }));
  for (const changes of [{ temperature: "溫熱" }, { quantity: 1.5 }, { quantity: 0 }, { quantity: 21 }, { name: "  " }, { sugar: 25 }]) {
    assert.throws(() => quoteEntry({ ...base, ...changes }));
  }
});
test("日期、截止與字數驗證", () => {
  const input = { title: "下午茶", hostName: "主揪", date: "2026-10-12" };
  assert.equal(groupInput(input).date, "2026-10-12");
  assert.throws(() => groupInput({ ...input, date: "2026-02-30" }));
  assert.throws(() => groupInput({ ...input, title: "a".repeat(61) }));
  assert.throws(() => groupInput({ ...input, deadline: "2020-01-01T00:00:00Z" }));
});
test("時間到即截止，不能僅依前端判斷", () => {
  assert.equal(isOpen({ status: "open", deadline: null }), true);
  assert.equal(isOpen({ status: "closed", deadline: null }), false);
  assert.equal(isOpen({ status: "open", deadline: "2026-10-12T04:00:00Z" }, Date.parse("2026-10-12T04:00:00Z")), false);
});
test("主揪校正實際單價，其他人無法設定或覆蓋", () => {
  const actual = withActualPrice(quoteEntry({ ...base, quantity: 2 }), { actualUnitPrice: 45, priceNote: "門市活動" }, null, true);
  assert.equal(actual.estimatedUnitPrice, 40);
  assert.equal(actual.total, 90);
  assert.throws(() => withActualPrice(quoteEntry(base), { actualUnitPrice: 45, priceNote: "" }, null, true));
  assert.equal(withActualPrice(quoteEntry(base), { actualUnitPrice: 1 }, null, false).unitPrice, 40);
  assert.equal(withActualPrice(quoteEntry(base), { actualUnitPrice: 1 }, actual, false).unitPrice, 45);
  assert.equal(withActualPrice(quoteEntry({ ...base, size: "M" }), { actualUnitPrice: 1 }, actual, false).unitPrice, 35);
});
const guiji = menus["guiji-a11"];
const guijiBase = { ...base, drinkId: "guiji-black" };
test("龜記 A11 全品项與官網專用菜單轉錄相符", () => {
  const ref = JSON.parse(readFileSync(new URL("../data/guiji-a11-price-reference.json", import.meta.url), "utf8"));
  assert.equal(guiji.drinks.length, ref.drinks.length);
  for (const d of ref.drinks) {
    const result = quoteEntry({ ...guijiBase, drinkId: d.id, sugar: d.fixedSugar ? -1 : Math.max(30, d.minSugar ?? 0) }, guiji);
    assert.equal(result.drinkName, d.name);
    assert.equal(result.unitPrice, d.price, d.name);
  }
  for (const a of ref.addons) assert.equal(guiji.addons.find(item => item.id === a.id).price, a.price);
});
test("開團可選龜記，舊開團請求預設青山；拒絕未知門市", () => {
  const input = { title: "下午茶", hostName: "主揪", date: "2026-10-12" };
  assert.equal(groupInput(input).storeId, "peak-att");
  assert.equal(groupInput({ ...input, storeId: "guiji-a11" }).storeId, "guiji-a11");
  for (const storeId of ["missing", "__proto__", ["peak-att"]]) assert.throws(() => groupInput({ ...input, storeId }));
});
test("龜記 A11 使用專用價目與加料費，不接受青山品項", () => {
  assert.equal(guiji.drinks.length, 29);
  assert.equal(quoteEntry(guijiBase, guiji).unitPrice, 45);
  assert.equal(quoteEntry({ ...guijiBase, drinkId: "guiji-grapefruit-green" }, guiji).unitPrice, 85);
  assert.equal(quoteEntry({ ...guijiBase, drinkId: "guiji-pearl-milk", addons: ["guiji-pearl"], quantity: 2 }, guiji).total, 164);
  assert.equal(quoteEntry({ ...guijiBase, addons: ["guiji-aloe", "guiji-hongxuan-jelly"] }, guiji).unitPrice, 85);
  assert.throws(() => quoteEntry(base, guiji));
  assert.throws(() => quoteEntry(guijiBase));
  assert.throws(() => quoteEntry({ ...guijiBase, addons: ["amber"] }, guiji));
});
test("龜記 A11 冷飲限制與紅萱茶凍在後端驗證", () => {
  assert.ok(quoteEntry({ ...guijiBase, temperature: "溫熱", ice: "不適用" }, guiji));
  assert.throws(() => quoteEntry({ ...guijiBase, drinkId: "guiji-grapefruit-green", temperature: "溫熱", ice: "不適用" }, guiji));
  assert.throws(() => quoteEntry({ ...guijiBase, addons: ["guiji-hongxuan-jelly"], temperature: "溫熱", ice: "不適用" }, guiji));
  assert.ok(quoteEntry({ ...guijiBase, addons: ["guiji-pearl"], temperature: "溫熱", ice: "不適用" }, guiji));
});
test("龜記使用八分糖，蜂蜜品項甜度固定，部分果茶最低一分", () => {
  assert.ok(quoteEntry({ ...guijiBase, sugar: 80 }, guiji));
  assert.throws(() => quoteEntry({ ...guijiBase, sugar: 70 }, guiji));
  assert.ok(quoteEntry({ ...guijiBase, drinkId: "guiji-honey-green", sugar: -1 }, guiji));
  assert.throws(() => quoteEntry({ ...guijiBase, drinkId: "guiji-honey-green", sugar: 0 }, guiji));
  assert.throws(() => quoteEntry({ ...guijiBase, sugar: -1 }, guiji));
  assert.throws(() => quoteEntry({ ...guijiBase, drinkId: "guiji-orange-green", sugar: 0 }, guiji));
  assert.ok(quoteEntry({ ...guijiBase, drinkId: "guiji-orange-green", sugar: 10 }, guiji));
});
test("各店價格校正保留相對應菜單版本", () => {
  const actual = withActualPrice(quoteEntry(guijiBase, guiji), { actualUnitPrice: 40, priceNote: "門市優惠" }, null, true, guiji);
  assert.equal(actual.menuVersion, guiji.version);
  assert.equal(actual.estimatedUnitPrice, 45);
  assert.equal(actual.total, 40);
});
