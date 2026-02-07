import { assertEquals } from "@std/assert";
import {
  get_nodes_from_qtree,
  get_qtree,
  parse_qtree,
} from "../src/libge/qtree.ts";
import { decode_qtree_data } from "../src/libge/decode.ts";
import { QuadKey } from "../src/libge/quad.ts";

const test_qtree_data = await Deno.readFile("./test/test_data/q2-0-q.1032");
const decoded_data = decode_qtree_data(test_qtree_data);

Deno.test("Qtree: Decode Qtree Data", function test_decode_qtree() {
  const qtree_header = new Uint8Array([0x2D, 0x7E, 0x00, 0x00]); // 32301 qtree header
  assertEquals(decoded_data.slice(0, 4), qtree_header);
});

Deno.test("Qtree: Get nodes", function test_get_nodes_from_qtree() {
  const nodes = get_nodes_from_qtree(decoded_data);
  assertEquals(nodes.length, 53);
});

Deno.test("Qtree: Parse qtree", function test_parse_qtree() {
  const qtree = parse_qtree(decoded_data, "0");
  assertEquals(qtree["0000"], null);
  assertEquals(qtree["0330"], null);
});

Deno.test("Qtree: Get qtree", async function test_get_qtree() {
  const tile = new QuadKey(13, 2, 4);
  const qtree = await get_qtree(tile.parent_quad_key, 1032);
  const qtree_data = parse_qtree(qtree, tile.parent_quad_key);
  assertEquals(qtree_data["02102"] != null, true);
});
