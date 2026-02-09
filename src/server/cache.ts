import { get_tile_by_version, QuadKey } from "../libge/quad.ts";
import { get_qtree, parse_qtree } from "../libge/mod.ts";

const kv = await Deno.openKv(`${Deno.cwd()}/Cache/cache.db`);

export async function create_cache_dir() {
  try {
    await Deno.mkdir("Cache", { recursive: true });
    console.log(`[Init] [Cache] - Create Cache Dir`);
  } catch (err) {
    if (err instanceof Deno.errors.AlreadyExists) {
      console.log("Cache 文件夹已存在");
    } else {
      console.error("[Init] [Cache] - 发生错误:", err);
    }
  }
}

async function get_qtree_cache(
  quad_key: string,
  version: number,
  key?: Uint8Array,
) {
  let qtree_data: Uint8Array;
  // 检查kv中是否存在qtree缓存
  const entry = await kv.get(["Earth", version, quad_key]);
  if (entry.value) {
    qtree_data = entry.value as Uint8Array;
  } else {
    qtree_data = await get_qtree(quad_key, version, key);
    await kv.set(["Earth", version, quad_key], qtree_data);
  }
  return qtree_data;
}

export class QuadKeyCache extends QuadKey {
  override async get_tile(version: number, key?: Uint8Array) {
    const qtree_data = await get_qtree_cache(
      this.parent_quad_key,
      version,
      key,
    );
    // 瓦片信息存储在父级 qtree 中
    const tiles = parse_qtree(qtree_data, this.parent_quad_key);
    const tile_info = tiles[this.quad_key];
    if (tile_info != null) {
      const tile_version = tile_info.imagery_version;
      const tile_data = await get_tile_by_version(
        this.quad_key,
        tile_version,
        key,
      );
      return tile_data;
    } else {
      console.error(`${this.quad_key} 未找到 version 信息`);
    }
  }
}
