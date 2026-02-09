/**
 * 请求 qtree(历史模式) 数据
 * @param {string} quad_key 完整的四叉树编码
 * @param {number} version 当前版本
 * @returns {Promise<Uint8Array>} 原始 qtree packet 数据
 */
export async function fetch_his_qtree_rawdata(
  quad_key: string,
  version: number,
): Promise<Uint8Array> {
  const his_qtree_url =
    `https://khmdb.google.com/flatfile?db=tm&qp-${quad_key}-q.${version}`;
  const data = await (await fetch(his_qtree_url)).bytes();
  return data;
}
