/**
 * 将地理坐标(经纬度)转换为四叉树键(QuadKey)。
 *
 * 该函数通过递归细分地理区域（-180°~180°纬度，-180°~180°经度），生成表示坐标位置的字符串编码。
 * 编码规则：
 * - 第一位固定为 '0'
 * - 从第二位开始，每个字符表示当前区域的象限划分：
 *   - '0'：左下象限
 *   - '1'：右下象限
 *   - '2'：右上象限
 *   - '3'：左上象限
 *
 * @param {number} lat - 纬度（范围：-180° ~ 180°）
 * @param {number} lon - 经度（范围：-180° ~ 180°）
 * @param {number} depth - 四叉树的深度（决定编码长度，例如 depth=3 → 编码长度为 4）
 * @returns {string} 四叉树键字符串（例如 "0321"）
 * @throws {Error} 如果纬度或经度超出有效范围
 *
 * @example
 * // 基本用法
 * const quad_key = gcs_to_quad(45.0, -90.0, 4);
 * console.log(quad_key); // 例如 "0321"
 */
function gcs_to_quad(lat: number, lon: number, depth: number): string {
  let code = "0"; // 第一位固定为 '0'
  let lat1 = 180;
  let lon1 = -180; // 初始区域左上角坐标
  let lat2 = -180;
  let lon2 = 180; // 初始区域右下角坐标

  for (let i = 1; i <= depth; i++) {
    // 从第二位开始划分
    const midLat = (lat1 + lat2) / 2; // 中间纬度
    const midLon = (lon1 + lon2) / 2; // 中间经度

    if (lat >= midLat && lon < midLon) {
      // 左上象限（'3'）
      code += "3";
      lat2 = midLat;
      lon2 = midLon;
    } else if (lat >= midLat && lon >= midLon) {
      // 右上象限（'2'）
      code += "2";
      lat2 = midLat;
      lon1 = midLon;
    } else if (lat < midLat && lon >= midLon) {
      // 右下象限（'1'）
      code += "1";
      lat1 = midLat;
      lon1 = midLon;
    } else if (lat < midLat && lon < midLon) {
      // 左下象限（'0'）
      code += "0";
      lat1 = midLat;
      lon2 = midLon;
    } else {
      throw new Error("Invalid lat/lon values");
    }
  }
  return code;
}

/**
 * 将 XYZ 瓦片坐标转换为对应瓦片*中心*的地理坐标（经纬度）。
 *
 * 根据 EPSG:4326 瓦片坐标系规则，计算指定瓦片（x, y, z）中心点的经纬度。
 *
 * @param {number} x - 瓦片的 X 坐标（范围：0 ≤ x < 2^z）
 * @param {number} y - 瓦片的 Y 坐标（范围：0 ≤ y < 2^z）
 * @param {number} z - 缩放级别（z ≥ 0）
 * @returns {{ lon: number, lat: number }} 瓦片中心点的经纬度（单位：度）
 *
 * @example
 * // 获取瓦片 (x=3, y=5, z=3) 的中心坐标
 * const coord = xyz_to_gcs(3, 5, 3);
 * console.log(coord); // 输出示例: { lon: 45, lat: -33.75 }
 */
function xyz_to_gcs(
  x: number,
  y: number,
  z: number
): { lon: number; lat: number } {
  const lon = (x * 360) / Math.pow(2, z) - 180;
  // 计算瓦片中心点坐标
  const d_lon = 360 / Math.pow(2, z);
  const lat = 90 - (y * 180) / Math.pow(2, z - 1);
  const d_lat = 180 / Math.pow(2, z - 1);
  return { lon: lon + d_lon / 2, lat: lat - d_lat / 2 };
}

/**
 * 将XYZ行列号转为 Quad 四叉树编码
 * @param {number} x - X 行列号
 * @param {number} y - Y 行列号
 * @param {number} z - Z 缩放级别
 * @returns {string}
 */
function xyz_to_quad(x: number, y: number, z: number): string {
  const coord = xyz_to_gcs(x, y, z);
  return gcs_to_quad(coord.lat, coord.lon, z);
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
 * // 通过字符串初始化
 * const key1 = new QuadKey("0210230110210");
 * // 通过行列号初始化
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
      this.quad_key = xyz_to_quad(args[0], args[1], args[2]);
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
}
