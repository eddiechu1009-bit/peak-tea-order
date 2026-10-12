import { cp, mkdir, writeFile } from "node:fs/promises";
await mkdir(new URL("../docs/", import.meta.url), { recursive: true });
await cp(new URL("../public/", import.meta.url), new URL("../docs/", import.meta.url), { recursive: true });
await writeFile(new URL("../docs/.nojekyll", import.meta.url), "");
console.log("GitHub Pages 的 docs/ 已由 public/ 同步產生");
