// some test code
import { get_history_layer, query_point } from "../src/history.ts";
import { key } from "./key.ts";
import { QuadKey } from "../src/quad.ts";

const quad_key = new QuadKey(27015, 5230, 15);

console.log(quad_key.quad_key);

// 0210203220030112

const layers = await get_history_layer(quad_key, 356, key);
console.log(layers);
// console.log(get_history_layer_dates(layers));

// 119.01479737140468&lat=&level=9
