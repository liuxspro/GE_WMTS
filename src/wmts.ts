import {
  default_matrix,
  Service,
  generate_capabilities,
  generate_crs84_tile_matrixs,
  MapLayer,
  mercator_bbox,
  TileMatrixSet,
} from "@liuxspro/capgen";

const service: Service = {
  title: "Google Earth",
  abstract: "G",
  keywords: ["Google Earth"],
};

export function create_ge_layer(url: string) {
  return new MapLayer(
    "Google Earth",
    "Google Earth",
    "GoogleEarthLatest",
    mercator_bbox,
    "WorldCRS84Quad",
    url
  );
}

const ge_matrix: TileMatrixSet = {
  ...default_matrix.WorldCRS84Quad,
  tile_matrixs: generate_crs84_tile_matrixs(2, 21),
};

export function create_cap(url: string) {
  return generate_capabilities(service, [create_ge_layer(url)], [ge_matrix]);
}
