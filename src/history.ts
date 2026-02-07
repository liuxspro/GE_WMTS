import protobuf from "protobufjs";
import {
  GEHistoryTileInfo,
  HistoryTilesInfo,
  Layer,
  SparseQuadtreeNode,
} from "./info.ts";
import { QuadKey } from "./quad.ts";
import { decode_qtree_data, decode_tile } from "./libge/mod.ts";
import { CRS84XYZ } from "@liuxspro/libs/geo";

const kv = await Deno.openKv();

export async function get_his_dbroot() {
  const url = "http://khmdb.google.com/dbRoot.v5?db=tm&hl=zh-hans&gl=hk";
  const data = await (await fetch(url)).bytes();
  return data;
}

export async function get_hisversion() {
  const dbroot_data = await get_his_dbroot();
  const version_byte = dbroot_data.slice(6, 8);
  // 组合为 16 位整数 小端序
  const uint16Value = (version_byte[1] << 8) | version_byte[0];
  const version = uint16Value ^ 0x4200;
  return version;
}

/**
 * 请求 qtree packet 数据
 * @param {string} quad_key 完整的四叉树编码
 * @param {number} version 当前版本
 * @returns {Promise<Uint8Array>} 原始 qtree packet 数据
 */
export async function fetch_his_qtree_rawdata(
  quad_key: string,
  version: number,
): Promise<Uint8Array> {
  const his_qtree_url =
    `https://khmdb.google.com/flatfile?db=tm&qp-${quad_key}-q.${version}`;
  const data = await (await fetch(his_qtree_url)).bytes();
  return data;
}

/**
 * 获取历史模式 Qtree 数据
 * 从缓存中读取
 * @param quad_key 四叉树编码
 * @param version  版本
 * @param key      密钥
 * @returns        历史模式 Qtree 数据
 */
export async function get_his_qtree(
  quad_key: string,
  version: number,
  key: Uint8Array,
) {
  // 检查该 qtree 文件是否已经被缓存
  const entry = await kv.get(["History", version, quad_key]);
  if (entry.value) {
    return decode_qtree_data(entry.value as Uint8Array, key);
  } else {
    const qtree_rawdata = await fetch_his_qtree_rawdata(quad_key, version);
    await kv.set(["History", version, quad_key], qtree_rawdata);
    return decode_qtree_data(qtree_rawdata, key);
  }
}

/**
 * 反序列化 Qtree 数据包
 * 这是一个 protobuf，proto 文件可在 https://github.com/google/earthenterprise/blob/master/earth_enterprise/src/keyhole/earth_client_protobuf/quadtreeset.protodevel 找到
 * @param { Uint8Array }qtree_data  Qtree数据包
 * @returns 反序列化后的对象
 */
export async function deserialize_qtreepacket(qtree_data: Uint8Array) {
  const root = await protobuf.load("./data/quadtreeset.proto");
  // 获取 QuadtreePacket 类型
  const QuadtreePacket = root.lookupType("keyhole.QuadtreePacket");
  const message = QuadtreePacket.decode(qtree_data);
  return message.toJSON();
}

/**
 * 从 qtree 数据中读取 tiles
 * @param qtree_data qtree 数据
 * @returns {Promise<GEHistoryTileInfo[]>} Tile 列表
 */
export async function get_nodes_from_qtree(
  qtree_data: Uint8Array,
): Promise<GEHistoryTileInfo[]> {
  const qtree = await deserialize_qtreepacket(qtree_data);
  const sparse_qtree_nodes: SparseQuadtreeNode[] = qtree["sparseQuadtreeNode"];
  const nodes: GEHistoryTileInfo[] = [];
  for (let i = 0; i < sparse_qtree_nodes.length; i++) {
    const flags = sparse_qtree_nodes[i].Node.flags;
    const node = sparse_qtree_nodes[i].Node;
    if (node.layer) {
      const item = new GEHistoryTileInfo(flags, node.layer);
      nodes.push(item);
    }
  }
  return nodes;
}

export async function parse_history_qtree(
  qtree_data: Uint8Array,
  quad_key: string,
): Promise<HistoryTilesInfo> {
  const nodes = await get_nodes_from_qtree(qtree_data);
  const tiles_info: HistoryTilesInfo = {};
  let index = 0;

  // 递归函数：填充 history_tiles_info
  function populate_tiles(
    parentKey: string,
    parent: GEHistoryTileInfo,
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

export async function get_history_tile(
  x: number,
  y: number,
  z: number,
  version: number,
  date: string,
  key: Uint8Array,
) {
  const quad = new QuadKey(x, y, z);
  const tile_url =
    `https://khmdb.google.com/flatfile?db=tm&f1-${quad.quad_key}-i.${version}-${date}`;
  const raw_tile_data = await (await fetch(tile_url)).bytes();
  const decrypted_tile_data = decode_tile(raw_tile_data, key);
  return decrypted_tile_data;
}

/**
 * 获取指定 quad 的历史影像信息
 *
 * @param {QuadKey} quad  QuadKey
 * @param version 版本
 * @param key 密钥
 * @returns {Promise<Layer[]>} 瓦片的 Node 信息
 */
export async function get_history_layer(
  quad: QuadKey,
  version: number,
  key: Uint8Array,
): Promise<Layer[]> {
  const qtree_data = await get_his_qtree(quad.parent_quad_key, version, key);
  const tiles = await parse_history_qtree(qtree_data, quad.parent_quad_key);
  const current_tile = tiles[quad.quad_key];
  if (current_tile != null) {
    return current_tile.layer;
  } else {
    throw Error("Filed to get history layer");
  }
}

// export function get_history_layer_dates(layer: DatesLayer) {
//   return layer
//     .filter((item) => item.date >= 10000)
//     .map((item) => number_to_date(item.date));
// }

export async function query_point(
  lat: number,
  lon: number,
  level: number,
  version: number,
  key: Uint8Array,
) {
  const quad_string = CRS84XYZ.from_lonlat(lon, lat, level).to_ge_quadkey();
  const quad = new QuadKey(quad_string);
  const layers = await get_history_layer(quad, version, key);
  return layers;
}
