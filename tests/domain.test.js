import test from "node:test";
import assert from "node:assert/strict";
import { quoteEntry, groupInput, isOpen } from "../src/domain.js";
import { menu } from "../public/menu.js";

const base = {
  name: "測試同事", drinkId: "spring-qing", size: "L", temperature: "冰",
  sugar: 30, ice: "少冰", addons: [], oatMilk: false, quantity: 1, note: ""
};
test("官方所有杯型價格都可計算，忽略用戶傳入金額", () => {
  for (const drink of menu.drinks) {
    for (const [size, price] of Object.entries(drink.prices)) {
      const result = quoteEntry({ ...base, drinkId: drink.id, size, sugar: Math.max(30, drink.minSugar ?? 0), unitPrice: 1, total: 1 });
      assert.equal(result.unitPrice, price, `${drink.name} ${size}`);
      assert.equal(result.total, price);
    }
  }
});
test("加料、燕麥奶依杯型、杯數計費", () => {
  assert.equal(quoteEntry({ ...base, addons: ["amber", "buckwheat-pearl"], quantity: 3 }).total, (35 + 10 + 15) * 3);
  assert.equal(quoteEntry({ ...base, drinkId: "summer-latte", size: "M", oatMilk: true }).unitPrice, 60);
  assert.equal(quoteEntry({ ...base, drinkId: "summer-latte", size: "L", oatMilk: true }).unitPrice, 75);
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
