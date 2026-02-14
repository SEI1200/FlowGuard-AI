// ---------------------------------------------------------------------------
// FlowGuard AI - Project Context
// 現在のプロジェクト（参加コード）、共有状態、TODO進捗の同期
// ---------------------------------------------------------------------------

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import type { LatLng, MapPin, MissionConfig, SimulationResponse } from "../types";
import type { ProjectDoc, AdoptedProposalSnapshot, MapTodo } from "../services/firebase";
import type { ProposalDecisionEntry } from "../utils/nextActionProposals";
import {
  isFirebaseConfigured,
  createProject as firebaseCreateProject,
  joinProjectByCode as firebaseJoinProject,
  updateProjectState as firebaseUpdateState,
  setProjectTodoCheck as firebaseSetTodoCheck,
  setProjectTodoAssignee as firebaseSetTodoAssignee,
  setProjectTodoAssigneeOther as firebaseSetTodoAssigneeOther,
  setProjectTodoOnSiteCheck as firebaseSetTodoOnSiteCheck,
  appendProposalDecision as firebaseAppendProposalDecision,
  appendAdoptedProposal as firebaseAppendAdoptedProposal,
  addProjectPin as firebaseAddPin,
  updateProjectPin as firebaseUpdatePin,
  deleteProjectPin as firebaseDeletePin,
  addProjectMapTodo as firebaseAddMapTodo,
  deleteProjectMapTodo as firebaseDeleteMapTodo,
  subscribeProject,
} from "../services/firebase";

// ---------------------------------------------------------------------------
// Context value
// ---------------------------------------------------------------------------

export interface ProjectContextValue {
  /** 参加コード（プロジェクトID）。未参加なら null */
  joinCode: string | null;
  /** プロジェクトの共有データ（参加中のみ。購読で更新される） */
  projectData: ProjectDoc | null;
  /** Firebase が利用可能か */
  firebaseReady: boolean;
  /** 新規プロジェクト作成。参加コードを返す。 */
  createProject: () => Promise<string>;
  /** 参加コードで参加。成功で true。 */
  joinProject: (code: string) => Promise<boolean>;
  /** プロジェクトから抜ける（ローカル状態のみクリア） */
  leaveProject: () => void;
  /** 設定・ポリゴン・結果を保存（参加中のみ） */
  saveMissionConfig: (config: MissionConfig) => void;
  savePolygon: (poly: LatLng[]) => void;
  saveSimulationResult: (result: SimulationResponse) => void;
  /** TODO のチェック状態を保存・取得 */
  todoChecks: Record<string, boolean>;
  setTodoCheck: (taskId: string, checked: boolean) => void;
  /** 対策ToDoの担当（共有） */
  todoAssignees: Record<string, string>;
  setTodoAssignee: (taskId: string, value: string) => void;
  /** 対策ToDoの担当「その他」テキスト（共有） */
  todoAssigneeOther: Record<string, string>;
  setTodoAssigneeOther: (taskId: string, value: string) => void;
  /** 対策ToDoの現場確認済（共有） */
  todoOnSiteChecks: Record<string, boolean>;
  setTodoOnSiteCheck: (taskId: string, checked: boolean) => void;
  /** 提案の採用・却下・保留ログ（全員で共有） */
  proposalDecisionLog: ProposalDecisionEntry[];
  /** 採用済み提案（全員で共有。対策ToDoの元） */
  adoptedProposals: AdoptedProposalSnapshot[];
  /** 提案の判断を1件追加（採用・却下・保留） */
  addProposalDecision: (entry: ProposalDecisionEntry) => void;
  /** 採用済み提案を1件追加 */
  addAdoptedProposal: (item: AdoptedProposalSnapshot) => void;
  /** 地図ピン（共有コード単位で同期） */
  pins: MapPin[];
  addPin: (pin: { lat: number; lng: number; name: string; memo?: string; type: string }) => Promise<MapPin>;
  updatePin: (pinId: string, updates: { name?: string; memo?: string; type?: string }) => Promise<void>;
  deletePin: (pinId: string) => Promise<void>;
  /** 地図上の「ここを直す」To-Do 一覧 */
  mapTodos: MapTodo[];
  /** 地図上の To-Do を1件追加 */
  addMapTodo: (todo: { lat: number; lng: number; title: string }) => Promise<MapTodo>;
  /** 地図上の To-Do を1件削除 */
  deleteMapTodo: (taskId: string) => Promise<void>;
  /** 参加中か */
  isInProject: boolean;
}

const ProjectContext = createContext<ProjectContextValue | null>(null);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function ProjectProvider({ children }: { children: ReactNode }) {
  const [joinCode, setJoinCode] = useState<string | null>(() => {
    try {
      return sessionStorage.getItem("flowguard_join_code");
    } catch {
      return null;
    }
  });
  const [projectData, setProjectData] = useState<ProjectDoc | null>(null);
  const [optimisticPins, setOptimisticPins] = useState<MapPin[]>([]);
  const firebaseReady = isFirebaseConfigured();

  useEffect(() => {
    if (joinCode) {
      try {
        sessionStorage.setItem("flowguard_join_code", joinCode);
      } catch {
        // ignore
      }
    } else {
      try {
        sessionStorage.removeItem("flowguard_join_code");
      } catch {
        // ignore
      }
    }
  }, [joinCode]);

  // 参加中は Firestore を購読して todoChecks 等を同期
  useEffect(() => {
    if (!joinCode || !firebaseReady) {
      setProjectData(null);
      return;
    }
    const unsub = subscribeProject(joinCode, (data) => {
      setProjectData(data);
    });
    return () => unsub();
  }, [joinCode, firebaseReady]);

  const createProject = useCallback(async (): Promise<string> => {
    const code = await firebaseCreateProject();
    setJoinCode(code);
    return code;
  }, []);

  const joinProject = useCallback(async (code: string): Promise<boolean> => {
    const doc = await firebaseJoinProject(code);
    if (!doc) return false;
    setJoinCode(doc.joinCode);
    return true;
  }, []);

  const leaveProject = useCallback(() => {
    setJoinCode(null);
    setProjectData(null);
    setOptimisticPins([]);
  }, []);

  const saveMissionConfig = useCallback(
    (config: MissionConfig) => {
      if (!joinCode || !firebaseReady) return;
      firebaseUpdateState(joinCode, { missionConfig: config }).catch(() => {});
    },
    [joinCode, firebaseReady]
  );

  const savePolygon = useCallback(
    (poly: LatLng[]) => {
      if (!joinCode || !firebaseReady) return;
      firebaseUpdateState(joinCode, { polygon: poly }).catch(() => {});
    },
    [joinCode, firebaseReady]
  );

  const saveSimulationResult = useCallback(
    (result: SimulationResponse) => {
      if (!joinCode || !firebaseReady) return;
      firebaseUpdateState(joinCode, { simulationResult: result }).catch(() => {});
    },
    [joinCode, firebaseReady]
  );

  const todoChecks = useMemo(
    () => (projectData?.todoChecks ? { ...projectData.todoChecks } : {}),
    [projectData?.todoChecks]
  );

  const setTodoCheck = useCallback(
    (taskId: string, checked: boolean) => {
      if (!joinCode || !firebaseReady) return;
      firebaseSetTodoCheck(joinCode, taskId, checked, projectData?.todoChecks).catch(() => {});
    },
    [joinCode, firebaseReady, projectData?.todoChecks]
  );

  const todoAssignees = useMemo(
    () => (projectData?.todoAssignees && typeof projectData.todoAssignees === "object" ? { ...projectData.todoAssignees } : {}),
    [projectData?.todoAssignees]
  );

  const setTodoAssignee = useCallback(
    (taskId: string, value: string) => {
      if (!joinCode || !firebaseReady) return;
      firebaseSetTodoAssignee(joinCode, taskId, value, projectData?.todoAssignees).catch(() => {});
    },
    [joinCode, firebaseReady, projectData?.todoAssignees]
  );

  const todoAssigneeOther = useMemo(
    () => (projectData?.todoAssigneeOther && typeof projectData.todoAssigneeOther === "object" ? { ...projectData.todoAssigneeOther } : {}),
    [projectData?.todoAssigneeOther]
  );

  const setTodoAssigneeOther = useCallback(
    (taskId: string, value: string) => {
      if (!joinCode || !firebaseReady) return;
      firebaseSetTodoAssigneeOther(joinCode, taskId, value, projectData?.todoAssigneeOther).catch(() => {});
    },
    [joinCode, firebaseReady, projectData?.todoAssigneeOther]
  );

  const todoOnSiteChecks = useMemo(
    () => (projectData?.todoOnSiteChecks && typeof projectData.todoOnSiteChecks === "object" ? { ...projectData.todoOnSiteChecks } : {}),
    [projectData?.todoOnSiteChecks]
  );

  const setTodoOnSiteCheck = useCallback(
    (taskId: string, checked: boolean) => {
      if (!joinCode || !firebaseReady) return;
      firebaseSetTodoOnSiteCheck(joinCode, taskId, checked, projectData?.todoOnSiteChecks).catch(() => {});
    },
    [joinCode, firebaseReady, projectData?.todoOnSiteChecks]
  );

  const proposalDecisionLog = useMemo(
    () => (Array.isArray(projectData?.proposalDecisionLog) ? projectData.proposalDecisionLog : []),
    [projectData?.proposalDecisionLog]
  );

  const adoptedProposals = useMemo(
    () => (Array.isArray(projectData?.adoptedProposals) ? projectData.adoptedProposals : []),
    [projectData?.adoptedProposals]
  );

  const addProposalDecision = useCallback(
    (entry: ProposalDecisionEntry) => {
      if (!joinCode || !firebaseReady) return;
      firebaseAppendProposalDecision(joinCode, entry, projectData?.proposalDecisionLog).catch(() => {});
    },
    [joinCode, firebaseReady, projectData?.proposalDecisionLog]
  );

  const addAdoptedProposal = useCallback(
    (item: AdoptedProposalSnapshot) => {
      if (!joinCode || !firebaseReady) return;
      firebaseAppendAdoptedProposal(joinCode, item, projectData?.adoptedProposals).catch(() => {});
    },
    [joinCode, firebaseReady, projectData?.adoptedProposals]
  );

  const pins = useMemo(() => {
    const fromServer = Array.isArray(projectData?.pins) ? projectData.pins : [];
    if (optimisticPins.length === 0) return fromServer;
    const serverIds = new Set(fromServer.map((p) => p.id));
    const onlyNew = optimisticPins.filter((p) => !serverIds.has(p.id));
    return [...fromServer, ...onlyNew];
  }, [projectData?.pins, optimisticPins]);

  useEffect(() => {
    if (!projectData?.pins?.length) return;
    const serverIds = new Set(projectData.pins.map((p) => p.id));
    setOptimisticPins((prev) => prev.filter((p) => !serverIds.has(p.id)));
  }, [projectData?.pins]);

  const addPin = useCallback(
    (pin: { lat: number; lng: number; name: string; memo?: string; type: string }) => {
      if (!joinCode || !firebaseReady) return Promise.reject(new Error("Not in project"));
      return firebaseAddPin(joinCode, pin, projectData?.pins).then((newPin) => {
        setOptimisticPins((prev) => [...prev, newPin]);
        return newPin;
      });
    },
    [joinCode, firebaseReady, projectData?.pins]
  );

  const updatePin = useCallback(
    (pinId: string, updates: { name?: string; memo?: string; type?: string }) => {
      if (!joinCode || !firebaseReady) return Promise.resolve();
      return firebaseUpdatePin(joinCode, pinId, updates, projectData?.pins);
    },
    [joinCode, firebaseReady, projectData?.pins]
  );

  const deletePin = useCallback(
    (pinId: string) => {
      if (!joinCode || !firebaseReady) return Promise.resolve();
      return firebaseDeletePin(joinCode, pinId, projectData?.pins);
    },
    [joinCode, firebaseReady, projectData?.pins]
  );

  const mapTodos = useMemo(
    () => (Array.isArray(projectData?.mapTodos) ? projectData.mapTodos : []),
    [projectData?.mapTodos]
  );

  const addMapTodo = useCallback(
    (todo: { lat: number; lng: number; title: string }) => {
      if (!joinCode || !firebaseReady) return Promise.reject(new Error("Not in project"));
      return firebaseAddMapTodo(joinCode, todo, projectData?.mapTodos, projectData?.todoChecks);
    },
    [joinCode, firebaseReady, projectData?.mapTodos, projectData?.todoChecks]
  );

  const deleteMapTodo = useCallback(
    (taskId: string) => {
      if (!joinCode || !firebaseReady) return Promise.reject(new Error("Not in project"));
      return firebaseDeleteMapTodo(joinCode, taskId);
    },
    [joinCode, firebaseReady]
  );

  const value: ProjectContextValue = useMemo(
    () => ({
      joinCode,
      projectData,
      firebaseReady,
      createProject,
      joinProject,
      leaveProject,
      saveMissionConfig,
      savePolygon,
      saveSimulationResult,
      todoChecks,
      setTodoCheck,
      todoAssignees,
      setTodoAssignee,
      todoAssigneeOther,
      setTodoAssigneeOther,
      todoOnSiteChecks,
      setTodoOnSiteCheck,
      proposalDecisionLog,
      adoptedProposals,
      addProposalDecision,
      addAdoptedProposal,
      pins,
      addPin,
      updatePin,
      deletePin,
      mapTodos,
      addMapTodo,
      deleteMapTodo,
      isInProject: Boolean(joinCode),
    }),
    [
      joinCode,
      projectData,
      firebaseReady,
      createProject,
      joinProject,
      leaveProject,
      saveMissionConfig,
      savePolygon,
      saveSimulationResult,
      todoChecks,
      setTodoCheck,
      todoAssignees,
      setTodoAssignee,
      todoAssigneeOther,
      setTodoAssigneeOther,
      todoOnSiteChecks,
      setTodoOnSiteCheck,
      proposalDecisionLog,
      adoptedProposals,
      addProposalDecision,
      addAdoptedProposal,
      pins,
      addPin,
      updatePin,
      deletePin,
      mapTodos,
      addMapTodo,
      deleteMapTodo,
    ]
  );

  return (
    <ProjectContext.Provider value={value}>
      {children}
    </ProjectContext.Provider>
  );
}

export function useProject(): ProjectContextValue {
  const ctx = useContext(ProjectContext);
  if (!ctx) {
    throw new Error("useProject must be used within ProjectProvider");
  }
  return ctx;
}
