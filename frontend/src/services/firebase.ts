import {
  getApp,
  getApps,
  initializeApp,
  type FirebaseApp,
} from "firebase/app";
import {
  getAuth,
  signInAnonymously,
  type User,
} from "firebase/auth";
import {
  getFirestore,
  enableIndexedDbPersistence,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  onSnapshot,
  serverTimestamp,
  type Firestore,
  type Unsubscribe,
} from "firebase/firestore";

import type { LatLng, MapPin, MissionConfig, SimulationResponse } from "../types";
import type { ProposalDecisionEntry } from "../utils/nextActionProposals";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY ?? "",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ?? "",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID ?? "",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ?? "",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID ?? "",
  appId: import.meta.env.VITE_FIREBASE_APP_ID ?? "",
};

export function isFirebaseConfigured(): boolean {
  return Boolean(
    firebaseConfig.apiKey &&
    firebaseConfig.projectId &&
    firebaseConfig.appId
  );
}

let app: FirebaseApp;
let auth: ReturnType<typeof getAuth>;
let db: Firestore;

export function getFirebaseApp(): FirebaseApp {
  if (!isFirebaseConfigured()) {
    throw new Error("Firebase is not configured. Set VITE_FIREBASE_* env vars.");
  }
  if (!getApps().length) {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
    enableIndexedDbPersistence(db).catch((err: unknown) => {
      const code = err && typeof err === "object" && "code" in err ? (err as { code?: string }).code : undefined;
      if (code !== "failed-precondition" && code !== "unimplemented") {
        console.warn("[FlowGuard] Firestore persistence disabled", err);
      }
    });
  } else {
    app = getApp();
    auth = getAuth(app);
    db = getFirestore(app);
  }
  return app;
}

export function getDb(): Firestore {
  getFirebaseApp();
  return db;
}

export async function ensureAuth(): Promise<User> {
  getFirebaseApp();
  let user = auth.currentUser;
  if (!user) {
    const cr = await signInAnonymously(auth);
    user = cr.user;
  }
  return user;
}

export interface ProjectDoc {
  joinCode: string;
  ownerId: string;
  missionConfig: MissionConfig | null;
  polygon: LatLng[];
  simulationResult: SimulationResponse | null;
  todoChecks: Record<string, boolean>;
  todoAssignees: Record<string, string>;
  todoAssigneeOther: Record<string, string>;
  todoOnSiteChecks: Record<string, boolean>;
  proposalDecisionLog: ProposalDecisionEntry[];
  adoptedProposals: AdoptedProposalSnapshot[];
  pins: MapPin[];
  mapTodos: MapTodo[];
  participantIds: string[];
  createdAt: unknown;
  updatedAt: unknown;
}

export interface AdoptedProposalSnapshot {
  key: string;
  title: string;
  taskId?: string;
  riskId?: string;
}

export interface MapTodo {
  id: string;
  taskId: string;
  lat: number;
  lng: number;
  title: string;
  createdAt: string;
}

const PROJECTS_COLLECTION = "projects";

function projectRef(joinCode: string) {
  return doc(getDb(), PROJECTS_COLLECTION, joinCode.toUpperCase());
}

function stripUndefined(obj: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined));
}

export function generateJoinCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export async function createProject(): Promise<string> {
  const user = await ensureAuth();
  const joinCode = generateJoinCode();
  const ref = projectRef(joinCode);
  await setDoc(ref, {
    joinCode,
    ownerId: user.uid,
    missionConfig: null,
    polygon: [],
    simulationResult: null,
    todoChecks: {},
    todoAssignees: {},
    todoAssigneeOther: {},
    todoOnSiteChecks: {},
    proposalDecisionLog: [],
    adoptedProposals: [],
    pins: [],
    mapTodos: [],
    participantIds: [user.uid],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return joinCode;
}

export async function joinProjectByCode(code: string): Promise<ProjectDoc | null> {
  await ensureAuth();
  const ref = projectRef(code.trim().toUpperCase());
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  const data = snap.data() as Omit<ProjectDoc, "createdAt" | "updatedAt"> & {
    createdAt?: unknown;
    updatedAt?: unknown;
  };
  const user = auth.currentUser;
  if (user && !data.participantIds.includes(user.uid)) {
    await updateDoc(ref, {
      participantIds: [...(data.participantIds || []), user.uid],
      updatedAt: serverTimestamp(),
    });
  }
  return {
    ...data,
    joinCode: data.joinCode ?? snap.id,
    missionConfig: data.missionConfig ?? null,
    polygon: Array.isArray(data.polygon) ? data.polygon : [],
    simulationResult: data.simulationResult ?? null,
    todoChecks: typeof data.todoChecks === "object" && data.todoChecks ? data.todoChecks : {},
    todoAssignees: typeof data.todoAssignees === "object" && data.todoAssignees ? data.todoAssignees : {},
    todoAssigneeOther: typeof data.todoAssigneeOther === "object" && data.todoAssigneeOther ? data.todoAssigneeOther : {},
    todoOnSiteChecks: typeof data.todoOnSiteChecks === "object" && data.todoOnSiteChecks ? data.todoOnSiteChecks : {},
    proposalDecisionLog: Array.isArray(data.proposalDecisionLog) ? data.proposalDecisionLog : [],
    adoptedProposals: Array.isArray(data.adoptedProposals) ? data.adoptedProposals : [],
    pins: Array.isArray(data.pins) ? (data.pins as unknown as Record<string, unknown>[]).map(normalizePin) : [],
    mapTodos: Array.isArray(data.mapTodos) ? (data.mapTodos as unknown as Record<string, unknown>[]).map(normalizeMapTodo) : [],
    participantIds: Array.isArray(data.participantIds) ? data.participantIds : [],
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  };
}

export async function getProjectByCode(code: string): Promise<ProjectDoc | null> {
  getFirebaseApp();
  const ref = projectRef(code.trim().toUpperCase());
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  const data = snap.data() as Record<string, unknown>;
  return {
    joinCode: (data.joinCode as string) ?? snap.id,
    ownerId: (data.ownerId as string) ?? "",
    missionConfig: (data.missionConfig as ProjectDoc["missionConfig"]) ?? null,
    polygon: Array.isArray(data.polygon) ? (data.polygon as LatLng[]) : [],
    simulationResult: (data.simulationResult as ProjectDoc["simulationResult"]) ?? null,
    todoChecks: typeof data.todoChecks === "object" && data.todoChecks
      ? (data.todoChecks as Record<string, boolean>)
      : {},
    todoAssignees: typeof data.todoAssignees === "object" && data.todoAssignees
      ? (data.todoAssignees as Record<string, string>)
      : {},
    todoAssigneeOther: typeof data.todoAssigneeOther === "object" && data.todoAssigneeOther
      ? (data.todoAssigneeOther as Record<string, string>)
      : {},
    todoOnSiteChecks: typeof data.todoOnSiteChecks === "object" && data.todoOnSiteChecks
      ? (data.todoOnSiteChecks as Record<string, boolean>)
      : {},
    proposalDecisionLog: Array.isArray(data.proposalDecisionLog) ? (data.proposalDecisionLog as ProposalDecisionEntry[]) : [],
    adoptedProposals: Array.isArray(data.adoptedProposals) ? (data.adoptedProposals as AdoptedProposalSnapshot[]) : [],
    pins: Array.isArray(data.pins) ? (data.pins as unknown as Record<string, unknown>[]).map(normalizePin) : [],
    mapTodos: Array.isArray(data.mapTodos) ? (data.mapTodos as unknown as Record<string, unknown>[]).map(normalizeMapTodo) : [],
    participantIds: Array.isArray(data.participantIds) ? (data.participantIds as string[]) : [],
    createdAt: data.createdAt as ProjectDoc["createdAt"],
    updatedAt: data.updatedAt as ProjectDoc["updatedAt"],
  };
}

export async function updateProjectState(
  joinCode: string,
  updates: {
    missionConfig?: MissionConfig | null;
    polygon?: LatLng[];
    simulationResult?: SimulationResponse | null;
    pins?: MapPin[];
  }
): Promise<void> {
  const ref = projectRef(joinCode);
  await updateDoc(ref, stripUndefined({ ...updates, updatedAt: serverTimestamp() }) as Record<string, unknown>);
}

export async function setProjectPins(joinCode: string, pins: MapPin[]): Promise<void> {
  const ref = projectRef(joinCode);
  const sanitized = pins.map((p) => stripUndefined(p as unknown as Record<string, unknown>));
  await updateDoc(ref, stripUndefined({ pins: sanitized, updatedAt: serverTimestamp() }) as Record<string, unknown>);
}

export async function addProjectMapTodo(
  joinCode: string,
  todo: { lat: number; lng: number; title: string },
  currentMapTodos?: MapTodo[],
  currentTodoChecks?: Record<string, boolean>
): Promise<MapTodo> {
  const now = new Date().toISOString();
  const taskId = crypto.randomUUID?.() ?? `map-todo-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  const newTodo: MapTodo = {
    id: taskId,
    taskId,
    lat: todo.lat,
    lng: todo.lng,
    title: todo.title.trim() || "",
    createdAt: now,
  };
  let mapTodos: MapTodo[];
  let todoChecks: Record<string, boolean>;
  if (Array.isArray(currentMapTodos) && typeof currentTodoChecks === "object") {
    mapTodos = [...currentMapTodos, newTodo];
    todoChecks = { ...currentTodoChecks, [taskId]: false };
  } else {
    const ref = projectRef(joinCode);
    const snap = await getDoc(ref);
    if (!snap.exists()) throw new Error("Project not found");
    const data = snap.data() as { mapTodos?: MapTodo[]; todoChecks?: Record<string, boolean> };
    mapTodos = [...(Array.isArray(data.mapTodos) ? data.mapTodos : []), newTodo];
    todoChecks = { ...(typeof data.todoChecks === "object" ? data.todoChecks : {}), [taskId]: false };
  }
  const ref = projectRef(joinCode);
  const sanitizedTodos = mapTodos.map((t) => stripUndefined(t as unknown as Record<string, unknown>));
  await updateDoc(ref, stripUndefined({
    mapTodos: sanitizedTodos,
    todoChecks,
    updatedAt: serverTimestamp(),
  }) as Record<string, unknown>);
  return newTodo;
}

export async function deleteProjectMapTodo(
  joinCode: string,
  taskId: string
): Promise<void> {
  const ref = projectRef(joinCode);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error("Project not found");
  const data = snap.data() as { mapTodos?: MapTodo[]; todoChecks?: Record<string, boolean> };
  const currentMapTodos = Array.isArray(data.mapTodos) ? data.mapTodos : [];
  const currentTodoChecks = typeof data.todoChecks === "object" ? data.todoChecks : {};
  const mapTodos = currentMapTodos.filter((t) => t.taskId !== taskId);
  const { [taskId]: _, ...todoChecks } = currentTodoChecks;
  const sanitizedTodos = mapTodos.map((t) => stripUndefined(t as unknown as Record<string, unknown>));
  await updateDoc(ref, stripUndefined({
    mapTodos: sanitizedTodos,
    todoChecks,
    updatedAt: serverTimestamp(),
  }) as Record<string, unknown>);
}

function normalizeMapTodo(p: Record<string, unknown>): MapTodo {
  return {
    id: (p.id as string) ?? "",
    taskId: (p.taskId as string) ?? (p.id as string) ?? "",
    lat: (p.lat as number) ?? 0,
    lng: (p.lng as number) ?? 0,
    title: (p.title as string) ?? "",
    createdAt: (p.createdAt as string) ?? "",
  };
}

function normalizePin(p: Record<string, unknown>): MapPin {
  return {
    id: (p.id as string) ?? "",
    lat: (p.lat as number) ?? 0,
    lng: (p.lng as number) ?? 0,
    name: (p.name as string) ?? "",
    memo: (p.memo as string) ?? undefined,
    type: (p.type as string) ?? "other",
    createdBy: p.createdBy as string | undefined,
    createdAt: (p.createdAt as string) ?? "",
    updatedAt: p.updatedAt as string | undefined,
  };
}

export async function addProjectPin(
  joinCode: string,
  pin: { lat: number; lng: number; name: string; memo?: string; type: string },
  currentPins?: MapPin[]
): Promise<MapPin> {
  const user = await ensureAuth();
  let current: MapPin[];
  if (Array.isArray(currentPins)) {
    current = currentPins;
  } else {
    const ref = projectRef(joinCode);
    const snap = await getDoc(ref);
    if (!snap.exists()) throw new Error("Project not found");
    const data = snap.data() as { pins?: MapPin[] };
    current = Array.isArray(data.pins) ? data.pins : [];
  }
  const now = new Date().toISOString();
  const id = crypto.randomUUID?.() ?? `pin-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  const newPin: MapPin = {
    id,
    lat: pin.lat,
    lng: pin.lng,
    name: pin.name.trim() || "",
    memo: pin.memo?.trim() || undefined,
    type: pin.type?.trim() || "other",
    createdBy: user.uid,
    createdAt: now,
    updatedAt: now,
  };
  await setProjectPins(joinCode, [...current, newPin]);
  return newPin;
}

export async function updateProjectPin(
  joinCode: string,
  pinId: string,
  updates: { name?: string; memo?: string; type?: string },
  currentPins?: MapPin[]
): Promise<void> {
  let current: MapPin[];
  if (Array.isArray(currentPins)) {
    current = currentPins;
  } else {
    const ref = projectRef(joinCode);
    const snap = await getDoc(ref);
    if (!snap.exists()) return;
    const data = snap.data() as { pins?: MapPin[] };
    current = Array.isArray(data.pins) ? data.pins : [];
  }
  const now = new Date().toISOString();
  const next = current.map((p) => {
    if (p.id !== pinId) return p;
    return {
      ...p,
      ...(updates.name !== undefined && { name: updates.name.trim() }),
      ...(updates.memo !== undefined && { memo: updates.memo.trim() || undefined }),
      ...(updates.type !== undefined && { type: updates.type.trim() || "other" }),
      updatedAt: now,
    };
  });
  if (next.some((p) => p.id === pinId)) await setProjectPins(joinCode, next);
}

export async function deleteProjectPin(
  joinCode: string,
  pinId: string,
  currentPins?: MapPin[]
): Promise<void> {
  let current: MapPin[];
  if (Array.isArray(currentPins)) {
    current = currentPins;
  } else {
    const ref = projectRef(joinCode);
    const snap = await getDoc(ref);
    if (!snap.exists()) return;
    const data = snap.data() as { pins?: MapPin[] };
    current = Array.isArray(data.pins) ? data.pins : [];
  }
  const next = current.filter((p) => p.id !== pinId);
  if (next.length !== current.length) await setProjectPins(joinCode, next);
}

export async function setProjectTodoCheck(
  joinCode: string,
  taskId: string,
  checked: boolean,
  currentTodoChecks?: Record<string, boolean>
): Promise<void> {
  let todoChecks: Record<string, boolean>;
  if (currentTodoChecks && typeof currentTodoChecks === "object") {
    todoChecks = { ...currentTodoChecks, [taskId]: checked };
  } else {
    const ref = projectRef(joinCode);
    const snap = await getDoc(ref);
    if (!snap.exists()) return;
    const data = snap.data();
    todoChecks = { ...(typeof data.todoChecks === "object" ? data.todoChecks : {}), [taskId]: checked };
  }
  const ref = projectRef(joinCode);
  await updateDoc(ref, stripUndefined({ todoChecks, updatedAt: serverTimestamp() }) as Record<string, unknown>);
}

export async function setProjectTodoAssignee(
  joinCode: string,
  taskId: string,
  value: string,
  currentAssignees?: Record<string, string>
): Promise<void> {
  let todoAssignees: Record<string, string>;
  if (currentAssignees && typeof currentAssignees === "object") {
    todoAssignees = { ...currentAssignees, [taskId]: value };
  } else {
    const ref = projectRef(joinCode);
    const snap = await getDoc(ref);
    if (!snap.exists()) return;
    const data = snap.data();
    todoAssignees = { ...(typeof data.todoAssignees === "object" ? data.todoAssignees : {}), [taskId]: value };
  }
  const ref = projectRef(joinCode);
  await updateDoc(ref, stripUndefined({ todoAssignees, updatedAt: serverTimestamp() }) as Record<string, unknown>);
}

export async function setProjectTodoAssigneeOther(
  joinCode: string,
  taskId: string,
  value: string,
  current?: Record<string, string>
): Promise<void> {
  let todoAssigneeOther: Record<string, string>;
  if (current && typeof current === "object") {
    todoAssigneeOther = { ...current, [taskId]: value };
  } else {
    const ref = projectRef(joinCode);
    const snap = await getDoc(ref);
    if (!snap.exists()) return;
    const data = snap.data();
    todoAssigneeOther = { ...(typeof data.todoAssigneeOther === "object" ? data.todoAssigneeOther : {}), [taskId]: value };
  }
  const ref = projectRef(joinCode);
  await updateDoc(ref, stripUndefined({ todoAssigneeOther, updatedAt: serverTimestamp() }) as Record<string, unknown>);
}

export async function setProjectTodoOnSiteCheck(
  joinCode: string,
  taskId: string,
  checked: boolean,
  current?: Record<string, boolean>
): Promise<void> {
  let todoOnSiteChecks: Record<string, boolean>;
  if (current && typeof current === "object") {
    todoOnSiteChecks = { ...current, [taskId]: checked };
  } else {
    const ref = projectRef(joinCode);
    const snap = await getDoc(ref);
    if (!snap.exists()) return;
    const data = snap.data();
    todoOnSiteChecks = { ...(typeof data.todoOnSiteChecks === "object" ? data.todoOnSiteChecks : {}), [taskId]: checked };
  }
  const ref = projectRef(joinCode);
  await updateDoc(ref, stripUndefined({ todoOnSiteChecks, updatedAt: serverTimestamp() }) as Record<string, unknown>);
}

export async function appendProposalDecision(
  joinCode: string,
  entry: ProposalDecisionEntry,
  currentLog?: ProposalDecisionEntry[]
): Promise<void> {
  let current: ProposalDecisionEntry[];
  if (Array.isArray(currentLog)) {
    current = currentLog;
  } else {
    const ref = projectRef(joinCode);
    const snap = await getDoc(ref);
    if (!snap.exists()) return;
    const data = snap.data() as { proposalDecisionLog?: ProposalDecisionEntry[] };
    current = Array.isArray(data.proposalDecisionLog) ? data.proposalDecisionLog : [];
  }
  const ref = projectRef(joinCode);
  await updateDoc(ref, stripUndefined({
    proposalDecisionLog: [...current, entry],
    updatedAt: serverTimestamp(),
  }) as Record<string, unknown>);
}

export async function appendAdoptedProposal(
  joinCode: string,
  item: AdoptedProposalSnapshot,
  currentProposals?: AdoptedProposalSnapshot[]
): Promise<void> {
  let current: AdoptedProposalSnapshot[];
  if (Array.isArray(currentProposals)) {
    current = currentProposals;
  } else {
    const ref = projectRef(joinCode);
    const snap = await getDoc(ref);
    if (!snap.exists()) return;
    const data = snap.data() as { adoptedProposals?: AdoptedProposalSnapshot[] };
    current = Array.isArray(data.adoptedProposals) ? data.adoptedProposals : [];
  }
  if (current.some((e) => e.key === item.key)) return;
  const ref = projectRef(joinCode);
  await updateDoc(ref, stripUndefined({
    adoptedProposals: [...current, item],
    updatedAt: serverTimestamp(),
  }) as Record<string, unknown>);
}

export function subscribeProject(
  joinCode: string,
  onData: (data: ProjectDoc | null) => void
): Unsubscribe {
  const ref = projectRef(joinCode);
  return onSnapshot(ref, (snap) => {
    if (!snap.exists()) {
      onData(null);
      return;
    }
    const data = snap.data() as Record<string, unknown>;
    onData({
      joinCode: (data.joinCode as string) ?? snap.id,
      ownerId: (data.ownerId as string) ?? "",
      missionConfig: (data.missionConfig as ProjectDoc["missionConfig"]) ?? null,
      polygon: Array.isArray(data.polygon) ? (data.polygon as LatLng[]) : [],
      simulationResult: (data.simulationResult as ProjectDoc["simulationResult"]) ?? null,
      todoChecks: typeof data.todoChecks === "object" && data.todoChecks
        ? (data.todoChecks as Record<string, boolean>)
        : {},
      todoAssignees: typeof data.todoAssignees === "object" && data.todoAssignees
        ? (data.todoAssignees as Record<string, string>)
        : {},
      todoAssigneeOther: typeof data.todoAssigneeOther === "object" && data.todoAssigneeOther
        ? (data.todoAssigneeOther as Record<string, string>)
        : {},
      todoOnSiteChecks: typeof data.todoOnSiteChecks === "object" && data.todoOnSiteChecks
        ? (data.todoOnSiteChecks as Record<string, boolean>)
        : {},
      proposalDecisionLog: Array.isArray(data.proposalDecisionLog) ? (data.proposalDecisionLog as ProposalDecisionEntry[]) : [],
      adoptedProposals: Array.isArray(data.adoptedProposals) ? (data.adoptedProposals as AdoptedProposalSnapshot[]) : [],
      pins: Array.isArray(data.pins) ? (data.pins as unknown as Record<string, unknown>[]).map(normalizePin) : [],
      mapTodos: Array.isArray(data.mapTodos) ? (data.mapTodos as unknown as Record<string, unknown>[]).map(normalizeMapTodo) : [],
      participantIds: Array.isArray(data.participantIds) ? (data.participantIds as string[]) : [],
      createdAt: data.createdAt as ProjectDoc["createdAt"],
      updatedAt: data.updatedAt as ProjectDoc["updatedAt"],
    });
  });
}
