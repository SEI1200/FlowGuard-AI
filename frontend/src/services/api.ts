import type { LatLng, MissionConfig, SimulationRequest, SimulationResponse } from "../types";

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "";

const SIMULATE_TIMEOUT_MS = (() => {
  const env = import.meta.env.VITE_SIMULATE_TIMEOUT_MS;
  if (env !== undefined && env !== "") {
    const n = parseInt(env, 10);
    if (!Number.isNaN(n) && n > 0) return Math.min(n, 600_000);
  }
  return 240_000;
})();

async function request<T>(
  path: string,
  options?: RequestInit,
): Promise<T> {
  const url = `${API_BASE}${path}`;
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });

  if (!res.ok) {
    let detail = `HTTP ${res.status}`;
    try {
      const body = await res.json();
      detail = body.detail ?? detail;
    } catch {
    }
    throw new Error(detail);
  }

  return res.json() as Promise<T>;
}

const ASSIST_TIMEOUT_MS = 30_000;

export async function askAssist(question: string): Promise<string> {
  const url = `${API_BASE}/api/assist`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), ASSIST_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question: question.trim() }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error((err as { detail?: string }).detail ?? `HTTP ${res.status}`);
    }
    const data = (await res.json()) as { answer?: string };
    return typeof data.answer === "string" ? data.answer : "回答を取得できませんでした。";
  } catch (e) {
    clearTimeout(timeoutId);
    if (e instanceof Error) throw e;
    throw new Error("Assistant request failed.");
  }
}

export function buildSimulationRequest(
  config: MissionConfig,
  polygon: LatLng[],
  locale: string,
): SimulationRequest {
  const date_time =
    config.date_time ??
    (config.event_date && config.start_time && config.end_time
      ? `${config.event_date} ${config.start_time}–${config.end_time}`
      : "");
  return {
    event_name: config.event_name,
    event_type: config.event_type,
    event_location: config.event_location,
    date_time,
    expected_attendance: config.expected_attendance,
    audience_type: config.audience_type,
    polygon,
    additional_notes: config.additional_notes ?? "",
    locale,
    role: config.role,
    alert_threshold: config.alert_threshold,
  };
}

export async function runSimulation(
  payload: SimulationRequest,
): Promise<SimulationResponse> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), SIMULATE_TIMEOUT_MS);
  try {
    const res = await fetch(`${API_BASE}/api/simulate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    if (!res.ok) {
      let detail = `HTTP ${res.status}`;
      try {
        const body = await res.json();
        detail = body.detail ?? detail;
      } catch {
      }
      throw new Error(detail);
    }
    return res.json() as Promise<SimulationResponse>;
  } catch (err) {
    clearTimeout(timeoutId);
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error("Request timed out. Please try again.");
    }
    throw err;
  }
}

export async function fetchConfig(): Promise<{ google_maps_api_key: string }> {
  return request("/api/config");
}

export interface ScenarioTemplate {
  id: string;
  name: string;
  event_type: string;
  preset: {
    event_name: string;
    event_location: string;
    expected_attendance: number;
    additional_notes?: string;
  };
}

export async function fetchTemplates(): Promise<{ templates: ScenarioTemplate[] }> {
  return request("/api/templates");
}

export interface ValidationIssue {
  field?: string;
  code: string;
  message: string;
  severity: "error" | "warning";
}

export async function validateInput(body: {
  event_name: string;
  event_location: string;
  date_time: string;
  expected_attendance: number;
}): Promise<{ valid: boolean; issues: ValidationIssue[] }> {
  return request("/api/validate", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function healthCheck(): Promise<{ status: string }> {
  return request("/health");
}

export interface PdfDeltaSummary {
  riskScoreBefore: number;
  riskScoreAfter: number;
  dangerCountBefore: number;
  dangerCountAfter: number;
  congestionDeltaMinutes: number;
}

export interface SiteCheckItemForPdf {
  id: string;
  label: string;
  category: string;
  memo?: string;
  linkedTaskId?: string;
}

export interface AdoptedTodoForPdf {
  id?: string;
  who?: string;
  action: string;
  title?: string;
  risk_id?: string;
}

export interface PinForPdf {
  id?: string;
  name: string;
  memo?: string;
  type?: string;
}

export async function translateSimulationResponse(
  payload: SimulationResponse,
): Promise<SimulationResponse> {
  const res = await fetch(`${API_BASE}/api/translate-simulation`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const text = await res.text();
  if (!res.ok) {
    let detail = `HTTP ${res.status}`;
    try {
      const body = JSON.parse(text) as { detail?: string };
      detail = body.detail ?? detail;
    } catch {
    }
    throw new Error(detail);
  }
  let translated: unknown;
  try {
    translated = JSON.parse(text);
  } catch {
    throw new Error("Invalid translation response");
  }
  if (
    !translated ||
    typeof (translated as SimulationResponse).simulation_id !== "string" ||
    !Array.isArray((translated as SimulationResponse).risks)
  ) {
    throw new Error("Invalid translation response");
  }
  return translated as SimulationResponse;
}

export async function downloadReportPdf(
  payload: import("../types").SimulationResponse,
  variant?: string,
  deltaSummary?: PdfDeltaSummary | null,
  siteCheckMemos?: SiteCheckItemForPdf[] | null,
  todoChecks?: Record<string, boolean> | null,
  adoptedTodos?: AdoptedTodoForPdf[] | null,
  pins?: PinForPdf[] | null,
): Promise<Blob> {
  const url = variant ? `${API_BASE}/api/report/pdf?variant=${encodeURIComponent(variant)}` : `${API_BASE}/api/report/pdf`;
  const body: Record<string, unknown> = { ...payload };
  if (!body.simulation_id || typeof body.simulation_id !== "string") {
    body.simulation_id = `fg-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  }
  if (deltaSummary) body.delta_summary = deltaSummary;
  if (siteCheckMemos && siteCheckMemos.length > 0) body.site_check_memos = siteCheckMemos;
  if (todoChecks && typeof todoChecks === "object") body.todo_checks = todoChecks;
  if (adoptedTodos && adoptedTodos.length > 0) body.adopted_todos = adoptedTodos;
  if (pins && pins.length > 0) body.pins = pins;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    let detail = `HTTP ${res.status}`;
    try {
      const j = JSON.parse(text);
      detail = j.detail ?? detail;
    } catch {
      detail = text || detail;
    }
    throw new Error(detail);
  }
  return res.blob();
}
