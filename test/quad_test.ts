import { assertEquals } from "@std/assert";
import { QuadKey } from "../src/libge/quad.ts";

Deno.test("Quad to XYZ", function test_QuadKey() {
  assertEquals(new QuadKey(3, 0, 2).quad_key, "021");
  assertEquals(new QuadKey(0, 0, 0).quad_key, "0");
  assertEquals(new QuadKey("0").parent_quad_key, "0");
  assertEquals(new QuadKey("02").parent_quad_key, "0");
  assertEquals(new QuadKey("0210").parent_quad_key, "0");
  assertEquals(new QuadKey("02101").parent_quad_key, "0210");
  assertEquals(new QuadKey("02103103").parent_quad_key, "0210");
});

Deno.test("Quad: Get Tile", async function test_QuadKey_get_tile() {
  const jpeg = await new QuadKey("02103103").get_tile(1032);
  assertEquals(
    jpeg?.slice(0, 3),
    Uint8Array.fromHex("FFD8FF"),
  );
});
