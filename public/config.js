// GitHub Pages 與 Cloudflare 網站共用相同後端；部署時填入正式 URL。
export const API_ORIGIN = location.hostname === "localhost" || location.hostname === "127.0.0.1"
  ? ""
  : "https://peak-tea-order.eddiechu1009.workers.dev";
