import { inflate } from "jsr:@deno-library/compress";
import { array_is_equal } from "jsr:@liuxspro/utils";
import { decrypt_data } from "./ge.ts";

/**
 *
 * @param {string} quad_key 完整的四叉树编码
 * @param {number} version 当前版本
 * @returns {Promise<Uint8Array>} 原始 qtree packet 数据
 */
export async function get_qtree_rawdata(
  quad_key: string,
  version: number
): Promise<Uint8Array> {
  const qtree_url = `https://kh.google.com/flatfile?q2-${quad_key}-q.${version}`;
  const data = await (await fetch(qtree_url)).bytes();
  return data;
}

export async function get_qtree(
  quadkey: string,
  version: number,
  key: Uint8Array
) {
  // 检查该 qtree 文件是否已经被缓存
  const qtree_file_name = `q2-${quadkey}-q.${version}`;
  const qtree_file_path = `Cache/Qtrees/${version}/${qtree_file_name}`;
  try {
    const qtree_rawdata = await Deno.readFile(qtree_file_path);
    return decrypt_qtree_data(qtree_rawdata, key);
  } catch (_err) {
    // 如果不存在就请求，然后保存
    const qtree_rawdata = await get_qtree_rawdata(quadkey, version);
    Deno.writeFile(qtree_file_path, qtree_rawdata);
    return decrypt_qtree_data(qtree_rawdata, key);
  }
}

// See: https://github.com/google/earthenterprise/blob/master/earth_enterprise/src/keyhole/earth_client_protobuf/quadtreeset.protodevel
// See: https://github.com/CesiumGS/cesium/blob/main/packages/engine/Source/Workers/decodeGoogleEarthEnterprisePacket.js

// Bitmask for checking tile properties
const childrenBitmasks = [0x01, 0x02, 0x04, 0x08];
const anyChildBitmask = 0x0f;
const cacheFlagBitmask = 0x10; // True if there is a child subtree
const imageBitmask = 0x40;
const terrainBitmask = 0x80;

/**
 * ## 解码 Qtree 数据
 * 先用密钥解密，解密后是 zlib 压缩后的数据
 * 再解压数据得到原始数据
 * @param encrypted_data 请求得到的原始数据
 * @param key 密钥
 * @returns 解码后的数据包
 */
export function decrypt_qtree_data(
  encrypted_data: Uint8Array,
  key: Uint8Array
): Uint8Array {
  const zlib_data = decrypt_data(encrypted_data, key);
  const decompressed = inflate(zlib_data.slice(8));
  return decompressed;
}

/**
 * 检查 bits 中是否有任何与 mask 对应的位被设置（即是否为 1）。
 * 如果 bits 和 mask 的按位与结果不为 0，说明至少有一个对应的位被设置。
 *
 * @param bit - 一个整数，表示要检查的二进制位。
 * @param mask - 一个掩码，用于指定要检查的位。
 * @returns 如果 bits 中与 mask 对应的位有任何一个被设置，返回 true；否则返回 false。
 *
 * @example
 * // bits: 0101 0000 mask: 0b01000000（0x40）
 * // 检查二进制数 第 7 位是是否为 1
 * console.log(isBitSet(0b01010000, 0b01000000)); // true
 * console.log(isBitSet(0x50, 0x40)); // true
 * console.log(isBitSet(80, 64)); // true
 * console.log(isBitSet(0b00010000, 0b01000000)); // false
 *
 */
export function isBitSet(bits: number, mask: number) {
  return (bits & mask) !== 0;
}

/**
 * Qtree 数据中的 Tile 节点数据
 *
 * 每个节点占用 32 字节
 * 第 1 个字节为 Bitfield 用于识别节点图像类型
 * 采用的是位掩码设计
 */
export class GETileInfo {
  bitfield: number;
  cnode_version: number;
  imagery_version: number;
  terrain_version: number;

  constructor(
    bitfield: number,
    cnode_version: number,
    imagery_version: number,
    terrain_version: number
  ) {
    this.bitfield = bitfield;
    this.cnode_version = cnode_version;
    this.imagery_version = imagery_version;
    this.terrain_version = terrain_version;
  }
  // 是否含有子节点
  has_subtree(): boolean {
    return isBitSet(this.bitfield, cacheFlagBitmask);
  }
  // 是否含有图像
  has_imagery(): boolean {
    return isBitSet(this.bitfield, imageBitmask);
  }
  // 是否含有地形数据
  has_terrain(): boolean {
    return isBitSet(this.bitfield, terrainBitmask);
  }
  // 是否有任意子节点
  has_children(): boolean {
    return isBitSet(this.bitfield, anyChildBitmask);
  }
  // 是否有指定的子节点
  has_child(index: number) {
    return isBitSet(this.bitfield, childrenBitmasks[index]);
  }
}

function to_number(a: Uint8Array): number {
  // 使用 DataView 解析为小端序的 32 位无符号整数
  // 补零到 4 位
  const paddedArray = new Uint8Array(4); // 创建一个长度为 4 的 Uint8Array
  paddedArray.set(a, 0); // 将原始数据复制到新数组的开头
  const dataView = new DataView(paddedArray.buffer);
  const decimalNumber = dataView.getUint32(0, true); // true 表示小端序

  return decimalNumber;
}

export function parse_qtree_node(node_data: Uint8Array): GETileInfo {
  // 节点数据长度为 32
  if (node_data.length != 32) {
    throw "invalid node data";
  }
  const bitfield = to_number(node_data.slice(0, 1));
  const cnode_version = to_number(node_data.slice(2, 4));
  const imagery_version = to_number(node_data.slice(4, 6));
  const terrain_version = to_number(node_data.slice(6, 8));
  return new GETileInfo(
    bitfield,
    cnode_version,
    imagery_version,
    terrain_version
  );
}

/**
 * 解析 Qtree 数据包
 * @param qtree_data
 * @returns GETileInfo[] GETileInfo 数组
 */
export function get_nodes_from_qtree(qtree_data: Uint8Array): GETileInfo[] {
  const magic = new Uint8Array([0x2d, 0x7e, 0x00, 0x00]);

  if (!array_is_equal(qtree_data.slice(0, 4), magic)) {
    throw "not a qtree data";
  }
  const num_instances = to_number(qtree_data.slice(12, 16));
  const nodes = [];
  for (let i = 1; i <= num_instances; i++) {
    nodes.push(parse_qtree_node(qtree_data.slice(32 * i, 32 * (i + 1))));
  }
  return nodes;
}

type TilesInfo = {
  [key: string]: GETileInfo | null;
};

export function parse_qtree(
  qtree_data: Uint8Array,
  quad_key_short: string
): TilesInfo {
  const nodes = get_nodes_from_qtree(qtree_data);
  const tiles_info: TilesInfo = {};
  let index = 0;

  // 递归函数：填充 tiles_info
  function populate_tiles(
    parentKey: string,
    parent: GETileInfo,
    level: number
  ) {
    // 如果是叶子节点（level === 4），设置所有子节点为 null
    const isLeaf = level === 4 && !parent.has_subtree();

    for (let i = 0; i < 4; i++) {
      const childKey = parentKey + i; // 构建子节点的 quadkey

      if (isLeaf) {
        tiles_info[childKey] = null; // 子节点的子节点为 null
      } else if (level < 4) {
        if (!parent.has_child(i)) {
          tiles_info[childKey] = null; // 如果父节点没有该子节点，设置为 null
        } else {
          if (index >= nodes.length) {
            console.error("Incorrect number of instances");
            return;
          }
          const instance = nodes[index++];
          tiles_info[childKey] = instance; // 设置子节点
          populate_tiles(childKey, instance, level + 1); // 递归处理子节点
        }
      }
    }
  }

  // 处理根节点
  const root = nodes[index++];
  if (quad_key_short === "") {
    populate_tiles("", root, 1); // 根节点从 level 1 开始
  } else {
    tiles_info[quad_key_short] = root; // 非根节点直接设置
    populate_tiles(quad_key_short, root, 0); // 从 level 0 开始
  }

  return tiles_info;
}
