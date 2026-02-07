import { assertEquals } from "@std/assert";
import { decode_data, decode_qtree_data } from "../src/libge/mod.ts";

Deno.test("Decode Data", async function test_decode() {
  const test_data = await Deno.readFile("./test/test_data/f1-021-i.1016");
  const decoded_data = decode_data(test_data);
  const jpeg_magic = new Uint8Array([0xff, 0xd8, 0xff, 0xe0]);
  assertEquals(decoded_data.slice(0, 4), jpeg_magic);
});

Deno.test("Decode Qtree Data", async function test_decode_qtree() {
  const test_qtree_data = await Deno.readFile("./test/test_data/q2-0-q.1032");
  const decoded_data = decode_qtree_data(test_qtree_data);
  const qtree_header = new Uint8Array([0x2D, 0x7E, 0x00, 0x00]); // 32301 qtree header
  assertEquals(decoded_data.slice(0, 4), qtree_header);
});
