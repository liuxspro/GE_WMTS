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

export function get_default_key(): Uint8Array {
  const key_base64 =
    "AAAAAAAAAABF9L0LeeJqRSIFkiwXzQZx+EkQRmdRAEIlxuhhLGYpCMY03GpiJXkKdx1tadbwnGuTob1OdeBBBFvfQFYM2btym4F8EDNT7k9s1HEFsHvAf0UDVlqtd1VlCzOSKqwZbDUUxR0wc/gzPm1GOEq03fAu3Rd1FtqMRHQiBvphIgwzIlNvrzlEC4wOOdk5E0y5v3+rXIxQX58idXgf6QdxkWg7wcSbf/A8VnFIggUnVWZZTmUdmHWjYUZ9YT8VQQCfFAbXtDRNzhOHRrAa1QUcuIone4vcK7tNZzDI0fZcj1D6Wy9Gm241GC8nQy7rCgxeEAUQpXMbZTTlbC5qQydjFCNVqT9xe2dDfTqvzeJUVZz9S8biny8o7ctcxi1mB4inOy8YKiJODrBrLt0NlX19R7pDshGyKz5Nqj595s5JicbmeAxhMQUtAaRPpX5xIIjsDTHoTgsAblBofRc9CA0XlaZuo2iXJFtr8xcj87Zzsw0LQMCf2ARRXfoaFyIuFWrfSQC5oHdVxu8Qar97R0x/gxcF7tzcRoWprVMHK1M0Bgf/FJRZGQLkOOgxg065WEZryy0jhpJwADWIIs8xsiYv58N1LTYscnSwI0e309EmFoU3cuIAjETPENozLRreYIZpI2kqfM1LUQ2VVDl3LinqG6ZQomqPb1CZXD5U++9QWwsHRReJbSgTdzcd244eSgVmSm+ZIOVw4rlxfgxtSQQtev5yx/JZMI+7Al1z5ckg6njsIJDwin9CF3xHGWCwFr0mt3G2x58O0TOCPdOr7mOZyCtToERccQHGzEQfMk88ysApPVLTYRlYqX1ltNzPDfQ98QipQtojCdi/XlBJ+E3Ay0dMHE/3eyvYFhjFMZI7tW/cbA2SiBbRnts/4unaX9SE4kZhWt4cVc+kAL79zmfxSmkcl+YgSNhdf36ucSAOTq7AVqmRATyCHQ9y53bsKUnWXS2D49s2Bqk7ZhOXh2rVtj1QXlK5S8dzV3jJ9C5ZB5WTb9BLF1cZPicnx2DbO+2aDlNEFj4/jZJtd6IK6z9SqMZVXjFJN4X0xR8mLakcv4snVNrDaiDlKngEsNaQcHKqi2i9iPcCX0ixfsBYTD9mGvk+4WXAcKfPOGmv8FZsZEmcJ614dE/Ch95WOQDadwvLLRuJ+zVPAvUIURNgwQpaR00mHDMweNrAnEZH4lt5YEluN2dTCj7p7EY5svE0DcaEU3Vu4QxZ2R7eKYUQe0lJpXd5vklWLjbnCzq7TwNie9JNMZUvvTh7qE8h4exGcHaVfSkieIgKkN2dXNreGVHP8PxZUmV8MxPf80jauyp122CyAhXU/BntG+x/Naj/KDEHLRLI3IhGfIpbIg==";
  const binary = atob(key_base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}
