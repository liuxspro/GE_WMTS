import { assertEquals } from "@std/assert";
import { QuadKey } from "../src/quad.ts";

Deno.test(function test_QuadKey() {
  assertEquals(new QuadKey(3, 0, 2).quad_key, "021");
  assertEquals(new QuadKey(0, 0, 0).quad_key, "0");
  assertEquals(new QuadKey("0").parent_quad_key, "0");
  assertEquals(new QuadKey("02").parent_quad_key, "0");
  assertEquals(new QuadKey("0210").parent_quad_key, "0");
  assertEquals(new QuadKey("02101").parent_quad_key, "0210");
  assertEquals(new QuadKey("02103103").parent_quad_key, "0210");
});
