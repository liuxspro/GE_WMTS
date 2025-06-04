import {
  Capabilities,
  GeoPoint,
  MapLayer,
  mercator_bbox,
  Service,
  world_crs84_quad,
} from "@liuxspro/capgen";

const service: Service = {
  title: "Google Earth",
  abstract: "Google Earth Tile As WMTS",
  keywords: ["Google Earth"],
};

export function create_ge_cap(url: string) {
  const ge_layer = new MapLayer(
    "Google Earth",
    "Google Earth",
    "GoogleEarthLatest",
    mercator_bbox,
    world_crs84_quad.clone().setZoom(2, 20),
    url,
    "image/jpeg",
  );
  return new Capabilities(service, [ge_layer]).xml;
}

export function create_ge_his_cap(bbox: [GeoPoint, GeoPoint], url: string) {
  const layer = new MapLayer(
    "Google Earth Historical",
    "Google Earth Historical",
    "GoogleEarthHistorical",
    bbox,
    world_crs84_quad.clone().setZoom(2, 20),
    url,
    "image/jpeg",
  );
  return new Capabilities(
    service,
    [layer],
  ).xml;
}
