import { inflate } from "@deno-library/compress";
import { array_is_equal } from "@liuxspro/libs/array";
import { decode_data } from "./libge/mod.ts";

/**
 * ## 解码 Qtree 数据
 * 先用密钥解密，解密后是 zlib 压缩后的数据
 * 再解压数据得到原始数据
 * @param encrypted_data 请求得到的原始 Qtree数据
 * @param key 密钥
 * @returns 解码后的数据包
 */
export function decode_qtree_data(
  encrypted_data: Uint8Array,
  key: Uint8Array,
): Uint8Array {
  const zlib_data = decode_data(encrypted_data, key);
  const decompressed = inflate(zlib_data.slice(8));
  return decompressed;
}

/**
 * 解密瓦片数据
 * @param tile_data 请求得到的原始瓦片数据
 * @param key 密钥
 * @returns 返回解密后的瓦片数据
 */
export function decode_tile(
  tile_data: Uint8Array,
  key: Uint8Array,
): Uint8Array | null {
  const header = new Uint8Array([0x07, 0x91, 0xef, 0xa6]);
  // 判断一下文件头
  if (array_is_equal(tile_data.slice(0, 4), header)) {
    return decode_data(tile_data, key);
  }
  return null;
}
