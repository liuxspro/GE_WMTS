import { Application } from "jsr:@oak/oak/application";
import { Router } from "jsr:@oak/oak/router";
import { get_ge_tile, get_version_and_key } from "./ge.ts";

const { version, key } = await get_version_and_key();
const error_png = Deno.readFileSync("./data/error.png");
const router = new Router();

console.log(`Current Version: ${version}`);

router.get("/ge/:z/:x/:y", async (ctx) => {
  const { z, x, y } = ctx.params;
  const nz = parseInt(z);
  const nx = parseInt(x);
  const ny = parseInt(y);

  const tile_data = await get_ge_tile(nx, ny, nz, version, key);
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
