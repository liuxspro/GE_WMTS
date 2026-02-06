import { array_is_equal } from "@liuxspro/libs/array";
import { decode_qtree_data } from "./libge/mod.ts";
import { GETileInfo } from "./info.ts";

const kv = await Deno.openKv();

/**
 * 请求原始的 qtree 数据
 * @param {string} quad_key 完整的四叉树编码
 * @param {number} version 当前版本
 * @returns {Promise<Uint8Array>} 原始 qtree packet 数据
 */
export async function fetch_qtree_rawdata(
  quad_key: string,
  version: number,
): Promise<Uint8Array> {
  const qtree_url =
    `https://kh.google.com/flatfile?q2-${quad_key}-q.${version}`;
  const data = await (await fetch(qtree_url)).bytes();
  return data;
}

/**
 * 获取 qtree 信息(有缓存)
 * @param quad_key quad key
 * @param version qtree version
 * @param key 密钥
 * @returns
 */
export async function get_qtree(
  quad_key: string,
  version: number,
  key: Uint8Array,
) {
  const entry = await kv.get(["Earth", version, quad_key]);
  // 如果 KV 中有，直接解密一下返回
  // 没有就抓取并缓存到 KV 中
  if (entry.value) {
    return decode_qtree_data(entry.value as Uint8Array, key);
  } else {
    const qtree_rawdata = await fetch_qtree_rawdata(quad_key, version);
    await kv.set(["Earth", version, quad_key], qtree_rawdata);
    return decode_qtree_data(qtree_rawdata, key);
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
    terrain_version,
  );
}

/**
 * 解析 Qtree 数据包
 * @param qtree_data
 * @returns {GETileInfo[]} GETileInfo 数组
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
  quad_key: string,
): TilesInfo {
  const nodes = get_nodes_from_qtree(qtree_data);
  const tiles_info: TilesInfo = {};
  let index = 0;

  // 递归函数：填充 tiles_info
  function populate_tiles(
    parentKey: string,
    parent: GETileInfo,
    level: number,
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
  if (quad_key === "") {
    populate_tiles("", root, 1); // 根节点从 level 1 开始
  } else {
    tiles_info[quad_key] = root; // 非根节点直接设置
    populate_tiles(quad_key, root, 0); // 从 level 0 开始
  }

  return tiles_info;
}
