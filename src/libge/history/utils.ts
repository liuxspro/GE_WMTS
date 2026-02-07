export function number_to_date(date_number: number) {
  // 1. 将十六进制转换为二进制
  // const binary = parseInt(hex_str, 16).toString(2);
  const binary = date_number.toString(2);

  // 2. 分割二进制为年、月、日
  const yearBinary = binary.slice(0, 11); // 前 11 位
  const monthBinary = binary.slice(11, 15); // 中间 4 位
  const dayBinary = binary.slice(15); // 最后 5 位

  // 3. 将二进制转换为十进制
  const year = parseInt(yearBinary, 2);
  const month = parseInt(monthBinary, 2);
  const day = parseInt(dayBinary, 2);

  // 4. 返回日期字符串
  return `${year}-${month.toString().padStart(2, "0")}-${
    day
      .toString()
      .padStart(2, "0")
  }`;
}
