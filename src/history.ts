import protobuf from "protobufjs";
import { isBitSet, decrypt_qtree_data } from "./qtree.ts";
import { QuadKey } from "./quad.ts";
import { decrypt_tile } from "./ge.ts";

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
  version: number
): Promise<Uint8Array> {
  const his_qtree_url = `https://khmdb.google.com/flatfile?db=tm&qp-${quad_key}-q.${version}`;
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
  key: Uint8Array
) {
  // 检查该 qtree 文件是否已经被缓存
  const qtree_file_name = `qp-${quad_key}-q.${version}`;
  const qtree_file_path = `Cache/Qtrees/History/${version}/${qtree_file_name}`;
  try {
    const qtree_rawdata = await Deno.readFile(qtree_file_path);
    return decrypt_qtree_data(qtree_rawdata, key);
  } catch (_err) {
    // 如果不存在就请求，然后保存
    const qtree_rawdata = await fetch_his_qtree_rawdata(quad_key, version);
    Deno.writeFile(qtree_file_path, qtree_rawdata);
    return decrypt_qtree_data(qtree_rawdata, key);
  }
}

interface DatedTile {
  date: number; // Tile 日期
  dated_tile_epoch: number; // 版本
  provider: number; // 提供商
}

enum LayerType {
  LAYER_TYPE_IMAGERY = 0,
  LAYER_TYPE_TERRAIN = 1,
  LAYER_TYPE_VECTOR = 2,
  LAYER_TYPE_IMAGERY_HISTORY = 3,
}

type DatesLayer = DatedTile[];

interface HistoryLayer {
  layer_type: LayerType;
  layer_epoch: number;
  dates_layer: DatesLayer;
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
 * 从qtree数据中读取 tiles
 * @param qtree_data qtree 数据
 * @returns {Promise<GEHistoryTileInfo[]>} Tile 列表
 */
export async function get_nodes_from_qtree(
  qtree_data: Uint8Array
): Promise<GEHistoryTileInfo[]> {
  const qtree = await deserialize_qtreepacket(qtree_data);
  const sparse_qtree_nodes = qtree["sparseQuadtreeNode"];
  const nodes = [];
  for (let i = 0; i < sparse_qtree_nodes.length; i++) {
    const flags = sparse_qtree_nodes[i].Node.flags;
    const all_layers = sparse_qtree_nodes[i].Node.layer;
    let layer: HistoryLayer;
    if (all_layers === undefined) {
      layer = {
        layer_type: LayerType.LAYER_TYPE_IMAGERY,
        layer_epoch: 0,
        dates_layer: [],
      };
    } else {
      layer = all_layers[1].datesLayer.datedTile;
    }

    const item = new GEHistoryTileInfo(flags, layer);
    nodes.push(item);
  }
  return nodes;
}

// Bitmask for checking tile properties
const childrenBitmasks = [0x01, 0x02, 0x04, 0x08];
const anyChildBitmask = 0x0f;
const cacheFlagBitmask = 0x10; // True if there is a child subtree
const imageBitmask = 0x40;
const terrainBitmask = 0x80;

export class GEHistoryTileInfo {
  bitfield: number;
  history_layer: HistoryLayer;

  constructor(bitfield: number, history_layer: HistoryLayer) {
    this.bitfield = bitfield;
    this.history_layer = history_layer;
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

type HistoryTilesInfo = {
  [key: string]: GEHistoryTileInfo | null;
};

export async function parse_history_qtree(
  qtree_data: Uint8Array,
  quad_key_short: string
): Promise<HistoryTilesInfo> {
  const nodes = await get_nodes_from_qtree(qtree_data);
  const tiles_info: HistoryTilesInfo = {};
  let index = 0;

  // 递归函数：填充 history_tiles_info
  function populate_tiles(
    parentKey: string,
    parent: GEHistoryTileInfo,
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

export async function get_history_tile(
  x: number,
  y: number,
  z: number,
  version: number,
  date: string,
  key: Uint8Array
) {
  const quad = new QuadKey(x, y, z);
  const tile_url = `https://khmdb.google.com/flatfile?db=tm&f1-${quad.quad_key}-i.${version}-${date}`;
  const raw_tile_data = await (await fetch(tile_url)).bytes();
  const decrypted_tile_data = decrypt_tile(raw_tile_data, key);
  return decrypted_tile_data;
}

export function number_to_date(date_number: number) {
  // 1. 将十六进制转换为二进制
  // const binary = parseInt(hex_str, 16).toString(2);
  const binary = date_number.toString(2);

  // 2. 分割二进制为年、月、日
  const yearBinary = binary.slice(0, 11); // 前 11 位
  const monthBinary = binary.slice(11, 15); // 中间 4 位
  const dayBinary = binary.slice(15); // 最后 5 位

  // 3. 将二进制转换为十进制
  const year = parseInt(yearBinary, 2);
  const month = parseInt(monthBinary, 2);
  const day = parseInt(dayBinary, 2);

  // 4. 返回日期字符串
  return `${year}-${month.toString().padStart(2, "0")}-${day
    .toString()
    .padStart(2, "0")}`;
}

export async function get_history_layer(
  quad: QuadKey,
  version: number,
  key: Uint8Array
) {
  const qtree_data = await get_his_qtree(quad.parent_quad_key, version, key);
  const tiles = await parse_history_qtree(qtree_data, quad.parent_quad_key);
  const current_tile = tiles[quad.quad_key];
  console.log(current_tile);
  const l = current_tile?.history_layer;
  return l;
}

// export function get_history_layer_dates(layer: HistoryLayer) {
//   return layer.filter((item) => item.date >= 10000).map((item) => item.date);
// }
