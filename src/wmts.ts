import {
  default_matrix,
  generate_capabilities,
  generate_crs84_tile_matrixs,
  GeoPoint,
  MapLayer,
  mercator_bbox,
  Service,
  TileMatrixSet,
} from "@liuxspro/capgen";

const service: Service = {
  title: "Google Earth",
  abstract: "Google Earth",
  keywords: ["Google Earth"],
};

const ge_matrix: TileMatrixSet = {
  ...default_matrix.WorldCRS84Quad,
  tile_matrixs: generate_crs84_tile_matrixs(2, 20),
};

export function create_ge_cap(url: string) {
  const ge_layer = new MapLayer(
    "Google Earth",
    "Google Earth",
    "GoogleEarthLatest",
    mercator_bbox,
    "WorldCRS84Quad",
    url
  );
  return generate_capabilities(service, [ge_layer], [ge_matrix]);
}

export function create_ge_his_cap(bbox: [GeoPoint, GeoPoint], url: string) {
  const layer = new MapLayer(
    "Google Earth Historical",
    "Google Earth Historical",
    "GoogleEarthHistorical",
    bbox,
    "WorldCRS84Quad",
    url
  );
  return generate_capabilities(
    service,
    [layer],
    [default_matrix.WorldCRS84Quad]
  );
}
