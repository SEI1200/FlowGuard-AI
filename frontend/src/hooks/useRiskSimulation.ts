// ---------------------------------------------------------------------------
// FlowGuard AI - Risk Simulation Hook
// ---------------------------------------------------------------------------

import { useCallback, useState } from "react";
import type { LatLng, MissionConfig, SimulationResponse } from "../types";
import { runSimulation } from "../services/api";

interface UseRiskSimulationReturn {
  result: SimulationResponse | null;
  loading: boolean;
  error: string | null;
  simulate: (
    config: MissionConfig,
    polygon: LatLng[],
    locale: string,
  ) => Promise<void>;
  reset: () => void;
}

export function useRiskSimulation(): UseRiskSimulationReturn {
  const [result, setResult] = useState<SimulationResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const simulate = useCallback(
    async (config: MissionConfig, polygon: LatLng[], locale: string) => {
      setLoading(true);
      setError(null);
      setResult(null);

      try {
        const dateTime =
          config.date_time ??
          (config.event_date && config.start_time && config.end_time
            ? `${config.event_date} ${config.start_time}–${config.end_time}`
            : "");
        const response = await runSimulation({
          ...config,
          date_time: dateTime,
          polygon,
          locale,
        });
        setResult(response);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Simulation failed";
        setError(message);
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const reset = useCallback(() => {
    setResult(null);
    setError(null);
    setLoading(false);
  }, []);

  return { result, loading, error, simulate, reset };
}
