/**
 * `{ "date": 545, "datedTileEpoch": 271, "provider": 0 }`
 */
interface DatedTile {
  date: number; // Tile 日期
  datedTileEpoch: number; // 版本
  provider: number; // 提供商
  date_1: string;
}

export class DatedTile2 {
  date: number;
  epoch: number;
  provider: number;

  constructor(date: number, epoch: number, provider: number) {
    this.date = date;
    this.epoch = epoch;
    this.provider = provider;
  }
}

/**
 *
 * ```
 * "datesLayer": {
 *   "datedTile": [
 *       { "date": 545, "datedTileEpoch": 271, "provider": 0 },
 *       ...
 *   ],
 *   "sharedTileDate": 1036610,   // 可选属性
 *   "coarseTileDates": [1016735] // 可选属性
 *}
 * ```
 */
export interface DatesLayer {
  datedTile: DatedTile2[];
  sharedTileDate?: number;
  coarseTileDates?: number[];
}

interface ImageryLayer {
  type: "LAYER_TYPE_IMAGERY";
  layerEpoch: number;
}

interface HistoryLayer {
  type: "LAYER_TYPE_IMAGERY_HISTORY";
  layerEpoch: number;
  datesLayer: DatesLayer;
}

export type Layer = ImageryLayer | HistoryLayer;

export interface Node {
  flags: number;
  layer?: Layer[];
}

export interface SparseQuadtreeNode {
  index: number;
  Node: Node;
}

// enum LayerType {
//   LAYER_TYPE_IMAGERY = 0,
//   LAYER_TYPE_TERRAIN = 1,
//   LAYER_TYPE_VECTOR = 2,
//   LAYER_TYPE_IMAGERY_HISTORY = 3,
// }

export type HistoryTilesInfo = {
  [key: string]: GEHistoryTileInfo | null;
};

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

// See: https://github.com/google/earthenterprise/blob/master/earth_enterprise/src/keyhole/earth_client_protobuf/quadtreeset.protodevel
// See: https://github.com/CesiumGS/cesium/blob/main/packages/engine/Source/Workers/decodeGoogleEarthEnterprisePacket.js
// Bitmask for checking tile properties
const childrenBitmasks = [0x01, 0x02, 0x04, 0x08];
const anyChildBitmask = 0x0f;
const cacheFlagBitmask = 0x10; // True if there is a child subtree
const imageBitmask = 0x40;
const terrainBitmask = 0x80;

export class TileInfo {
  bitfield: number;

  constructor(bitfield: number) {
    this.bitfield = bitfield;
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

/**
 * Qtree 数据中的 Tile 节点数据
 *
 * 每个节点占用 32 字节
 * 第 1 个字节为 Bitfield 用于识别节点图像类型
 * 采用的是位掩码设计
 */
export class GETileInfo extends TileInfo {
  cnode_version: number;
  imagery_version: number;
  terrain_version: number;

  constructor(
    bitfield: number,
    cnode_version: number,
    imagery_version: number,
    terrain_version: number
  ) {
    super(bitfield);
    this.cnode_version = cnode_version;
    this.imagery_version = imagery_version;
    this.terrain_version = terrain_version;
  }
}

export class GEHistoryTileInfo extends TileInfo {
  layer: Layer[];

  constructor(bitfield: number, layer: Layer[]) {
    super(bitfield);
    this.layer = layer;
  }
}
