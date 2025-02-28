import { Application } from "jsr:@oak/oak/application";
import { Router } from "jsr:@oak/oak/router";
import { get_tile, get_version_and_key } from "./ge.ts";
import {
  create_cache_dir,
  create_qtree_dir,
  create_his_qtree_dir,
  get_current_dir,
} from "./cache.ts";
import { get_hisversion, get_history_tile, query_point } from "./history.ts";
import { join, dirname } from "jsr:@std/path";

console.log("初始化...");

// 获取当前脚本的绝对路径
const current_dir = get_current_dir();
const root_dir = dirname(current_dir);
const data_dir = join(root_dir, "data");
// static file path
const error_png_path = join(data_dir, "error.png");
const wmts_path = join(data_dir, "wmts.xml");
const wmts_history_path = join(data_dir, "wmts.history.xml");

// 创建缓存文件夹
await create_cache_dir();

// 获取当前版本和密钥
const { version, key } = await get_version_and_key();
await create_qtree_dir(version);

const his_version = await get_hisversion();
await create_his_qtree_dir(his_version);

const error_png = Deno.readFileSync(error_png_path);

console.log(`Current Version: \nEarth:${version} History: ${his_version}`);
console.log("初始化完成!\n");

const router = new Router();
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

router.get("/ge/his/query", async (ctx) => {
  const lon = ctx.request.url.searchParams.get("lon") || "";
  const lat = ctx.request.url.searchParams.get("lat") || "";
  const level = ctx.request.url.searchParams.get("level") || "";
  const lon_number = parseFloat(lon);
  const lat_number = parseFloat(lat);
  const level_number = parseFloat(level);
  const layers = await query_point(
    lat_number,
    lon_number,
    level_number,
    his_version,
    key
  );
  ctx.response.type = "text/json";
  ctx.response.body = layers;
});

router.get("/ge/wmts", (ctx) => {
  ctx.response.type = "text/xml;charset=UTF-8";
  const decoder = new TextDecoder("utf-8");
  const data = Deno.readFileSync(wmts_path);
  ctx.response.body = decoder.decode(data);
});

router.get("/ge/his/wmts", (ctx) => {
  const d = ctx.request.url.searchParams.get("d") || "";
  const v = ctx.request.url.searchParams.get("v") || "";
  const lower = ctx.request.url.searchParams.get("l") || "-180.0 -85.051129";
  const upper = ctx.request.url.searchParams.get("u") || "180.0 85.051129";

  ctx.response.type = "text/xml;charset=UTF-8";
  const decoder = new TextDecoder("utf-8");
  const data = Deno.readFileSync(wmts_history_path);
  let xml = decoder.decode(data);
  xml = xml.replace(
    "{{ URL }}",
    `http://localhost:8080/ge/history/{TileMatrix}/{TileCol}/{TileRow}?d=${d}&amp;v=${v}`
  );
  xml = xml.replace("{{ LC }}", lower);
  xml = xml.replace("{{ UC }}", upper);
  ctx.response.body = xml;
});

const app = new Application();
app.use(router.routes());
app.use(router.allowedMethods());

console.log("Server is runing...");
console.log("访问 http://localhost:8080/ge/wmts");
app.listen({ port: 8080 });
