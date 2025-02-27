import { assertEquals } from "@std/assert";
import { decode_data } from "../src/decode.ts";
import { key } from "./key.ts";

Deno.test(async function test_decode() {
  const test_data = await Deno.readFile("./test/test_data/f1-021-i.1016");
  const decoded_data = decode_data(test_data, key);
  const jpeg_magic = new Uint8Array([0xff, 0xd8, 0xff, 0xe0]);
  assertEquals(decoded_data.slice(0, 4), jpeg_magic);
});
