import { useCallback, useEffect, useRef, useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import Paper from "@mui/material/Paper";
import Chip from "@mui/material/Chip";
import Stack from "@mui/material/Stack";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import {
  APIProvider,
  Map,
  useMap,
  type MapMouseEvent,
} from "@vis.gl/react-google-maps";

import type { LatLng } from "../types";
import { useLanguage } from "../i18n/LanguageContext";

function TiltLockOverlay() {
  const map = useMap();
  const rafRef = useRef<number | null>(null);
  const pendingRef = useRef(false);
  useEffect(() => {
    if (!map) return;
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
  }, [map]);
  return null;
}

function GeocodingEffect({ query }: { query?: string }) {
  const map = useMap();
  const geocodedRef = useRef(false);

  useEffect(() => {
    if (!map || !query || geocodedRef.current) return;

    const geocoder = new google.maps.Geocoder();
    geocoder.geocode({ address: query }, (results, status) => {
      if (status === google.maps.GeocoderStatus.OK && results && results[0]) {
        const loc = results[0].geometry.location;
        map.panTo(loc);
        map.setZoom(16);
        geocodedRef.current = true;
      }
    });
  }, [map, query]);

  return null;
}

interface DrawingLayerProps {
  vertices: LatLng[];
  completed: boolean;
  onVertexMove?: (index: number, lat: number, lng: number) => void;
}

function DrawingLayer({ vertices, completed, onVertexMove }: DrawingLayerProps) {
  const map = useMap();
  const overlaysRef = useRef<(google.maps.Marker | google.maps.Polyline | google.maps.Polygon)[]>([]);
  const onVertexMoveRef = useRef(onVertexMove);
  onVertexMoveRef.current = onVertexMove;

  useEffect(() => {
    if (!map) return;

    overlaysRef.current.forEach((o) => o.setMap(null));
    overlaysRef.current = [];

    if (vertices.length === 0) return;

    const path = vertices.map((v) => new google.maps.LatLng(v.lat, v.lng));

    vertices.forEach((v, i) => {
      const marker = new google.maps.Marker({
        position: { lat: v.lat, lng: v.lng },
        map,
        draggable: true,
        cursor: "move",
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 10,
          fillColor: "#1A237E",
          fillOpacity: 1,
          strokeColor: "#FFFFFF",
          strokeWeight: 2,
        },
        zIndex: 20,
      });
      marker.addListener("dragend", () => {
        const pos = marker.getPosition();
        if (pos && onVertexMoveRef.current) {
          onVertexMoveRef.current(i, pos.lat(), pos.lng());
        }
      });
      overlaysRef.current.push(marker);
    });

    if (completed && vertices.length >= 3) {
      const polygon = new google.maps.Polygon({
        paths: path,
        fillColor: "#1A237E",
        fillOpacity: 0.12,
        strokeColor: "#1A237E",
        strokeWeight: 2,
        strokeOpacity: 0.9,
        map,
        clickable: false,
      });
      overlaysRef.current.push(polygon);
    } else if (vertices.length >= 2) {
      const polyline = new google.maps.Polyline({
        path,
        strokeColor: "#1A237E",
        strokeWeight: 2,
        strokeOpacity: 0.8,
        map,
        clickable: false,
      });
      overlaysRef.current.push(polyline);
    }

    return () => {
      overlaysRef.current.forEach((o) => o.setMap(null));
      overlaysRef.current = [];
    };
  }, [map, vertices, completed]);

  return null;
}

interface AreaDesignationProps {
  apiKey: string;
  locationQuery?: string;
  initialPolygon?: LatLng[];
  onComplete: (polygon: LatLng[]) => void;
  onBack: () => void;
}

export default function AreaDesignation({
  apiKey,
  locationQuery,
  initialPolygon,
  onComplete,
  onBack,
}: AreaDesignationProps) {
  const { t } = useLanguage();
  const [vertices, setVertices] = useState<LatLng[]>(initialPolygon ?? []);
  const [completed, setCompleted] = useState(
    () => (initialPolygon?.length ?? 0) >= 3,
  );

  const handleMapClick = useCallback(
    (e: MapMouseEvent) => {
      if (completed) return;
      const latLng = e.detail.latLng;
      if (!latLng) return;
      setVertices((prev) => [...prev, { lat: latLng.lat, lng: latLng.lng }]);
    },
    [completed],
  );

  const handleVertexMove = useCallback((index: number, lat: number, lng: number) => {
    setVertices((prev) => {
      const next = [...prev];
      if (index >= 0 && index < next.length) next[index] = { lat, lng };
      return next;
    });
  }, []);

  const handleComplete = () => {
    if (vertices.length >= 3) {
      setCompleted(true);
    }
  };

  const handleReset = () => {
    setVertices([]);
    setCompleted(false);
  };

  const handleSubmit = () => {
    onComplete(vertices);
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Toolbar */}
      <Paper
        elevation={0}
        sx={{
          p: 2,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottom: "1px solid",
          borderColor: "divider",
          flexShrink: 0,
          flexWrap: "wrap",
          gap: 1,
        }}
      >
        <Stack direction="row" spacing={1} alignItems="center">
          <Button
            variant="outlined"
            size="small"
            startIcon={<ArrowBackIcon />}
            onClick={onBack}
          >
            {t.area.back}
          </Button>
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
            {t.area.title}
          </Typography>
          <Chip
            label={t.area.pointCount(vertices.length)}
            size="small"
            variant="outlined"
          />
        </Stack>

        <Stack direction="row" spacing={1}>
          <Button
            variant="outlined"
            color="error"
            size="small"
            startIcon={<DeleteOutlineIcon />}
            onClick={handleReset}
            disabled={vertices.length === 0}
          >
            {t.area.reset}
          </Button>

          {!completed && (
            <Button
              variant="outlined"
              size="small"
              startIcon={<CheckCircleIcon />}
              onClick={handleComplete}
              disabled={vertices.length < 3}
            >
              {t.area.completePolygon}
            </Button>
          )}

          {completed && (
            <Button
              variant="contained"
              size="small"
              startIcon={<PlayArrowIcon />}
              onClick={handleSubmit}
            >
              {t.area.runSimulation}
            </Button>
          )}
        </Stack>
      </Paper>

      {/* Instruction */}
      {!completed && (
        <Paper
          elevation={0}
          sx={{
            px: 2,
            py: 1,
            bgcolor: "primary.main",
            color: "primary.contrastText",
            borderRadius: 0,
            flexShrink: 0,
          }}
        >
          <Typography variant="body2">{t.area.instruction}</Typography>
        </Paper>
      )}

      {/* Map */}
      <Box sx={{ flex: 1, position: "relative", minHeight: 400 }}>
        <APIProvider apiKey={apiKey}>
          <Map
            defaultCenter={{ lat: 35.6812, lng: 139.7671 }}
            defaultZoom={15}
            tilt={0}
            gestureHandling="greedy"
            disableDefaultUI={false}
            mapTypeControl={true}
            streetViewControl={false}
            fullscreenControl={true}
            zoomControl={true}
            onClick={handleMapClick}
            style={{ width: "100%", height: "100%" }}
            mapId="flowguard-area-map"
          >
            <TiltLockOverlay />
            <GeocodingEffect query={locationQuery} />
            <DrawingLayer vertices={vertices} completed={completed} onVertexMove={handleVertexMove} />
          </Map>
        </APIProvider>
      </Box>
    </Box>
  );
}
