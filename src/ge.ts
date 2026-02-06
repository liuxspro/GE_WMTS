import { get_qtree, parse_qtree } from "./qtree.ts";
import { QuadKey } from "./quad.ts";
import { decode_tile } from "./libge/mod.ts";

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
  key: Uint8Array,
) {
  const quad = new QuadKey(x, y, z);
  const tile_url =
    `https://kh.google.com/flatfile?f1-${quad.quad_key}-i.${version}`;
  const raw_tile_data = await (await fetch(tile_url)).bytes();
  const decrypted_tile_data = decode_tile(raw_tile_data, key);
  return decrypted_tile_data;
}

/**
 * 获取瓦片 (自动查找 version)
 * @param x X
 * @param y Y
 * @param z Z
 * @param version 当前 qtree version
 * @param key 密钥
 * @returns 瓦片数据
 */
export async function get_tile(
  x: number,
  y: number,
  z: number,
  version: number,
  key: Uint8Array,
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
