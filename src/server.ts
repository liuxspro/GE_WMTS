import { Application } from "jsr:@oak/oak/application";
import { Router } from "jsr:@oak/oak/router";
import { get_tile } from "./ge.ts";
import { get_version_and_key } from "./version.ts";
import { get_current_dir } from "./cache.ts";
import { get_history_tile, get_hisversion, query_point } from "./history.ts";
import { dirname, join } from "jsr:@std/path";
import { create_ge_cap, create_ge_his_cap } from "./wmts.ts";
import { GeoPoint } from "@liuxspro/capgen";

console.log("初始化...");

// 获取当前脚本的绝对路径
const current_dir = get_current_dir();
const root_dir = dirname(current_dir);
const data_dir = join(root_dir, "data");
// static file path
const error_png_path = join(data_dir, "error.png");
const error_png = Deno.readFileSync(error_png_path);

// 获取当前版本和密钥
let { version, key } = await get_version_and_key();
let his_version = await get_hisversion();

console.log(`[Init] [Get Version]: Earth: ${version} History: ${his_version}`);
console.log("初始化完成!\n");

// 每小时更新版本
Deno.cron("get version", "0 * * * *", async () => {
  ({ version, key } = await get_version_and_key());
  his_version = await get_hisversion();
  console.log(
    `[Cron Job] [Get Version]: Earth:${version} History: ${his_version}`,
  );
});

function isDenoDeploy(): boolean {
  return Deno.env.has("DENO_DEPLOYMENT_ID");
}

function get_host(): string {
  let host = "http://localhost:8080";
  if (isDenoDeploy()) {
    host = "https://gewmts.deno.dev";
  }
  return host;
}

const router = new Router();
router.get("/:z/:x/:y", async (ctx) => {
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

router.get("/history/:z/:x/:y", async (ctx) => {
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

  const version_n = parseInt(version || "0", 10);

  const tile_data = await get_history_tile(nx, ny, nz, version_n, date, key);

  if (tile_data) {
    ctx.response.type = "image/jpg";
    ctx.response.body = tile_data;
  } else {
    ctx.response.type = "image/png";
    ctx.response.body = error_png;
  }
});

/**
 * 根据经纬度和层级查询历史影像列表
 * http://localhost:8080/ge/his/query?lon=117.11919576379941&lat=34.25658580862091&level=18
 */
router.get("/his/query", async (ctx) => {
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
    key,
  );
  ctx.response.type = "text/json";
  ctx.response.body = layers;
});

router.get("/wmts", (ctx) => {
  ctx.response.type = "text/xml;charset=UTF-8";
  const xml = create_ge_cap(`${get_host()}/{z}/{x}/{y}`);
  ctx.response.body = xml;
});

router.get("/his/wmts", (ctx) => {
  const d = ctx.request.url.searchParams.get("d") || "";
  const v = ctx.request.url.searchParams.get("v") || "";
  const lower = ctx.request.url.searchParams.get("l") || "-180.0 -85.051129";
  let [lon, lat] = lower.split(" ").map(Number);
  const lower_point: GeoPoint = { lon, lat };
  const upper = ctx.request.url.searchParams.get("u") || "180.0 85.051129";
  [lon, lat] = upper.split(" ").map(Number);
  const upper_point = { lon, lat };
  const bbox: [GeoPoint, GeoPoint] = [lower_point, upper_point];
  const url = `${get_host()}/history/{z}/{x}/{y}?d=${d}&v=${v}`;
  const xml = create_ge_his_cap(bbox, url);
  ctx.response.type = "text/xml;charset=UTF-8";
  ctx.response.body = xml;
});

router.get("/", (ctx) => {
  ctx.response.body = "On Deno Deploy 💖";
});

const app = new Application();
app.use(router.routes());
app.use(router.allowedMethods());

console.log("Server is runing...");
console.log("访问 http://localhost:8080/ge/wmts");
app.listen({ port: 8080 });
