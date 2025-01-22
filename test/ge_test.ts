import { assertEquals } from "@std/assert";
import { xyz_to_coord } from "../src/ge.ts";

Deno.test(function test_xyz_to_coord() {
  assertEquals(xyz_to_coord(6761, 1267, 13), {
    lon: 117.13623046875,
    lat: 34.29931640625,
  });
});
