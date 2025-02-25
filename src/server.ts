import { Application } from "jsr:@oak/oak/application";
import { Router } from "jsr:@oak/oak/router";
import { get_tile, get_version_and_key } from "./ge.ts";
import {
  create_cache_dir,
  create_qtree_dir,
  create_his_qtree_dir,
} from "./cache.ts";
import { get_hisversion, get_history_tile } from "./history.ts";

console.log("初始化...");
await create_cache_dir();

const { version, key } = await get_version_and_key();
await create_qtree_dir(version);

const his_version = await get_hisversion();
await create_his_qtree_dir(his_version);

const error_png = Deno.readFileSync("./data/error.png");
const router = new Router();

console.log(`Current Version: ${version} History: ${his_version}`);
console.log("初始化完成!\n");

router.get("/ge/:z/:x/:y", async (ctx) => {
  const { z, x, y } = ctx.params;
  const nz = parseInt(z);
  const nx = parseInt(x);
  const ny = parseInt(y);

  const tile_data = await get_tile(nx, ny, nz, version, key);
  if (tile_data) {
    ctx.response.type = "image/jpg";
    ctx.response.body = tile_data;
  } else {
    ctx.response.type = "image/png";
    ctx.response.body = error_png;
  }
});

router.get("/ge/history/:z/:x/:y", async (ctx) => {
  const { z, x, y } = ctx.params;
  const nz = parseInt(z);
  const nx = parseInt(x);
  const ny = parseInt(y);
  const date = ctx.request.url.searchParams.get("d");
  const version = ctx.request.url.searchParams.get("v");
  if (!date) {
    ctx.response.status = 400; // Bad Request
    ctx.response.body = { error: "Missing 'date' query parameter" };
    return;
  }

  const versionNumber = parseInt(version || "0", 10);

  const tile_data = await get_history_tile(
    nx,
    ny,
    nz,
    versionNumber,
    date,
    key
  );

  if (tile_data) {
    ctx.response.type = "image/jpg";
    ctx.response.body = tile_data;
  } else {
    ctx.response.type = "image/png";
    ctx.response.body = error_png;
  }
});

router.get("/ge/wmts", (ctx) => {
  ctx.response.type = "text/xml;charset=UTF-8";
  const decoder = new TextDecoder("utf-8");
  const data = Deno.readFileSync("./data/wmts.xml");
  ctx.response.body = decoder.decode(data);
});

const app = new Application();
app.use(router.routes());
app.use(router.allowedMethods());

console.log("Server is runing...");
console.log("访问 http://localhost:8080/ge/wmts");
app.listen({ port: 8080 });
