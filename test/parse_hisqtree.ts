import { get_history_layer } from "../src/history.ts";
import { key } from "./utils.ts";
import { QuadKey } from "../src/quad.ts";

const quad_key = new QuadKey(214697, 40742, 18);

console.log(await get_history_layer(quad_key, 355, key));
