import { array_is_equal } from "jsr:@liuxspro/utils";
import { get_qtree, parse_qtree } from "./qtree.ts";
import { QuadKey } from "./quad.ts";

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

// 使用密钥解密数据
export function decrypt_data(
  encrypted_data: Uint8Array,
  key: Uint8Array
): Uint8Array {
  // 创建一个新的 Uint8Array 来存储解密后的数据
  const decryptedBytes = new Uint8Array(encrypted_data.length);
  // 初始化密钥索引
  let keyIndex = 16; // 从密钥的第 16 个字节开始
  // 对每个字节进行异或解密
  for (let i = 0; i < encrypted_data.length; i++) {
    // 使用密钥的当前字节进行异或操作
    decryptedBytes[i] = encrypted_data[i] ^ key[keyIndex + 8];
    // 更新密钥索引
    keyIndex++;
    // 如果 keyIndex 是 8 的倍数，则 keyIndex 增加 16
    if (keyIndex % 8 === 0) {
      keyIndex += 16;
    }
    // 如果 keyIndex  超过了密钥的长度 keylen，则重新调整 keyIndex 的值。
    // keyIndex 更新为 (keyIndex + 8) % 24，这意味着 keyIndex 会在 0 到 23 之间循环。
    if (keyIndex >= 1016) {
      keyIndex = (keyIndex + 8) % 24;
    }
  }
  return decryptedBytes;
}

export function decrypt_tile(
  tile_data: Uint8Array,
  key: Uint8Array
): Uint8Array | null {
  const header = new Uint8Array([0x07, 0x91, 0xef, 0xa6]);
  // 判断一下文件头
  if (array_is_equal(tile_data.slice(0, 4), header)) {
    return decrypt_data(tile_data, key);
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
