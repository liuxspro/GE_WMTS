export async function get_dbroot() {
  const url = "http://kh.google.com/dbRoot.v5?hl=zh-hans&gl=hk";
  const data = await (await fetch(url)).bytes();
  return data;
}

export async function get_version_and_key() {
  const dbroot_data = await get_dbroot();
  const version_byte = dbroot_data.slice(6, 8);
  // 组合为 16 位整数 小端序
  const uint16Value = (version_byte[1] << 8) | version_byte[0];
  const version = uint16Value ^ 0x4200;
  const key = new Uint8Array(1024);
  // 将前 8 个字节填充为 0
  key.fill(0, 0, 8);
  key.set(dbroot_data.slice(8, 1024), 8);
  return { version, key };
}

export function decrypt_data(
  encrypted_data: Uint8Array,
  key: Uint8Array
): Uint8Array {
  // 创建一个新的 Uint8Array 来存储解密后的数据
  const decryptedBytes = new Uint8Array(encrypted_data.length);
  // 初始化密钥索引
  let keyIndex = 16; // 从密钥的第 16 个字节开始
  // 对每个字节进行异或解密
  for (let i = 0; i < encrypted_data.length; i++) {
    // 使用密钥的当前字节进行异或操作
    decryptedBytes[i] = encrypted_data[i] ^ key[keyIndex + 8];
    // 更新密钥索引
    keyIndex++;
    // 如果 keyIndex 是 8 的倍数，则 keyIndex 增加 16
    if (keyIndex % 8 === 0) {
      keyIndex += 16;
    }
    // 如果 keyIndex  超过了密钥的长度 keylen，则重新调整 keyIndex 的值。
    // keyIndex 更新为 (keyIndex + 8) % 24，这意味着 keyIndex 会在 0 到 23 之间循环。
    if (keyIndex >= 1016) {
      keyIndex = (keyIndex + 8) % 24;
    }
  }
  return decryptedBytes;
}

function arraysEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  return a.every((value, index) => value === b[index]);
}

export function decrypt_tile(
  tile_data: Uint8Array,
  key: Uint8Array
): Uint8Array | null {
  const header = new Uint8Array([0x07, 0x91, 0xef, 0xa6]);
  // 判断一下文件头
  if (arraysEqual(tile_data.slice(0, 4), header)) {
    return decrypt_data(tile_data, key);
  }
  return null;
}

export async function get_ge_tile(
  x: number,
  y: number,
  z: number,
  version: number,
  key: Uint8Array
) {
  const quad = xyz_to_quad(x, y, z);
  const tile_url = `https://kh.google.com/flatfile?f1-${quad}-i.${version}`;
  const raw_tile_data = await (await fetch(tile_url)).bytes();
  const decrypted_tile_data = decrypt_tile(raw_tile_data, key);
  return decrypted_tile_data;
}

// 经纬度坐标转XYZ
export function coord_to_xyz(lat: number, lon: number, zoom: number) {
  const x = Math.floor((Math.pow(2, zoom) * (180 + lon)) / 360);
  const y = Math.floor((Math.pow(2, zoom - 1) * (90 - lat)) / 180);
  return { x, y };
}

// 计算XYZ的中心坐标
export function xyz_to_coord(x: number, y: number, z: number) {
  const lon = (x * 360) / Math.pow(2, z) - 180;
  // 计算瓦片中心点坐标
  const d_lon = 360 / Math.pow(2, z);
  const lat = 90 - (y * 180) / Math.pow(2, z - 1);
  const d_lat = 180 / Math.pow(2, z - 1);
  return { lon: lon + d_lon / 2, lat: lat - d_lat / 2 };
}

// 经纬度转四叉树编码
// 使用瓦片中心点坐标来算，用左上角的坐标算可能有精度误差，导致象限判断错误
export function get_quad_code(lat: number, lon: number, depth: number) {
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

export function xyz_to_quad(x: number, y: number, z: number) {
  const coord = xyz_to_coord(x, y, z);
  return get_quad_code(coord.lat, coord.lon, z);
}
