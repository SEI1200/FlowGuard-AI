// ---------------------------------------------------------------------------
// FlowGuard AI - MapView3D
//
// Maps JavaScript API のベクター地図で 3D 表示（tilt / heading）。
// 会場ポリゴンとトラフィックレイヤーを表示。高さ・死角の把握に利用。
// ※ 3D 建物を表示するには Cloud Console で Vector 対応の Map ID が必要です。
// ---------------------------------------------------------------------------

import { useEffect, useMemo, useRef } from "react";
import Box from "@mui/material/Box";
import { APIProvider, Map, useMap, RenderingType } from "@vis.gl/react-google-maps";

import type { LatLng } from "../types";
import { RiskCategory } from "../types";
import type { MapTypeId } from "./RiskLayerControl";

type RiskItem = import("../types").RiskItem;

const DEFAULT_TILT = 47.5;
const DEFAULT_HEADING = 0;

// ---------------------------------------------------------------------------
// Polygon overlay（fitBounds は使わない＝tilt が 0 にリセットされるため）
// ---------------------------------------------------------------------------

function PolygonOverlay({ polygon }: { polygon: LatLng[] }) {
  const map = useMap();
  const polygonRef = useRef<google.maps.Polygon | null>(null);

  useEffect(() => {
    if (!map || polygon.length < 3) return;

    polygonRef.current?.setMap(null);
    const poly = new google.maps.Polygon({
      paths: polygon.map((p) => new google.maps.LatLng(p.lat, p.lng)),
      fillColor: "#1A237E",
      fillOpacity: 0.08,
      strokeColor: "#FFFFFF",
      strokeWeight: 4,
      strokeOpacity: 1,
      map,
      clickable: false,
      zIndex: 1,
    });
    polygonRef.current = poly;

    return () => {
      poly.setMap(null);
      polygonRef.current = null;
    };
  }, [map, polygon]);

  return null;
}

// ---------------------------------------------------------------------------
// Traffic layer
// ---------------------------------------------------------------------------

function TrafficLayerOverlay({ visible }: { visible: boolean }) {
  const map = useMap();
  const ref = useRef<google.maps.TrafficLayer | null>(null);

  useEffect(() => {
    if (!map) return;
    if (!ref.current) ref.current = new google.maps.TrafficLayer();
    ref.current.setMap(visible ? map : null);
    return () => {
      ref.current?.setMap(null);
    };
  }, [map, visible]);

  return null;
}

// ---------------------------------------------------------------------------
// MapView3D
// ---------------------------------------------------------------------------

export interface MapView3DProps {
  apiKey: string;
  polygon: LatLng[];
  risks?: RiskItem[];
  visibleCategories: Set<RiskCategory>;
  selectedRiskId?: string | null;
  onSelectRisk?: (id: string) => void;
  /** 地図の表示: roadmap / satellite / hybrid */
  mapTypeId?: MapTypeId;
  /** Vector 地図の Map ID（3D 建物表示用）。未指定時は .env の VITE_GOOGLE_MAP_ID。 */
  mapId?: string;
}

function getMapIdFromEnv(): string | undefined {
  if (typeof import.meta === "undefined") return undefined;
  const env = (import.meta as { env?: Record<string, string> }).env;
  if (!env) return undefined;
  const v = env.VITE_GOOGLE_MAP_ID || env.VITE_GOOGLE_MAPS_MAP_ID;
  return (v && v.trim()) || undefined;
}

export default function MapView3D({
  apiKey,
  polygon,
  visibleCategories,
  mapTypeId = "roadmap",
  mapId: mapIdProp,
}: MapView3DProps) {
  const mapId = (mapIdProp && mapIdProp.trim()) || getMapIdFromEnv() || "flowguard-dashboard-map";

  const center = useMemo(
    () =>
      polygon.length > 0
        ? {
            lat: polygon.reduce((s, p) => s + p.lat, 0) / polygon.length,
            lng: polygon.reduce((s, p) => s + p.lng, 0) / polygon.length,
          }
        : { lat: 35.6812, lng: 139.7671 },
    [polygon],
  );

  const showTraffic = visibleCategories.has(RiskCategory.TRAFFIC_LOGISTICS);

  // 3D はベクター地図のみ対応。satellite/hybrid だと白画面になるため roadmap に固定
  const effectiveMapTypeId: MapTypeId = "roadmap";

  return (
    <Box sx={{ width: "100%", height: "100%", minHeight: 0 }}>
      <APIProvider apiKey={apiKey}>
        <Map
          defaultCenter={center}
          defaultZoom={17}
          defaultTilt={DEFAULT_TILT}
          defaultHeading={DEFAULT_HEADING}
          mapTypeId={effectiveMapTypeId}
          renderingType={RenderingType.VECTOR}
          gestureHandling="greedy"
          headingInteractionEnabled={true}
          tiltInteractionEnabled={true}
          disableDefaultUI={false}
          mapTypeControl={false}
          streetViewControl={false}
          fullscreenControl={true}
          zoomControl={true}
          style={{ width: "100%", height: "100%" }}
          mapId={mapId}
        >
          <PolygonOverlay polygon={polygon} />
          <TrafficLayerOverlay visible={showTraffic} />
        </Map>
      </APIProvider>
    </Box>
  );
}
