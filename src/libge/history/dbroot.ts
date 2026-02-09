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
