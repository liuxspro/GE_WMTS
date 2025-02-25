import { assertEquals } from "@std/assert";
import { number_to_date } from "../src/history.ts";

Deno.test(function test_number_to_date() {
  // 以瓦片 18/214697/40742 为例
  // 四叉树编码为 0210230011023132002
  // qtree 信息存储在 0210230011023132 中
  // 该瓦片的所有历史日期如下
  // 与 Google Earth 位置（114.84213007, 34.04870002）下的历史时间轴对比
  // 545 不能计算
  // assertEquals(number_to_date(545), "2021-09-22");
  assertEquals(number_to_date(1030756), "2013-03-04");
  assertEquals(number_to_date(1032027), "2015-10-27");
  assertEquals(number_to_date(1032779), "2017-02-11");
  assertEquals(number_to_date(1033259), "2018-01-11");
  assertEquals(number_to_date(1033532), "2018-09-28");
  assertEquals(number_to_date(1033830), "2019-03-06");
  assertEquals(number_to_date(1034612), "2020-11-20");
  assertEquals(number_to_date(1035062), "2021-09-22");
  assertEquals(number_to_date(1036471), "2024-05-23");
  assertEquals(number_to_date(1036697), "2024-12-25");
  assertEquals(number_to_date(parseInt("fd199", 16)), "2024-12-25");
});
