import { Hono } from "hono";
import { GeoPoint } from "@liuxspro/capgen";
import { get_history_tile, query_point } from "../history.ts";
import { get_default_key } from "../version.ts";
import { create_ge_his_cap } from "../wmts.ts";
import { get_host } from "./utils.ts";

const key = get_default_key();
const his_version = parseInt(Deno.env.get("his_version") || "");

export const router = new Hono();
/**
 * 根据经纬度和层级查询历史影像列表
 * http://localhost:8000/history/query?lon=117.11919576379941&lat=34.25658580862091&level=18
 */
router.get("/query", async (c) => {
  const lon = c.req.query("lon") || "";
  const lat = c.req.query("lat") || "";
  const level = c.req.query("level") || "";
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
  return c.json(layers);
});

router.get("/:z/:x/:y", async (c) => {
  const { z, x, y } = c.req.param();
  const nz = parseInt(z);
  const nx = parseInt(x);
  const ny = parseInt(y);
  const date = c.req.query("d");
  const version = c.req.query("v");

  if (!date) {
    c.status(400); // Bad Request
    return c.json({ error: "Missing 'date' query parameter" });
  }

  const version_n = parseInt(version || "0", 10);

  const tile_data = await get_history_tile(nx, ny, nz, version_n, date, key);

  if (tile_data) {
    c.header("Content-Type", "image/jpg");
    return c.body(new Uint8Array(tile_data));
  } else {
    // c.header("Content-Type", "image/png");
    return c.notFound();
  }
});

router.get("/wmts", (c) => {
  const d = c.req.query("d") || "";
  const v = c.req.query("v") || "";
  const lower = c.req.query("l") || "-180.0 -85.051129";
  let [lon, lat] = lower.split(" ").map(Number);
  const lower_point: GeoPoint = { lon, lat };
  const upper = c.req.query("u") || "180.0 85.051129";
  [lon, lat] = upper.split(" ").map(Number);
  const upper_point = { lon, lat };
  const bbox: [GeoPoint, GeoPoint] = [lower_point, upper_point];
  const url = `${get_host()}/history/{z}/{x}/{y}?d=${d}&v=${v}`;
  const xml = create_ge_his_cap(bbox, url);
  c.header("Content-Type", "text/xml;charset=UTF-8");
  return c.body(xml);
});
