export type ParcelInfo = {
  parcelNumber: string;
  areaM2: number | null;
  cadastralUnit: string | null;
};

export type WmsLayerConfig = {
  sourceId: string;
  layerId: string;
  sourceType: "wms" | "arcgis";
  tileUrlTemplate: string;
  attribution: string;
};

export type GetMapLayerOptions = {
  useFallback?: boolean;
};

export type FutureParcelQuery = {
  leadId: string;
};

export class NotSupportedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NotSupportedError";
  }
}

export interface ParcelSource {
  getMapLayer(opts?: GetMapLayerOptions): WmsLayerConfig;
  getParcelAtPoint(lat: number, lng: number): Promise<ParcelInfo | null>;
  getParcelsForLead(_query: FutureParcelQuery): Promise<never>;
}
