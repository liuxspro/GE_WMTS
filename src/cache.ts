export async function create_cache_dir() {
  try {
    await Deno.mkdir("Cache", { recursive: true });
  } catch (err) {
    if (err instanceof Deno.errors.AlreadyExists) {
      console.log("Cache 文件夹已存在");
    } else {
      console.error("发生错误:", err);
    }
  }
}

export async function create_qtree_dir(version: number) {
  try {
    await Deno.mkdir(`Cache/Qtrees/${version}`, { recursive: true });
  } catch (err) {
    if (err instanceof Deno.errors.AlreadyExists) {
      console.log(`Cache/Qtrees/${version} 文件夹已存在`);
    } else {
      console.error("发生错误:", err);
    }
  }
}
