import { CRS84XYZ } from "@liuxspro/libs/geo";
import { decode_tile } from "./decode.ts";
import { get_qtree, parse_qtree } from "./qtree.ts";

/**
 * 根据 version 获取瓦片
 * @param quadkey quadkey
 * @param version 当前 Version 值
 * @param key 密钥
 * @returns 解密后的瓦片数据(JPEG)
 */
export async function get_tile_by_version(
  quadkey: string,
  version: number,
  key?: Uint8Array,
) {
  const tile_url = `https://kh.google.com/flatfile?f1-${quadkey}-i.${version}`;
  const raw_tile_data = await (await fetch(tile_url)).bytes();
  const jpeg_data = decode_tile(raw_tile_data, key);
  return jpeg_data;
}

/**
 * 表示一个四叉树键 `QuadKey`, 用于空间索引或地图瓦片坐标系统。
 *
 * 支持通过以下方式初始化：
 * - 直接传入 `quad_key` 字符串
 * - 通过 `x, y, z` 行列号生成对应的 `quad_key`
 *
 * @class
 * @example
 * 通过字符串初始化
 * const key1 = new QuadKey("0210230110210");
 * 通过行列号初始化
 * const key2 = new QuadKey(2, 1, 3);
 */
export class QuadKey {
  /**
   * 四叉树键 Quad 的完整字符串表示。
   * @type {string}
   * @readonly
   */
  quad_key: string;

  /**
   * 创建一个 QuadKey 实例。
   * @constructor
   * @overload
   * @param {string} quad_key - 四叉树键的字符串表示
   *
   * @overload
   * @param {number} x - X 行列号
   * @param {number} y - Y 行列号
   * @param {number} z - Z 缩放级别
   *
   * @throws {Error} 如果参数类型不合法
   */
  constructor(quad_key: string);
  constructor(x: number, y: number, z: number);
  constructor(...args: [string] | [number, number, number]) {
    if (typeof args[0] === "string") {
      // 通过字符串初始化
      this.quad_key = args[0];
    } else if (
      typeof args[0] === "number" &&
      typeof args[1] === "number" &&
      typeof args[2] === "number"
    ) {
      // 通过 x, y, z 初始化
      const xyz = new CRS84XYZ(args[0], args[1], args[2]);
      this.quad_key = xyz.to_ge_quadkey();
    } else {
      throw new Error("Invalid initialization parameters");
    }
  }

  /**
   * 获取去掉第一位的短 quad_key（例如 "021023" → "21023"）。
   * @type {string}
   * @readonly
   */
  get short_quad_key(): string {
    return this.quad_key.slice(1);
  }

  // Z=13 X=6764 Y=1267 对应的quad为 02102301102200
  // qtree只有在1，4，8，12，16，20级别（位数）
  // 02102301102200 位数为14 ，qtree信息应该到上一级的12
  // 也就是去掉两位数后  021023011022 中去寻找

  /**
   * 获取父qtree文件信息
   * 即当前quad等信息应该去请求哪个qtree
   *
   * qtree只在第0、3、7、11、15、19级即0、0000、00000000等
   * （级别 = quad 位数 - 1）
   *
   * 找到比当前 quad 级别小的最大级别
   * 如寻找 02103103（7，100，22） 在哪个 qtree 中
   * 级别为7，应该在第3级中去寻找即 0210
   * （虽然7也是qtree级别，但是qtree的第一项数据是未定义的，要在再上一级中找）
   * @type {string}
   * @readonly
   */
  get parent_quad_key(): string {
    const level = this.quad_key.length - 1;
    const parent_level = [0, 3, 7, 11, 15, 19];
    let target_level = 0;
    if (level > 0) {
      target_level = Math.max(...parent_level.filter((num) => num < level));
    }
    const qtree_name = this.quad_key.slice(0, target_level + 1);
    return qtree_name;
  }

  /**
   * 获取当前 quad 对应的瓦片图片数据
   * @param version 当前版本
   * @param key 可选密钥
   * @returns 瓦片图片
   */
  async get_tile(version: number, key?: Uint8Array) {
    // 瓦片信息存储在父级 qtree 中
    const qtree_data = await get_qtree(this.parent_quad_key, version, key);
    const tiles = parse_qtree(qtree_data, this.parent_quad_key);
    const tile_info = tiles[this.quad_key];
    if (tile_info != null) {
      const tile_version = tile_info.imagery_version;
      const tile_data = await get_tile_by_version(
        this.quad_key,
        tile_version,
        key,
      );
      return tile_data;
    } else {
      console.error(`${this.quad_key} 未找到 version 信息`);
    }
  }
}
