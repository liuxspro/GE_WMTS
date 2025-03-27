const kv = await Deno.openKv();

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

export async function _get_earth_version() {
  const entry = await kv.get(["Version", "Earth"]);
  if (entry.value) {
    return entry.value;
  } else {
    const { version } = await get_version_and_key();
    await kv.set(["Version", "Earth"], version);
    return version;
  }
}
