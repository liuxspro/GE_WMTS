import { inflate } from "@deno-library/compress";
import { array_is_equal } from "@liuxspro/libs/array";

/**
 * ## 使用密钥解密数据
 *
 * @param {Uint8Array} encrypted_data - 待解密的原始数据（Uint8Array类型）
 * @param {Uint8Array} key - 解密密钥（从DBroot文件中获取，长度为1024字节）
 * @returns {Uint8Array} 解密后的数据，若输入为空则返回空数组
 *
 * @example
 * 基本用法
 * const encrypted = new Uint8Array([0x12, 0x34, 0x56,...]);
 * const key = new Uint8Array(1024); // 1024字节密钥
 * const decrypted = decode_data(encrypted, key);
 *
 * @note
 * 参考: https://greverse.bitbucket.io/gecrypt.htm
 * 优化建议参考: https://github.com/CesiumGS/cesium/blob/main/packages/engine/Source/Core/decodeGoogleEarthEnterpriseData.js
 */
export function decode_data(
  encrypted_data: Uint8Array,
  key: Uint8Array,
): Uint8Array {
  // 创建一个新的 Uint8Array 来存储解密后的数据
  const decrypted = new Uint8Array(encrypted_data.length);
  // 初始化密钥索引
  let key_index = 16; // 从密钥的第 16 个字节开始
  // 对每个字节进行异或解密
  for (let i = 0; i < encrypted_data.length; i++) {
    // 使用密钥的当前字节进行异或操作
    decrypted[i] = encrypted_data[i] ^ key[key_index + 8];
    // 更新密钥索引
    key_index++;
    // 如果 keyIndex 是 8 的倍数，则 keyIndex 增加 16
    if (key_index % 8 === 0) {
      key_index += 16;
    }
    // 如果 keyIndex  超过了密钥的长度 keylen，则重新调整 keyIndex 的值。
    // keyIndex 更新为 (keyIndex + 8) % 24，这意味着 keyIndex 会在 0 到 23 之间循环。
    if (key_index >= 1016) {
      key_index = (key_index + 8) % 24;
    }
  }
  return decrypted;
}

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
