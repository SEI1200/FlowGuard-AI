// ---------------------------------------------------------------------------
// FlowGuard AI - MapView Component
//
// Shows event area polygon and traffic layer. Risk category filters
// control which risks are shown in the list; map shows polygon only.
// Performance: fitBounds only on initial load; throttle tilt lock; stable pins.
// ---------------------------------------------------------------------------

import { memo, useCallback, useEffect, useMemo, useRef } from "react";
import Box from "@mui/material/Box";
import { APIProvider, Map, useMap } from "@vis.gl/react-google-maps";

import type { LatLng, MapPin } from "../types";
import { RiskCategory } from "../types";
import type { PinTypeId } from "../utils/pins";
import type { MapTypeId } from "./RiskLayerControl";
import type { MapTodo } from "../services/firebase";

type RiskItem = import("../types").RiskItem;

function polygonSignature(polygon: LatLng[]): string {
  if (polygon.length < 3) return "";
  return polygon.map((p) => `${p.lat},${p.lng}`).join("|");
}

// ---------------------------------------------------------------------------
// Polygon overlay (event area boundary). FitBounds only once per polygon to avoid fighting zoom.
// ---------------------------------------------------------------------------

function PolygonOverlay({ polygon }: { polygon: LatLng[] }) {
  const map = useMap();
  const ref = useRef<google.maps.Polygon | null>(null);
  const fittedSignatureRef = useRef<string>("");

  useEffect(() => {
    if (!map) return;
    ref.current?.setMap(null);

    if (polygon.length >= 3) {
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
      ref.current = poly;

      const sig = polygonSignature(polygon);
      if (fittedSignatureRef.current !== sig) {
        fittedSignatureRef.current = sig;
        const bounds = new google.maps.LatLngBounds();
        polygon.forEach((p) => bounds.extend({ lat: p.lat, lng: p.lng }));
        map.fitBounds(bounds, 60);
      }
    } else {
      fittedSignatureRef.current = "";
    }

    return () => {
      ref.current?.setMap(null);
      ref.current = null;
    };
  }, [map, polygon]);

  return null;
}

// ---------------------------------------------------------------------------
// Google Maps Traffic Layer (real-time traffic on roads)
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

// 航空写真・ラベル付き時に拡大で tilt が付かないよう 0 に強制（スロットルでズーム中の負荷を軽減）
function TiltLockOverlay({ force2D }: { force2D: boolean }) {
  const map = useMap();
  const rafRef = useRef<number | null>(null);
  const pendingRef = useRef(false);
  useEffect(() => {
    if (!map || !force2D) return;
    const applyTiltZero = () => {
      if (map.getTilt?.() !== 0) map.setTilt?.(0);
      pendingRef.current = false;
      rafRef.current = null;
    };
    const forceTiltZero = () => {
      if (pendingRef.current) return;
      pendingRef.current = true;
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(applyTiltZero);
    };
    forceTiltZero();
    const listener = map.addListener?.("tilt_changed", forceTiltZero);
    return () => {
      listener?.remove?.();
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      pendingRef.current = false;
    };
  }, [map, force2D]);
  return null;
}

/** 地図（ラベルなし）選択時にラベルを非表示にするスタイル */
const MAP_STYLES_HIDE_LABELS: google.maps.MapTypeStyle[] = [
  { featureType: "all", elementType: "labels", stylers: [{ visibility: "off" }] },
  { featureType: "all", elementType: "labels.icon", stylers: [{ visibility: "off" }] },
];

/** ラベルなしのときのみスタイルを適用（mapId 使用時は styles を設定できないため、hideLabels 時は mapId を外している） */
function MapLabelsOverlay({ hideLabels }: { hideLabels: boolean }) {
  const map = useMap();
  useEffect(() => {
    if (!map) return;
    if (hideLabels) {
      map.setOptions?.({ styles: MAP_STYLES_HIDE_LABELS });
      return () => {
        map.setOptions?.({ styles: [] });
      };
    }
    return undefined;
  }, [map, hideLabels]);
  return null;
}

/** ピン追加モード時のみマップクリックを発火 */
function MapClickForPinOverlay({
  active,
  onMapClick,
}: {
  active: boolean;
  onMapClick?: (lat: number, lng: number) => void;
}) {
  const map = useMap();
  useEffect(() => {
    if (!map || !active || !onMapClick) return;
    const listener = map.addListener("click", (e: google.maps.MapMouseEvent) => {
      const latLng = e.latLng;
      if (latLng) onMapClick(latLng.lat(), latLng.lng());
    });
    return () => listener.remove();
  }, [map, active, onMapClick]);
  return null;
}

/** 地図To-Do追加モード時のみマップクリックを発火（「ここを直す」用） */
function MapClickForMapTodoOverlay({
  active,
  onMapClick,
}: {
  active: boolean;
  onMapClick?: (lat: number, lng: number) => void;
}) {
  const map = useMap();
  useEffect(() => {
    if (!map || !active || !onMapClick) return;
    const listener = map.addListener("click", (e: google.maps.MapMouseEvent) => {
      const latLng = e.latLng;
      if (latLng) onMapClick(latLng.lat(), latLng.lng());
    });
    return () => listener.remove();
  }, [map, active, onMapClick]);
  return null;
}

/** 種別ごとの色（マーカー用）。utils/pins の PIN_TYPE_IDS と対応。 */
const PIN_TYPE_COLORS: Record<PinTypeId | string, string> = {
  security: "#1976d2",
  danger: "#d32f2f",
  caution: "#ed6c02",
  guidance: "#2e7d32",
  other: "#757575",
};

/** SVG path（-1..1 座標）: 上向き三角（危険・警告） */
const PATH_TRIANGLE_UP = "M 0,-1 L 1,1 L -1,1 Z";
/** 四角（警備・拠点） */
const PATH_SQUARE = "M -1,-1 L 1,-1 L 1,1 L -1,1 Z";
/** ひし形（注意） */
const PATH_DIAMOND = "M 0,-1 L 1,0 L 0,1 L -1,0 Z";

function getPinColor(type: string): string {
  return PIN_TYPE_COLORS[type] ?? PIN_TYPE_COLORS.other;
}

/** 種別ごとのマーカー形状（一目で種類が分かるように）。 */
function getPinIcon(type: string): google.maps.Symbol {
  const color = getPinColor(type);
  const stroke = "#ffffff";
  const scale = 10;
  switch (type) {
    case "security":
      return { path: PATH_SQUARE, scale, fillColor: color, fillOpacity: 1, strokeColor: stroke, strokeWeight: 2 };
    case "danger":
      return { path: PATH_TRIANGLE_UP, scale, fillColor: color, fillOpacity: 1, strokeColor: stroke, strokeWeight: 2 };
    case "caution":
      return { path: PATH_DIAMOND, scale, fillColor: color, fillOpacity: 1, strokeColor: stroke, strokeWeight: 2 };
    case "guidance":
      return {
        path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
        scale: 5,
        fillColor: color,
        fillOpacity: 1,
        strokeColor: stroke,
        strokeWeight: 2,
      };
    default:
      return {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 12,
        fillColor: color,
        fillOpacity: 1,
        strokeColor: stroke,
        strokeWeight: 2,
      };
  }
}

function pinsEqual(a: MapPin[], b: MapPin[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    const p = a[i];
    const q = b[i];
    if (p.id !== q.id || p.lat !== q.lat || p.lng !== q.lng || p.type !== q.type) return false;
  }
  return true;
}

/** ユーザー追加ピンのマーカー表示（種別ごとに色分け）。同一データ時は再作成しない。 */
function PinsOverlay({
  pins,
  onPinSelect,
}: {
  pins: MapPin[];
  onPinSelect?: (pin: MapPin) => void;
}) {
  const map = useMap();
  const markersRef = useRef<google.maps.Marker[]>([]);
  const prevPinsRef = useRef<MapPin[]>([]);
  const prevOnPinSelectRef = useRef<((pin: MapPin) => void) | undefined>(undefined);

  useEffect(() => {
    if (!map) return;

    const pinsUnchanged = pinsEqual(pins, prevPinsRef.current);
    const callbackUnchanged = prevOnPinSelectRef.current === onPinSelect;
    const canSkip =
      pins.length > 0 &&
      pinsUnchanged &&
      callbackUnchanged &&
      markersRef.current.length === pins.length;
    if (canSkip) return;

    prevPinsRef.current = pins;
    prevOnPinSelectRef.current = onPinSelect;

    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];

    if (!pins.length) return;

    const newMarkers = pins.map((pin) => {
      const marker = new google.maps.Marker({
        position: { lat: pin.lat, lng: pin.lng },
        map,
        title: [pin.name, pin.memo].filter(Boolean).join(" — ").slice(0, 100),
        zIndex: 10,
        icon: getPinIcon(pin.type),
      });
      if (onPinSelect) {
        marker.addListener("click", () => onPinSelect(pin));
      }
      return marker;
    });
    markersRef.current = newMarkers;

    return () => {
      newMarkers.forEach((m) => m.setMap(null));
      markersRef.current = [];
    };
  }, [map, pins, onPinSelect]);

  return null;
}

/** 地図To-Do用マーカー用のアイコン（google は API 読み込み後のみ参照するため関数内で生成） */
function getMapTodoIcon(done: boolean): google.maps.Symbol {
  return {
    path: google.maps.SymbolPath.CIRCLE,
    scale: 14,
    fillColor: done ? "#2e7d32" : "#ed6c02",
    fillOpacity: 1,
    strokeColor: "#fff",
    strokeWeight: 2,
  };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function MapTodosOverlay({
  mapTodos,
  todoChecks,
  onDeleteMapTodo,
  deleteLabel,
}: {
  mapTodos: MapTodo[];
  todoChecks: Record<string, boolean>;
  onDeleteMapTodo?: (taskId: string) => Promise<void>;
  deleteLabel?: string;
}) {
  const map = useMap();
  const markersRef = useRef<google.maps.Marker[]>([]);
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);

  useEffect(() => {
    if (!map || typeof google === "undefined") return;

    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];
    if (infoWindowRef.current) {
      infoWindowRef.current.close();
      infoWindowRef.current = null;
    }

    if (!mapTodos.length) return;

    const infoWindow = new google.maps.InfoWindow();
    infoWindowRef.current = infoWindow;

    const newMarkers = mapTodos.map((todo) => {
      const done = Boolean(todoChecks[todo.taskId]);
      const marker = new google.maps.Marker({
        position: { lat: todo.lat, lng: todo.lng },
        map,
        title: todo.title,
        zIndex: 15,
        icon: getMapTodoIcon(done),
      });

      if (onDeleteMapTodo) {
        marker.addListener("click", () => {
          const taskId = todo.taskId;
          const titleEscaped = escapeHtml(todo.title || "");
          const content = document.createElement("div");
          content.style.padding = "4px 0";
          content.innerHTML = `<div style="margin-bottom:8px;font-size:13px;">${titleEscaped}</div><button type="button" data-task-id="${escapeHtml(taskId)}" style="font-size:12px;padding:4px 10px;cursor:pointer;background:#d32f2f;color:#fff;border:none;border-radius:4px;">${escapeHtml(deleteLabel ?? "Delete")}</button>`;
          const btn = content.querySelector("button[data-task-id]");
          if (btn) {
            btn.addEventListener("click", () => {
              onDeleteMapTodo(taskId).catch(() => {});
              infoWindow.close();
            });
          }
          infoWindow.setContent(content);
          infoWindow.open(map, marker);
        });
      }

      return marker;
    });
    markersRef.current = newMarkers;

    return () => {
      infoWindow.close();
      infoWindowRef.current = null;
      newMarkers.forEach((m) => m.setMap(null));
      markersRef.current = [];
    };
  }, [map, mapTodos, todoChecks, onDeleteMapTodo, deleteLabel]);

  return null;
}

// ---------------------------------------------------------------------------
// Main MapView component
// ---------------------------------------------------------------------------

interface MapViewProps {
  apiKey: string;
  risks: RiskItem[];
  visibleCategories: Set<RiskCategory>;
  selectedRiskId: string | null;
  onSelectRisk: (id: string) => void;
  polygon: LatLng[];
  mapTypeId?: MapTypeId;
  /** ユーザー追加ピン（共有コード単位で同期） */
  pins?: MapPin[];
  /** ピン追加モード ON 時にマップクリックで追加 */
  pinAddMode?: boolean;
  onMapClickForPin?: (lat: number, lng: number) => void;
  onPinSelect?: (pin: MapPin) => void;
  /** 地図上の「ここを直す」To-Do 一覧 */
  mapTodos?: MapTodo[];
  /** To-Do の完了状態（taskId -> チェック済み） */
  todoChecks?: Record<string, boolean>;
  /** 地図To-Do追加モード ON 時にマップクリックで追加 */
  mapTodoAddMode?: boolean;
  onMapClickForMapTodo?: (lat: number, lng: number) => void;
  /** 地図To-Doを削除（参加中のみ。指定時はマーカークリックで削除UI表示） */
  onDeleteMapTodo?: (taskId: string) => Promise<void>;
  /** 地図To-Doの削除ボタンラベル（locale用） */
  deleteMapTodoLabel?: string;
}

function MapView({
  apiKey,
  visibleCategories,
  polygon,
  mapTypeId = "roadmap",
  pins = [],
  pinAddMode = false,
  onMapClickForPin,
  onPinSelect,
  mapTodos = [],
  todoChecks = {},
  mapTodoAddMode = false,
  onMapClickForMapTodo,
  onDeleteMapTodo,
  deleteMapTodoLabel,
}: MapViewProps) {
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
  const force2D = mapTypeId === "satellite" || mapTypeId === "hybrid";
  const effectiveMapTypeId = mapTypeId === "roadmap_no_labels" ? "roadmap" : mapTypeId;
  const hideLabels = mapTypeId === "roadmap_no_labels";
  // mapId ありだとベクター地図になり setOptions({ styles }) が効かないため、
  // ラベルなしのときは mapId を外して従来地図でスタイルを適用する
  const mapId = hideLabels ? undefined : "flowguard-dashboard-map";

  return (
    <Box
      sx={{
        width: "100%",
        height: "100%",
        minHeight: 0,
        isolation: "isolate",
        transform: "translateZ(0)",
        willChange: "transform",
      }}
    >
      <APIProvider apiKey={apiKey}>
        <Map
          defaultCenter={center}
          defaultZoom={15}
          mapTypeId={effectiveMapTypeId}
          tilt={force2D ? 0 : undefined}
          gestureHandling="greedy"
          disableDefaultUI={false}
          mapTypeControl={false}
          streetViewControl={false}
          fullscreenControl={true}
          zoomControl={true}
          style={{ width: "100%", height: "100%" }}
          {...(mapId != null ? { mapId } : {})}
        >
          <PolygonOverlay polygon={polygon} />
          <TrafficLayerOverlay visible={showTraffic} />
          <TiltLockOverlay force2D={force2D} />
          <MapLabelsOverlay hideLabels={hideLabels} />
          <MapClickForPinOverlay active={pinAddMode} onMapClick={onMapClickForPin} />
          <MapClickForMapTodoOverlay active={mapTodoAddMode} onMapClick={onMapClickForMapTodo} />
          <PinsOverlay pins={pins} onPinSelect={onPinSelect} />
          <MapTodosOverlay
            mapTodos={mapTodos}
            todoChecks={todoChecks}
            onDeleteMapTodo={onDeleteMapTodo}
            deleteLabel={deleteMapTodoLabel}
          />
        </Map>
      </APIProvider>
    </Box>
  );
}

export default memo(MapView);
