import { QuadtreeNode } from "./libge/types.ts";
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
 * ```
 * "datesLayer": {
 *   "datedTile": [
 *       { "date": 545, "datedTileEpoch": 271, "provider": 0 },
 *       ...
 *   ],
 *   "sharedTileDate": 1036610,   // 可选属性
 *   "coarseTileDates": [1016735] // 可选属性
 * }
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

export class GEHistoryTileInfo extends QuadtreeNode {
  layer: Layer[];

  constructor(bitfield: number, layer: Layer[]) {
    super(bitfield);
    this.layer = layer;
  }
}
