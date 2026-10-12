import { menu } from "../public/menu.js";
import { menus, DEFAULT_STORE_ID } from "../public/stores.js";

export class AppError extends Error {
  constructor(message, status = 400) { super(message); this.status = status; }
}

export function text(value, max, label, required = false) {
  if (typeof value !== "string") throw new AppError(`請填寫${label}`);
  const clean = value.trim();
  if ((required && !clean) || clean.length > max || /[\u0000-\u001f\u007f]/u.test(clean)) {
    throw new AppError(`${label}需為 ${required ? "1" : "0"}–${max} 個字，且不可含控制字元`);
  }
  return clean;
}

export function validId(id) {
  if (typeof id !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
    throw new AppError("找不到這個訂單連結", 404);
  }
  return id;
}

export function groupInput(input) {
  const storeId = input.storeId ?? DEFAULT_STORE_ID;
  if (typeof storeId !== "string" || !Object.hasOwn(menus, storeId)) throw new AppError("請選擇支援的飲料門市");
  const title = text(input.title, 60, "團名", true);
  const hostName = text(input.hostName, 30, "主揪名字", true);
  const date = text(input.date, 10, "日期", true);
  const parsed = new Date(`${date}T00:00:00Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(parsed.valueOf()) ||
      parsed.toISOString().slice(0, 10) !== date || date < "2020-01-01" || date > "2100-12-31") {
    throw new AppError("請選擇有效的訂單日期");
  }
  let deadline = null;
  if (input.deadline) {
    const d = new Date(input.deadline);
    if (!Number.isFinite(d.valueOf()) || d.valueOf() <= Date.now()) throw new AppError("截止時間需晚於現在");
    deadline = d.toISOString();
  }
  return { title, hostName, date, deadline, storeId, note: text(input.note ?? "", 300, "團購備註") };
}

export function quoteEntry(input, selectedMenu = menu) {
  const menu = selectedMenu;
  const name = text(input.name, 30, "名字", true);
  const drink = menu.drinks.find(d => d.id === input.drinkId);
  if (!drink) throw new AppError("請選擇菜單內的飲料");
  if (!Object.hasOwn(drink.prices, input.size)) throw new AppError("這款飲料沒有這個杯型");
  if (!menu.temperatures.includes(input.temperature)) throw new AppError("請選擇冷熱");
  if (!menu.sugars.some(s => s.value === input.sugar)) throw new AppError("請選擇甜度");
  if (drink.fixedSugar !== undefined) {
    if (input.sugar !== drink.fixedSugar) throw new AppError(`${drink.name}甜度固定，依門市配方`);
  } else if (input.sugar < (drink.minSugar ?? 0)) {
    throw new AppError(`${drink.name}最低${drink.minSugar === 50 ? "半糖" : "1 分糖"}`);
  }
  if (!(drink.temperatures ?? menu.temperatures).includes(input.temperature)) throw new AppError(`${drink.name}不提供這個冷熱選項`);
  if (!Array.isArray(input.addons) || input.addons.length > menu.addons.length ||
      new Set(input.addons).size !== input.addons.length) throw new AppError("加料選項不正確");
  const addons = input.addons.map(id => {
    const addon = menu.addons.find(a => a.id === id);
    if (!addon) throw new AppError("加料選項不正確");
    return addon;
  });
  const hasCap = drink.cap || addons.some(a => a.cap);
  if (addons.some(a => a.coldOnly) && input.temperature !== "冰") throw new AppError("紅萱茶凍僅供冷飲");
  if (hasCap && (input.temperature !== "冰" || input.ice !== "少冰")) throw new AppError("奶蓋飲品僅供冰飲、少冰");
  if (input.temperature === "冰" && !menu.ice.includes(input.ice)) throw new AppError("請選擇冰塊");
  if (input.temperature !== "冰" && input.ice !== "不適用") throw new AppError("常溫或溫熱飲品不需冰塊");
  if (typeof input.oatMilk !== "boolean") throw new AppError("請確認奶類選項");
  if (input.oatMilk && !drink.oatMilk) throw new AppError("僅那堤系列可升級燕麥奶");
  if (!Number.isInteger(input.quantity) || input.quantity < 1 || input.quantity > 20) throw new AppError("每筆杯數需為 1–20 杯");
  const unitPrice = drink.prices[input.size] + addons.reduce((sum, a) => sum + a.price, 0) +
    (input.oatMilk ? (input.size === "M" ? 10 : 15) : 0);
  return {
    name, drinkId: drink.id, drinkName: drink.name, size: input.size,
    temperature: input.temperature, sugar: input.sugar, ice: input.ice,
    addons: addons.map(a => a.id), oatMilk: input.oatMilk,
    quantity: input.quantity, note: text(input.note ?? "", 200, "飲料備註"),
    unitPrice, total: unitPrice * input.quantity
  };
}

export function isOpen(group, now = Date.now()) {
  return group.status === "open" && (!group.deadline || new Date(group.deadline).valueOf() > now);
}

export function withActualPrice(quote, input, previous, isHost, selectedMenu = menu) {
  const sameRecipe = previous && ["drinkId", "size", "temperature", "sugar", "ice", "oatMilk"]
    .every(key => previous[key] === quote[key]) &&
    JSON.stringify([...previous.addons].sort()) === JSON.stringify([...quote.addons].sort());
  let actualUnitPrice = sameRecipe ? previous.actualUnitPrice ?? null : null;
  let priceNote = actualUnitPrice === null ? "" : previous.priceNote ?? "";
  if (isHost && Object.hasOwn(input, "actualUnitPrice")) {
    actualUnitPrice = input.actualUnitPrice;
    if (actualUnitPrice !== null && (!Number.isInteger(actualUnitPrice) || actualUnitPrice < 0 || actualUnitPrice > 1000)) {
      throw new AppError("門市實際單價需為 0–1,000 元的整數");
    }
    priceNote = actualUnitPrice === null ? "" : text(input.priceNote ?? "", 100, "價格校正說明", true);
  }
  const unitPrice = actualUnitPrice ?? quote.unitPrice;
  return { ...quote, estimatedUnitPrice: quote.unitPrice, actualUnitPrice, priceNote, unitPrice, total: unitPrice * quote.quantity, menuVersion: selectedMenu.version };
}
