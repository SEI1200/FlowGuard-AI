// ---------------------------------------------------------------------------
// FlowGuard AI - Cesium 3D View
//
// Google Photorealistic 3D Tiles を Cesium 公式 API で読み込み、
// 会場周辺のみ軽量に表示します（高さ・死角リスクの可視化）。
// ---------------------------------------------------------------------------

import { useEffect, useRef } from "react";
import Box from "@mui/material/Box";

import type { LatLng, RiskItem } from "../types";
import { RiskCategory } from "../types";

declare const CESIUM_BASE_URL: string;
if (typeof window !== "undefined") {
  (window as unknown as { CESIUM_BASE_URL?: string }).CESIUM_BASE_URL =
    typeof CESIUM_BASE_URL !== "undefined" ? CESIUM_BASE_URL : "/cesiumStatic";
}

interface Cesium3DViewProps {
  apiKey: string;
  polygon: LatLng[];
  risks: RiskItem[];
  visibleCategories: Set<RiskCategory>;
}

const BUFFER_DEGREES = 500 / 111320;

interface CesiumViewerLike {
  scene: {
    globe: { show: boolean };
    primitives: { add: (t: unknown) => void };
    camera: { flyToBoundingSphere: (s: unknown, o?: Record<string, unknown>) => void };
  };
}

interface CesiumViewerDestroyable {
  destroy?: () => void;
}

export default function Cesium3DView({
  apiKey,
  polygon,
  risks,
  visibleCategories,
}: Cesium3DViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<unknown>(null);

  useEffect(() => {
    if (!containerRef.current || !polygon.length) return;

    let mounted = true;
    let viewer: unknown = null;

    const init = async () => {
      const Cesium = await import("cesium");
      import("cesium/Build/Cesium/Widgets/widgets.css");

      if (!mounted || !containerRef.current) return;

      // 公式推奨: Google API キーを Cesium に渡す
      Cesium.GoogleMaps.defaultApiKey = apiKey;

      const viewerOpts: Record<string, unknown> = {
        container: containerRef.current,
        globe: false,
        imageryProvider: false,
        baseLayerPicker: false,
        geocoder: false,
        animation: false,
        timeline: false,
        fullscreenButton: false,
        vrButton: false,
        sceneModePicker: false,
        navigationHelpButton: false,
        homeButton: true,
        scene3DOnly: true,
        requestRenderMode: false,
        maximumRenderTimeChange: Infinity,
      };

      viewer = new Cesium.Viewer(containerRef.current, viewerOpts);
      viewerRef.current = viewer;

      const v = viewer as CesiumViewerLike;
      const scene = v.scene;

      // 会場の BoundingSphere（カメラ用）
      const flat = polygon.flatMap((p) => [p.lng, p.lat, 0]);
      const positions = Cesium.Cartesian3.fromDegreesArrayHeights(flat);
      const boundingSphere = Cesium.BoundingSphere.fromPoints(positions);
      boundingSphere.radius = Math.max(boundingSphere.radius, 150);
      const camOffset = new Cesium.HeadingPitchRange(0, -0.35, Math.max(boundingSphere.radius * 2.5, 280));

      // 最初の1フレームから会場を表示（地球を見せない）
      (scene.camera as { flyToBoundingSphere: (s: unknown, o?: Record<string, unknown>) => void }).flyToBoundingSphere(boundingSphere, {
        duration: 0,
        offset: camOffset,
      });

      // 会場＋500m の矩形（カメラ制限用）
      const lngs = polygon.map((p) => p.lng);
      const lats = polygon.map((p) => p.lat);
      const minLng = Math.min(...lngs);
      const maxLng = Math.max(...lngs);
      const minLat = Math.min(...lats);
      const maxLat = Math.max(...lats);
      const centerLat = (minLat + maxLat) / 2;
      const latRad = (centerLat * Math.PI) / 180;
      const bufferLng = BUFFER_DEGREES / Math.max(0.01, Math.cos(latRad));
      const limitRect = {
        west: ((minLng - bufferLng) * Math.PI) / 180,
        south: ((minLat - BUFFER_DEGREES) * Math.PI) / 180,
        east: ((maxLng + bufferLng) * Math.PI) / 180,
        north: ((maxLat + BUFFER_DEGREES) * Math.PI) / 180,
      };

      // 公式 API で Photorealistic 3D Tiles を読み込み（表示・負荷の最適化付き）
      try {
        const tileset = await Cesium.createGooglePhotorealistic3DTileset(
          { key: apiKey, onlyUsingWithGoogleGeocoder: true },
          {
            showCreditsOnScreen: true,
            maximumScreenSpaceError: 16,
            skipLevelOfDetail: true,
            baseScreenSpaceError: 512,
            skipScreenSpaceErrorFactor: 16,
            skipLevels: 1,
            immediatelyLoadDesiredLevelOfDetail: true,
            cacheBytes: 384 * 1024 * 1024,
            maximumCacheOverflowBytes: 256 * 1024 * 1024,
          },
        );
        scene.primitives.add(tileset);
      } catch (e) {
        console.warn("Google Photorealistic 3D Tiles failed:", e);
      }

      // カメラを会場＋500m 内に制限
      const sceneWithCam = scene as {
        camera: { position: unknown; setView: (opts: { destination: unknown }) => void };
        postRender: { addEventListener: (cb: () => void) => () => void };
      };
      const clampCamera = () => {
        const carto = Cesium.Ellipsoid.WGS84.cartesianToCartographic(sceneWithCam.camera.position as { x: number; y: number; z: number });
        let lon = carto.longitude;
        let lat = carto.latitude;
        let height = carto.height;
        const lonClamp = Math.max(limitRect.west, Math.min(limitRect.east, lon));
        const latClamp = Math.max(limitRect.south, Math.min(limitRect.north, lat));
        const heightClamp = Math.max(20, Math.min(2000, height));
        if (lon !== lonClamp || lat !== latClamp || height !== heightClamp) {
          sceneWithCam.camera.setView({
            destination: Cesium.Cartesian3.fromRadians(lonClamp, latClamp, heightClamp),
          });
        }
      };
      const removePostRender = sceneWithCam.postRender.addEventListener(clampCamera);
      (viewer as { _limitCleanup?: () => void })._limitCleanup = removePostRender;

      // タイル追加後に視点を少し整える
      (scene.camera as { flyToBoundingSphere: (s: unknown, o?: Record<string, unknown>) => void }).flyToBoundingSphere(boundingSphere, {
        duration: 0.3,
        offset: camOffset,
      });
    };

    init();
    return () => {
      mounted = false;
      const vc = viewerRef.current as CesiumViewerDestroyable & { _limitCleanup?: () => void };
      if (vc?._limitCleanup) vc._limitCleanup();
      if (vc && typeof vc.destroy === "function") {
        vc.destroy();
        viewerRef.current = null;
      }
    };
  }, [apiKey, polygon]);

  // Add visibility-risk entities when viewer and risks are ready
  useEffect(() => {
    const v = viewerRef.current as { entities?: { add: (e: unknown) => unknown; removeAll: () => void } } | null;
    if (!v?.entities) return;

    const visibilityRisks = risks.filter(
      (r) => r.category === RiskCategory.VISIBILITY && visibleCategories.has(RiskCategory.VISIBILITY),
    );

    const run = async () => {
      const Cesium = await import("cesium");
      const { RISK_CATEGORY_COLORS } = await import("../types");
      v.entities?.removeAll();
      const color = RISK_CATEGORY_COLORS[RiskCategory.VISIBILITY];
      visibilityRisks.forEach((risk) => {
        const lon = risk.location.center.lng;
        const lat = risk.location.center.lat;
        v.entities?.add({
          position: Cesium.Cartesian3.fromDegrees(lon, lat, 5),
          point: {
            pixelSize: 14,
            color: Cesium.Color.fromCssColorString(color),
            outlineColor: Cesium.Color.WHITE,
            outlineWidth: 2,
          },
          label: {
            text: risk.title,
            font: "12px sans-serif",
            fillColor: Cesium.Color.WHITE,
            outlineColor: Cesium.Color.BLACK,
            outlineWidth: 2,
            style: Cesium.LabelStyle.FILL_AND_OUTLINE,
            verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
            pixelOffset: new Cesium.Cartesian2(0, -12),
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
          },
        } as unknown);
      });
    };
    run();
  }, [risks, visibleCategories]);

  return (
    <Box
      ref={containerRef}
      sx={{
        width: "100%",
        height: "100%",
        minHeight: 0,
        "& .cesium-viewer": { width: "100%", height: "100%" },
        "& .cesium-widget": { width: "100%", height: "100%" },
      }}
    />
  );
}
