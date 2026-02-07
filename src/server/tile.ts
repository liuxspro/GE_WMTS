import { Hono } from "hono";
import { get_default_key, QuadKey } from "../libge/mod.ts";
import { create_ge_cap } from "../wmts.ts";
import { get_host } from "./utils.ts";

const key = get_default_key();

export const router = new Hono();

router.get("/:z/:x/:y", async (c) => {
  const version = parseInt(Deno.env.get("version") || "");
  if (!version) {
    c.status(500);
    return c.body("Server version not initialized");
  }
  const { z, x, y } = c.req.param();
  const nz = parseInt(z);
  const nx = parseInt(x);
  const ny = parseInt(y);

  const quad = new QuadKey(nx, ny, nz);

  const tile_data = await quad.get_tile(version, key);
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
