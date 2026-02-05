import { Hono } from "hono";
import { get_version_and_key } from "../version.ts";
import { get_hisversion } from "../history.ts";
import { router as tile_router } from "./tile.ts";
import { router as history_router } from "./history.ts";
import { PORT } from "./utils.ts";

// 获取当前版本和密钥
console.log("初始化, 获取 version...");
const { version, key: _key } = await get_version_and_key();
const his_version = await get_hisversion();
Deno.env.set("version", `${version}`);
Deno.env.set("his_version", `${his_version}`);

console.log(
  `[Init] [Get Version] - Earth: ${version} History: ${his_version}`,
);
console.log("初始化完成!\n");
const app = new Hono();

app.get("/", (c) => {
  return c.html(`
    <a href="/tile/wmts">WMTS Capabilities</a>
    <br/>
    <code>On Deno Deploy 💖</code>
    `);
});

app.route("/tile", tile_router);
app.route("/history", history_router);

console.log("Server is runing...");
Deno.serve({ port: PORT }, app.fetch);
