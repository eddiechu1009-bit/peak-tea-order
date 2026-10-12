import { menu as peakMenu } from "./menu.js?v=stores-20261012";
import { menu as guijiMenu } from "./guiji-menu.js?v=stores-20261012";

export const DEFAULT_STORE_ID = "peak-att";
export const menus = {
  [DEFAULT_STORE_ID]: { ...peakMenu, storeId: DEFAULT_STORE_ID },
  "guiji-a11": guijiMenu
};
export const stores = Object.values(menus).map(({ storeId, shop, branch, sourceUrl, checkedAt }) =>
  ({ id: storeId, shop, branch, sourceUrl, checkedAt }));
