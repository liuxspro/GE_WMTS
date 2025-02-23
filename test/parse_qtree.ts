import {
  decrypt_qtree_data,
  parse_qtree,
  get_qtree_rawdata,
} from "../src/qtree.ts";
import { key } from "./utils.ts";

const quad_key = "0";
const raw_data = await get_qtree_rawdata(quad_key, 1018);
const qtree_data = decrypt_qtree_data(raw_data, key);
const tiles = parse_qtree(qtree_data, quad_key);
console.log(tiles["0"]);
for (const key in tiles) {
  // deno-lint-ignore no-prototype-builtins
  if (tiles.hasOwnProperty(key)) {
    // 过滤掉原型链上的属性
    if (tiles[key] != null) {
      console.log(`${key},${tiles[key].imagery_version}`);
    }
  }
}
