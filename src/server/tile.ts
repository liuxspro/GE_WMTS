import { Hono } from "hono";
import { get_tile } from "../ge.ts";
import { get_default_key } from "../version.ts";
import { create_ge_cap } from "../wmts.ts";
import { get_host } from "./utils.ts";

const key = get_default_key();
const version = parseInt(Deno.env.get("version") || "");

export const router = new Hono();

router.get("/:z/:x/:y", async (c) => {
  if (!version) {
    c.status(500);
    return c.body("Server version not initialized");
  }
  const { z, x, y } = c.req.param();
  const nz = parseInt(z);
  const nx = parseInt(x);
  const ny = parseInt(y);

  const tile_data = await get_tile(nx, ny, nz, version, key);
  if (tile_data) {
    c.header("Content-Type", "image/jpg");
    return c.body(new Uint8Array(tile_data));
  } else {
    c.status(404);
    return c.body("Tile not found");
  }
});

router.get("/wmts", (c) => {
  c.header("Content-Type", "text/xml;charset=UTF-8");
  const xml = create_ge_cap(`${get_host()}/tile/{z}/{x}/{y}`);
  return c.body(xml);
});
