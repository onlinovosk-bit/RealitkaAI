import {
  NotSupportedError,
  type FutureParcelQuery,
  type GetMapLayerOptions,
  type ParcelInfo,
  type ParcelSource,
  type WmsLayerConfig,
} from "@/lib/cadastre/ParcelSource";

const PRIMARY_WMS_ENDPOINT = "https://inspirews.skgeodesy.sk/geoserver/cp/ows";
const PRIMARY_WMS_LAYER = "cp:CadastralParcel";
const FALLBACK_ARCGIS_ENDPOINT =
  "https://mpt.svp.sk/server/rest/services/kataster/kn_parcela_c/MapServer";

const FEATURE_INFO_TIMEOUT_MS = 3500;

function withTimeout(url: string, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, { signal: controller.signal }).finally(() => clearTimeout(timer));
}

function firstStringValue(record: Record<string, unknown>, patterns: RegExp[]): string | null {
  for (const [key, value] of Object.entries(record)) {
    if (!patterns.some((pattern) => pattern.test(key))) continue;
    if (typeof value !== "string") continue;
    const normalized = value.trim();
    if (normalized.length > 0) {
      return normalized;
    }
  }
  return null;
}

function firstNumberValue(record: Record<string, unknown>, patterns: RegExp[]): number | null {
  for (const [key, value] of Object.entries(record)) {
    if (!patterns.some((pattern) => pattern.test(key))) continue;
    const num = typeof value === "number" ? value : Number(value);
    if (Number.isFinite(num)) {
      return num;
    }
  }
  return null;
}

function buildWmsGetFeatureInfoUrl(lat: number, lng: number): string {
  const delta = 0.0005;
  const minLng = lng - delta;
  const minLat = lat - delta;
  const maxLng = lng + delta;
  const maxLat = lat + delta;
  const search = new URLSearchParams({
    service: "WMS",
    version: "1.3.0",
    request: "GetFeatureInfo",
    layers: PRIMARY_WMS_LAYER,
    query_layers: PRIMARY_WMS_LAYER,
    crs: "EPSG:4326",
    bbox: `${minLat},${minLng},${maxLat},${maxLng}`,
    width: "101",
    height: "101",
    i: "50",
    j: "50",
    info_format: "application/json",
    feature_count: "1",
  });
  return `${PRIMARY_WMS_ENDPOINT}?${search.toString()}`;
}

function parseWmsFeatureInfo(payload: unknown): ParcelInfo | null {
  if (!payload || typeof payload !== "object") return null;
  const obj = payload as { features?: Array<{ properties?: Record<string, unknown> }> };
  const props = obj.features?.[0]?.properties;
  if (!props) return null;

  const parcelNumber = firstStringValue(props, [/parcel/i, /reference/i, /cadastral/i]);
  if (!parcelNumber) return null;

  return {
    parcelNumber,
    areaM2: firstNumberValue(props, [/area/i, /vym/i, /mera/i]),
    cadastralUnit: firstStringValue(props, [/unit/i, /katas/i, /uzemi/i]),
  };
}

function buildArcgisIdentifyUrl(lat: number, lng: number): string {
  const delta = 0.002;
  const search = new URLSearchParams({
    f: "pjson",
    geometry: `${lng},${lat}`,
    geometryType: "esriGeometryPoint",
    sr: "4326",
    tolerance: "4",
    mapExtent: `${lng - delta},${lat - delta},${lng + delta},${lat + delta}`,
    imageDisplay: "1024,768,96",
    returnGeometry: "false",
  });
  return `${FALLBACK_ARCGIS_ENDPOINT}/identify?${search.toString()}`;
}

function parseArcgisIdentify(payload: unknown): ParcelInfo | null {
  if (!payload || typeof payload !== "object") return null;
  const obj = payload as { results?: Array<{ attributes?: Record<string, unknown> }> };
  const props = obj.results?.[0]?.attributes;
  if (!props) return null;

  const parcelNumber = firstStringValue(props, [/parcel/i, /parcela/i, /id/i]);
  if (!parcelNumber) return null;

  return {
    parcelNumber,
    areaM2: firstNumberValue(props, [/area/i, /vym/i, /mera/i]),
    cadastralUnit: firstStringValue(props, [/katas/i, /unit/i, /uzemi/i]),
  };
}

export class WmsParcelSource implements ParcelSource {
  getMapLayer(opts?: GetMapLayerOptions): WmsLayerConfig {
    if (opts?.useFallback) {
      return {
        sourceId: "cadastre-parcels-arcgis",
        layerId: "cadastre-parcels-arcgis-layer",
        sourceType: "arcgis",
        tileUrlTemplate:
          `${FALLBACK_ARCGIS_ENDPOINT}/export?bbox={bbox-epsg-3857}` +
          "&bboxSR=3857&imageSR=3857&size=256,256&transparent=true&format=png32&f=image",
        attribution: "UGKK INSPIRE / ArcGIS fallback",
      };
    }

    return {
      sourceId: "cadastre-parcels-wms",
      layerId: "cadastre-parcels-wms-layer",
      sourceType: "wms",
      tileUrlTemplate:
        `${PRIMARY_WMS_ENDPOINT}?service=WMS&request=GetMap&layers=${encodeURIComponent(PRIMARY_WMS_LAYER)}` +
        "&styles=&format=image/png&transparent=true&version=1.3.0&width=256&height=256&crs=EPSG:3857&bbox={bbox-epsg-3857}",
      attribution: "UGKK INSPIRE",
    };
  }

  async getParcelAtPoint(lat: number, lng: number): Promise<ParcelInfo | null> {
    const primaryUrl = buildWmsGetFeatureInfoUrl(lat, lng);
    try {
      const response = await withTimeout(primaryUrl, FEATURE_INFO_TIMEOUT_MS);
      if (response.ok) {
        const parsed = parseWmsFeatureInfo(await response.json());
        if (parsed) return parsed;
      }
    } catch {
      // Primary endpoint timeout/error should transparently continue to fallback.
    }

    const fallbackUrl = buildArcgisIdentifyUrl(lat, lng);
    try {
      const response = await withTimeout(fallbackUrl, FEATURE_INFO_TIMEOUT_MS);
      if (!response.ok) return null;
      return parseArcgisIdentify(await response.json());
    } catch {
      return null;
    }
  }

  async getParcelsForLead(_query: FutureParcelQuery): Promise<never> {
    throw new NotSupportedError(
      "WmsParcelSource is display-only. Lead parcel queries are reserved for PostGIS source.",
    );
  }
}
