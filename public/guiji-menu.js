// 龜記官網「信義 A11 店」專用菜單；只收錄飲料，不含兩款霜淇淋。
// 官網僅列單一杯價，因此顯示「標準杯」，不推測中／大杯容量。
export const menu = {
  storeId: "guiji-a11",
  shop: "龜記茗品",
  branch: "信義A11店",
  sourceUrl: "https://guiji-group.com/upload_file/productMenu/productMenu_d0016803844f9cb845ef40e082a13827.jpg",
  generalMenuUrl: "https://guiji-group.com/drinks",
  version: "guiji-a11-20261012-d0016803844f9cb845ef40e082a13827",
  checkedAt: "2026-10-12",
  sizeLabels: { L: "標準杯" },
  notes: "採用龜記官網信義 A11 店專用飲料價目。糖度 0% 表示不另加糖，原料與加料仍可能含糖；冷熱依各品項提供。",
  categories: [
    { id: "tea", name: "醇萃", subtitle: "經典原茶" },
    { id: "honey", name: "蜜蜂工坊", subtitle: "蜂蜜茶飲" },
    { id: "fruit", name: "果茶", subtitle: "果香與茶香" },
    { id: "hometown", name: "鄉韻", subtitle: "楊桃與梅子風味" },
    { id: "fresh", name: "小農鮮乳坊", subtitle: "鮮乳茶" },
    { id: "milk", name: "奶茶", subtitle: "奶茶與珍珠" }
  ],
  drinks: [
  {
    "id": "guiji-black",
    "name": "極品紅茶",
    "category": "tea",
    "prices": {
      "L": 45
    },
    "temperatures": [
      "冰",
      "溫熱"
    ],
    "tags": [],
    "description": "提供冷飲與熱飲"
  },
  {
    "id": "guiji-green",
    "name": "翡翠綠茶",
    "category": "tea",
    "prices": {
      "L": 45
    },
    "temperatures": [
      "冰",
      "溫熱"
    ],
    "tags": [],
    "description": "提供冷飲與熱飲"
  },
  {
    "id": "guiji-hongxuan",
    "name": "三韻紅萱",
    "category": "tea",
    "prices": {
      "L": 50
    },
    "temperatures": [
      "冰",
      "溫熱"
    ],
    "tags": [],
    "description": "提供冷飲與熱飲"
  },
  {
    "id": "guiji-king",
    "name": "三十三茶王",
    "category": "tea",
    "prices": {
      "L": 50
    },
    "temperatures": [
      "冰",
      "溫熱"
    ],
    "tags": [
      "推薦"
    ],
    "description": "提供冷飲與熱飲"
  },
  {
    "id": "guiji-oolong",
    "name": "花沫烏龍",
    "category": "tea",
    "prices": {
      "L": 50
    },
    "temperatures": [
      "冰",
      "溫熱"
    ],
    "tags": [
      "推薦"
    ],
    "description": "提供冷飲與熱飲"
  },
  {
    "id": "guiji-honey-green",
    "name": "蜂蜜綠茶",
    "category": "honey",
    "prices": {
      "L": 60
    },
    "temperatures": [
      "冰"
    ],
    "fixedSugar": -1,
    "tags": [],
    "description": "甜度固定，依門市配方"
  },
  {
    "id": "guiji-honey-oolong",
    "name": "蜂蜜花沫烏龍",
    "category": "honey",
    "prices": {
      "L": 65
    },
    "temperatures": [
      "冰"
    ],
    "fixedSugar": -1,
    "tags": [],
    "description": "甜度固定，依門市配方"
  },
  {
    "id": "guiji-honey-lemon",
    "name": "蜂蜜雷夢",
    "category": "honey",
    "prices": {
      "L": 70
    },
    "temperatures": [
      "冰"
    ],
    "tags": [
      "推薦",
      "無咖啡因"
    ],
    "description": "僅供冷飲"
  },
  {
    "id": "guiji-lemon-aloe-honey",
    "name": "雷夢蘆薈蜜",
    "category": "honey",
    "prices": {
      "L": 80
    },
    "temperatures": [
      "冰"
    ],
    "included": [
      "蘆薈"
    ],
    "includedSugar": true,
    "tags": [
      "無咖啡因"
    ],
    "description": "僅供冷飲"
  },
  {
    "id": "guiji-lemon-green",
    "name": "翡翠雷夢",
    "category": "fruit",
    "prices": {
      "L": 70
    },
    "temperatures": [
      "冰"
    ],
    "tags": [],
    "description": "僅供冷飲"
  },
  {
    "id": "guiji-orange-green",
    "name": "柳丁翡翠",
    "category": "fruit",
    "prices": {
      "L": 70
    },
    "temperatures": [
      "冰"
    ],
    "minSugar": 10,
    "tags": [],
    "description": "僅供冷飲"
  },
  {
    "id": "guiji-apple-hongxuan",
    "name": "蘋果紅萱",
    "category": "fruit",
    "prices": {
      "L": 70
    },
    "temperatures": [
      "冰",
      "溫熱"
    ],
    "minSugar": 10,
    "tags": [
      "推薦"
    ],
    "description": "提供冷飲與熱飲"
  },
  {
    "id": "guiji-grape-hongxuan",
    "name": "紫葡三韻紅",
    "category": "fruit",
    "prices": {
      "L": 70
    },
    "temperatures": [
      "冰"
    ],
    "minSugar": 10,
    "tags": [],
    "description": "僅供冷飲"
  },
  {
    "id": "guiji-peach-oolong",
    "name": "蜜桃烏龍",
    "category": "fruit",
    "prices": {
      "L": 80
    },
    "temperatures": [
      "冰"
    ],
    "includedSugar": true,
    "tags": [],
    "description": "僅供冷飲"
  },
  {
    "id": "guiji-grapefruit-green",
    "name": "紅柚翡翠",
    "category": "fruit",
    "prices": {
      "L": 85
    },
    "temperatures": [
      "冰"
    ],
    "includedSugar": true,
    "tags": [
      "推薦"
    ],
    "description": "僅供冷飲"
  },
  {
    "id": "guiji-grapefruit-grape-jelly",
    "name": "紅柚紫葡凍飲",
    "category": "fruit",
    "prices": {
      "L": 90
    },
    "temperatures": [
      "冰"
    ],
    "minSugar": 10,
    "included": [
      "紅萱茶凍"
    ],
    "includedSugar": true,
    "tags": [],
    "description": "僅供冷飲"
  },
  {
    "id": "guiji-starfruit-black",
    "name": "阿源楊桃紅茶",
    "category": "hometown",
    "prices": {
      "L": 60
    },
    "temperatures": [
      "冰",
      "溫熱"
    ],
    "includedSugar": true,
    "tags": [
      "推薦"
    ],
    "description": "提供冷飲與熱飲"
  },
  {
    "id": "guiji-starfruit-green",
    "name": "阿源楊桃綠茶",
    "category": "hometown",
    "prices": {
      "L": 60
    },
    "temperatures": [
      "冰",
      "溫熱"
    ],
    "includedSugar": true,
    "tags": [],
    "description": "提供冷飲與熱飲"
  },
  {
    "id": "guiji-starfruit-lemon",
    "name": "楊桃雷夢",
    "category": "hometown",
    "prices": {
      "L": 65
    },
    "temperatures": [
      "冰"
    ],
    "includedSugar": true,
    "tags": [],
    "description": "僅供冷飲"
  },
  {
    "id": "guiji-plum-green",
    "name": "梅好翡翠綠",
    "category": "hometown",
    "prices": {
      "L": 65
    },
    "temperatures": [
      "冰"
    ],
    "includedSugar": true,
    "tags": [
      "推薦"
    ],
    "description": "僅供冷飲"
  },
  {
    "id": "guiji-plum-hongxuan-jelly",
    "name": "梅好三韻紅凍飲",
    "category": "hometown",
    "prices": {
      "L": 80
    },
    "temperatures": [
      "冰"
    ],
    "included": [
      "紅萱茶凍"
    ],
    "includedSugar": true,
    "tags": [
      "推薦"
    ],
    "description": "僅供冷飲"
  },
  {
    "id": "guiji-black-latte",
    "name": "極品鮮乳茶",
    "category": "fresh",
    "prices": {
      "L": 75
    },
    "temperatures": [
      "冰",
      "溫熱"
    ],
    "tags": [],
    "description": "提供冷飲與熱飲"
  },
  {
    "id": "guiji-green-latte",
    "name": "翡翠鮮乳茶",
    "category": "fresh",
    "prices": {
      "L": 75
    },
    "temperatures": [
      "冰",
      "溫熱"
    ],
    "tags": [],
    "description": "提供冷飲與熱飲"
  },
  {
    "id": "guiji-king-latte",
    "name": "茶王鮮乳茶",
    "category": "fresh",
    "prices": {
      "L": 80
    },
    "temperatures": [
      "冰",
      "溫熱"
    ],
    "tags": [],
    "description": "提供冷飲與熱飲"
  },
  {
    "id": "guiji-black-milk",
    "name": "極品奶茶",
    "category": "milk",
    "prices": {
      "L": 60
    },
    "temperatures": [
      "冰",
      "溫熱"
    ],
    "tags": [],
    "description": "提供冷飲與熱飲"
  },
  {
    "id": "guiji-green-milk",
    "name": "翡翠奶茶",
    "category": "milk",
    "prices": {
      "L": 60
    },
    "temperatures": [
      "冰",
      "溫熱"
    ],
    "tags": [],
    "description": "提供冷飲與熱飲"
  },
  {
    "id": "guiji-king-milk",
    "name": "茶王奶茶",
    "category": "milk",
    "prices": {
      "L": 65
    },
    "temperatures": [
      "冰",
      "溫熱"
    ],
    "tags": [
      "推薦"
    ],
    "description": "提供冷飲與熱飲"
  },
  {
    "id": "guiji-pearl-milk",
    "name": "珍珠奶茶",
    "category": "milk",
    "prices": {
      "L": 70
    },
    "temperatures": [
      "冰",
      "溫熱"
    ],
    "included": [
      "珍珠"
    ],
    "includedSugar": true,
    "tags": [],
    "description": "提供冷飲與熱飲"
  },
  {
    "id": "guiji-honey-milk",
    "name": "蜂蜜奶茶",
    "category": "milk",
    "prices": {
      "L": 70
    },
    "temperatures": [
      "冰",
      "溫熱"
    ],
    "fixedSugar": -1,
    "tags": [
      "推薦"
    ],
    "description": "甜度固定，依門市配方"
  }
],
  addons: [
    { id: "guiji-pearl", name: "珍珠", price: 12 },
    { id: "guiji-aloe", name: "蘆薈", price: 20 },
    { id: "guiji-hongxuan-jelly", name: "紅萱茶凍", price: 20, coldOnly: true }
  ],
  sugars: [
    { value: 100, label: "正常", percent: "100%" },
    { value: 80, label: "八分", percent: "80%" },
    { value: 50, label: "五分", percent: "50%" },
    { value: 30, label: "三分", percent: "30%" },
    { value: 10, label: "一分", percent: "10%" },
    { value: 0, label: "不另加糖", percent: "0%" },
    { value: -1, label: "固定甜度", percent: "依門市配方" }
  ],
  ice: ["正常冰", "少冰", "微冰", "去冰"],
  temperatures: ["冰", "溫熱"]
};
