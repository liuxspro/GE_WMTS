import { array_is_equal } from "jsr:@liuxspro/utils";
import { get_qtree, parse_qtree } from "./qtree.ts";
import { QuadKey } from "./quad.ts";
import { decode_data } from "./decode.ts";

export async function get_dbroot() {
  const url = "http://kh.google.com/dbRoot.v5?hl=zh-hans&gl=hk";
  const data = await (await fetch(url)).bytes();
  return data;
}

export async function get_version_and_key() {
  const dbroot_data = await get_dbroot();
  const version_byte = dbroot_data.slice(6, 8);
  // 组合为 16 位整数 小端序
  const uint16Value = (version_byte[1] << 8) | version_byte[0];
  const version = uint16Value ^ 0x4200;
  const key = new Uint8Array(1024);
  // 将前 8 个字节填充为 0
  key.fill(0, 0, 8);
  key.set(dbroot_data.slice(8, 1024), 8);
  return { version, key };
}

export function decrypt_tile(
  tile_data: Uint8Array,
  key: Uint8Array
): Uint8Array | null {
  const header = new Uint8Array([0x07, 0x91, 0xef, 0xa6]);
  // 判断一下文件头
  if (array_is_equal(tile_data.slice(0, 4), header)) {
    return decode_data(tile_data, key);
  }
  return null;
}

/**
 * 根据 version 获取瓦片
 * @param x X
 * @param y Y
 * @param z Z
 * @param version 当前 Version 值
 * @param key 密钥
 * @returns 解密后的瓦片数据(JPEG)
 */
export async function get_ge_tile(
  x: number,
  y: number,
  z: number,
  version: number,
  key: Uint8Array
) {
  const quad = new QuadKey(x, y, z);
  const tile_url = `https://kh.google.com/flatfile?f1-${quad.quad_key}-i.${version}`;
  const raw_tile_data = await (await fetch(tile_url)).bytes();
  const decrypted_tile_data = decrypt_tile(raw_tile_data, key);
  return decrypted_tile_data;
}

export async function get_tile(
  x: number,
  y: number,
  z: number,
  version: number,
  key: Uint8Array
) {
  const quad = new QuadKey(x, y, z);
  const qtree_name = quad.parent_quad_key;
  const qtree_data = await get_qtree(qtree_name, version, key);
  const tiles = parse_qtree(qtree_data, qtree_name);
  const tile_info = tiles[quad.quad_key];
  if (tile_info != null) {
    const tile_version = tile_info.imagery_version;
    const tile_data = await get_ge_tile(x, y, z, tile_version, key);
    return tile_data;
  } else {
    console.error(`${z}/${x}/${y} 未找到 version 信息`);
  }
}
