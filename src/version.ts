import { get_version_and_key } from "./libge/dbroot.ts";
const kv = await Deno.openKv();

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
