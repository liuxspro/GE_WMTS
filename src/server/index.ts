import { Hono } from "hono";
import { cors } from "hono/cors";
import { serveStatic } from "hono/deno";
import { get_hisversion, get_version_and_key } from "../libge/mod.ts";
import { router as tile_router } from "./tile.ts";
import { router as history_router } from "./history.ts";
import { PORT } from "./utils.ts";
import { create_cache_dir } from "./cache.ts";

// 获取当前版本和密钥
console.log("[Init] [Get Version] - 初始化, 获取 version...");

try {
  const { version, key: _key } = await get_version_and_key();
  const his_version = await get_hisversion();
  Deno.env.set("version", `${version}`);
  Deno.env.set("his_version", `${his_version}`);
  console.log(
    `[Init] [Get Version] - Earth: ${version} History: ${his_version}`,
  );
} catch (_error) {
  console.error("[Init] [Get Version] - 获取 version 失败, 请检查网络");
  Deno.exit(1);
}

await create_cache_dir();

console.log();

// server
const app = new Hono();
app.use(
  "/view",
  serveStatic({ path: "./data/view.html" }),
);
app.use("*", cors());

app.get("/", (c) => {
  return c.html(`
    <a href="/view">Preview</a><br />
    <a href="/tile/wmts">WMTS Capabilities</a>
    <br/>
    <code>On Deno Deploy 💖</code>
    `);
});

app.route("/tile", tile_router);
app.route("/history", history_router);

console.log("Server is runing...");
Deno.serve({ port: PORT }, app.fetch);
