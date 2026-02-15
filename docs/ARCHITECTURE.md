# FlowGuard AI - アーキテクチャ

## システム概要

- **フロントエンド**  
  シングルページの React アプリ（Vite）。ランディング、3 ステップ（イベント設定 → エリア指定 → リスク分析ダッシュボード）を描画し、参加中プロジェクトでは Firestore のリアルタイムリスナーを 1 本だけ購読する。シミュレーション・テンプレート・バリデーション・翻訳・PDF はバックエンドに HTTP で依頼する。

- **バックエンド**  
  FastAPI サーバー。Vertex AI（Gemini）によるリスクシミュレーション、テンプレート・バリデーションの提供、シミュレーション結果の日→英翻訳、PDF レポート生成、レポート本文のテキスト取得（/api/report/text）、アプリガイド用の AI アシスト（/api/assist）を提供。アシストにはオプションで現在の画面状態（分析結果・リスク数・ToDo 進捗・ピン数・レポート本文など）を渡すと、次のアクション提案や具体的な質問への簡潔な回答を行う。オプションでエリアの道路スナップ（/api/area/snap-to-roads、外部 OSM 等）に対応（フロントエンド UI からは未呼び出し）。

- **Firebase**  
  オプション。プロジェクト共有用に Firestore を 1 コレクション（`projects`）、1 プロジェクト = 1 ドキュメント（ドキュメント ID = 参加コード）。匿名認証で書き込み。参加コードを持つ間だけリスナーを購読し、離脱・アンマウント時に解除する。

**データの流れ**  
ユーザーが設定とポリゴンをバックエンドに送りシミュレーションを実行。結果はダッシュボードに表示され、プロジェクト参加中なら Firestore に保存される。ToDo チェック・提案の採用/却下/保留・採用済み提案・ピン・地図 ToDo はプロジェクト参加時に Firestore に書き込まれ、全参加者が `onSnapshot` で更新を受け取る。複合クエリは使わず、すべてドキュメント ID によるアクセス。

## 技術スタック

| レイヤー | 技術 |
|----------|------|
| フロントエンド | React 19, TypeScript 5.7, Vite 6, MUI 6, Emotion, @vis.gl/react-google-maps, Cesium |
| 状態・API | React Context（ProjectContext, LanguageContext）、カスタムフック（useRiskSimulation） |
| バックエンド | Python 3.11+, FastAPI, Pydantic, Vertex AI SDK（解析: Gemini 3 Pro / アシスト: Gemini 2.5 Flash 等） |
| DB・同期 | Firebase Firestore（1 コレクション）、Firebase Auth（匿名） |
| 地図 | Google Maps JavaScript API（2D）、Cesium（3D） |

## API 一覧

### バックエンド（FastAPI）

| メソッド | パス | 説明 |
|----------|------|------|
| GET | `/health` | ヘルスチェック。`{ status, service }` を返す。 |
| GET | `/api/config` | クライアント向け設定。`{ google_maps_api_key }` を返す。 |
| GET | `/api/templates` | シナリオテンプレート一覧。`{ templates: ScenarioTemplate[] }`。 |
| POST | `/api/validate` | イベント入力の検証。`event_name`, `event_location`, `date_time`, `expected_attendance`。`{ valid, issues }`。 |
| POST | `/api/area/snap-to-roads` | ポリゴン頂点を地図境界にスナップ。Body: `{ path: LatLng[] }`。`{ path: LatLng[] }`。 |
| POST | `/api/simulate` | リスクシミュレーション実行。Body: `SimulationRequest`。Response: `SimulationResponse`。 |
| POST | `/api/translate-simulation` | シミュレーション結果を日本語→英語に翻訳。Body: 全文 `SimulationResponse`。翻訳後の `SimulationResponse`。チャンク並列で高速化。 |
| POST | `/api/assist` | アプリガイド AI。Body: `{ question: string, context?: AssistContext }`。context の定義は「アシストが参照する情報」を参照。回答は簡潔（2〜5 文程度）。`{ answer: string }`。 |
| POST | `/api/report/text` | PDF フル版と同じ構成のレポートをプレーンテキストで取得。Body: シミュレーション + 任意で `delta_summary`, `site_check_memos`, `todo_checks`, `adopted_todos`, `pins`。アシストの `report_text` 用。`{ text: string }`。 |
| POST | `/api/report/pdf` | PDF レポート生成。Query: `variant`（省略可、`one_page` で 1 枚要約）。Body: シミュレーション + 任意で `delta_summary`, `site_check_memos`, `todo_checks`, `adopted_todos`, `pins`。PDF バイナリ。 |

### アシストが参照する情報（AssistContext）

アシストは `/api/assist` の `body.context` として渡された「現在のアプリ状態」に基づき、具体的な回答・提案を行う。フロントは `displayResult`（分析結果。プロジェクト参加時は Firestore の `simulationResult` と同期）・`todoChecks`・`proposalDecisionLog`・`pins`・`mapTodos` 等から組み立てて送信する。

| フィールド | 型 | 説明 |
|------------|-----|------|
| step | number | 現在ステップ（0: イベント設定, 1: エリア指定, 2: 分析ダッシュボード）。 |
| event_name | string | イベント名。 |
| risk_count, overall_risk_score, summary | number / string | 分析結果のサマリー。 |
| recommendations | string[] | 分析結果の推奨（最大 15 件）。 |
| risks | AssistContextRisk[] | リスク一覧。深刻度降順で最大 20 件。各要素は title, severity, importance, urgency, execution_difficulty, description, mitigation_actions。 |
| todos | AssistContextTodo[] | 対策 ToDo 一覧（action, who, checked）。 |
| next_action_proposals | AssistContextNextAction[] | **次にやるべき確認・対策**。未完了重要 ToDo・期限超過・高リスク時間帯からフロントで算出（分析タブの「次にやるべき確認・対策」と同内容）。各要素は title, reason, source（unfinished_todo / overdue / high_risk_slot）。 |
| report_text | string | PDF フル版と同じ構成のレポート本文（/api/report/text で取得）。渡すと「最大の問題」「何をすべきか」等の具体的な質問にこの内容を基に簡潔に回答する。 |
| todo_checked_count, todo_total_count | number | ToDo 進捗。 |
| pins_count, map_todos_count | number | 地図上のピン数・地図 ToDo 数。 |

「なにから対策したら良いでしょうか」「今もっとも早急にするべき対応は」等の質問には、`report_text` があればそれを第一に、なければ `next_action_proposals` と risks / recommendations を参照して、具体的な提案を 2〜5 文程度で返す。

### フロントエンドでの利用

- **api.ts**: `runSimulation`, `buildSimulationRequest`, `fetchConfig`, `fetchTemplates`, `validateInput`, `translateSimulationResponse`, `askAssist(question, context?)`, `getReportText`, `downloadReportPdf`, `healthCheck`。アシスト呼び出し時にオプションで `AssistContext`（上記の定義）を渡し、`report_text` を含めると PDF フル版と同じレポート内容を基に具体的な質問に簡潔に回答する。（道路スナップはバックエンド `/api/area/snap-to-roads` で提供。フロントエンドからは未呼び出し。）
- **firebase.ts**: REST は使わず Firestore SDK（`getDoc`, `setDoc`, `updateDoc`, `onSnapshot`）と Auth（`signInAnonymously`）。プロジェクト作成・参加・ピン・地図 ToDo 追加/削除・ToDo チェック・提案ログ・採用提案の読み書きを提供。

## Firestore データモデル

- **コレクション**: `projects`。
- **ドキュメント ID**: 大文字 6 文字英数字の参加コード（例: `ABC123`）。複合インデックスは使わず、すべてこの ID で読み書き。

**ドキュメントの形（ProjectDoc）**

| フィールド | 型 | 説明 |
|------------|-----|------|
| joinCode | string | ドキュメント ID と同じ。 |
| ownerId | string | 作成者の Firebase UID。 |
| missionConfig | MissionConfig \| null | ステップ 1 のフォーム状態。 |
| polygon | LatLng[] | ステップ 2 のポリゴン。 |
| simulationResult | SimulationResponse \| null | 直近のシミュレーション結果。 |
| todoChecks | Record&lt;string, boolean&gt; | taskId → チェック済み。参加者間で同期。 |
| todoAssignees | Record&lt;string, string&gt; | taskId → 担当（警備/施設/主催/誘導/医療/その他 等）。 |
| todoAssigneeOther | Record&lt;string, string&gt; | taskId → 担当「その他」時の自由入力。 |
| todoOnSiteChecks | Record&lt;string, boolean&gt; | taskId → 現場確認済みか。 |
| proposalDecisionLog | ProposalDecisionEntry[] | 提案の採用・却下・保留ログ。 |
| adoptedProposals | AdoptedProposalSnapshot[] | 採用済み提案（対策 ToDo の元）。 |
| pins | MapPin[] | 地図ピン（id, lat, lng, name, memo, type, createdBy, createdAt, updatedAt）。 |
| mapTodos | MapTodo[] | 地図上の「ここを直す」ToDo（taskId, lat, lng, title 等）。 |
| participantIds | string[] | 参加した Firebase UID の配列。 |
| createdAt | Timestamp | 作成日時。 |
| updatedAt | Timestamp | 更新日時。 |

**最適化**  
Firestore の IndexedDB 永続化を有効にしローカルキャッシュを使用。ピン・ToDo・提案の更新時、呼び出し側で現在状態を渡せる場合は省略可能な `getDoc` で 1 回読みを省く。

**リスナーのライフサイクル**  
`subscribeProject(joinCode, onData)` が `Unsubscribe` を返す。参加コードと `firebaseReady` が設定されたときに 1 回だけ購読し、`ProjectContext` の `useEffect` のクリーンアップで、アンマウントまたは joinCode / firebaseReady 変更時に unsubscribe を呼び、メモリリークを防ぐ。

## フロントエンドのディレクトリ構成

```
frontend/
  src/
    main.tsx                 # エントリ。App とプロバイダを描画
    App.tsx                  # ルート: ランディング / 本流、ステッパー、ステップ別コンテンツ
    theme.ts                 # MUI テーマ
    vite-env.d.ts            # Vite 用型
    components/
      LandingScreen.tsx      # 新規作成 / 参加、言語切替
      MissionSetup.tsx       # ステップ1: イベント設定フォーム、テンプレート、バリデーション、アラート閾値（? で説明表示）
      AreaDesignation.tsx    # ステップ2: 地図、ポリゴン描画（道路スナップ API は未使用）
      RiskDashboard.tsx      # ステップ3: レイアウト、地図/3D、リスク一覧、右パネル
      MapView.tsx            # 2D 地図（Google Maps）、ポリゴン、交通レイヤー、ピン、地図 ToDo（マーカークリックで削除）
      MapControlsOverlay.tsx # 地図タイプ、交通凡例
      RiskLayerControl.tsx   # カテゴリトグル、総合スコア、解決したリスク非表示スイッチ
      RiskDetailPanel.tsx    # 分析タブ（サマリー・対策反映の時間帯リスク・複合リスク・ボトルネック・推奨）、対策タブ、詳細ビュー
      MitigationTodoList.tsx # ToDo リスト、担当・現場確認、WhatIfCompare、SiteCheckMemo
      WhatIfCompare.tsx      # ケース追加・実行・採用
      SiteCheckMemo.tsx      # 現場確認メモ（PDF 用）
      Cesium3DView.tsx       # 3D 地球（Cesium）
      MapView3D.tsx          # 3D ラッパー・フォールバック
      AssistFab.tsx          # AI アシスト（フロートボタン、ドラッグ移動・右下リサイズ、チャット UI、/api/assist）
      SettingsDialog.tsx    # 設定モーダル
      SystemInfoDialog.tsx   # システム情報モーダル（アーキテクチャ・費用対効果・運用設計）
    context/
      ProjectContext.tsx     # joinCode、projectData、Firestore 同期、ピン/ToDo/地図ToDo/提案 API
    hooks/
      useRiskSimulation.ts   # simulate(), result, loading, error, reset
    i18n/
      LanguageContext.tsx    # locale, setLocale, t（翻訳）
      translations.ts        # 日英の翻訳キーと文字列
    services/
      api.ts                 # バックエンド HTTP: simulate, templates, validate, PDF, translate, assist
      firebase.ts            # Firestore + Auth: プロジェクト作成/参加、ピン、地図ToDo、ToDo、提案、購読
    types/
      index.ts               # LatLng, MapPin, RiskItem, SimulationRequest/Response, MissionConfig, 列挙型
      extended.ts            # RiskFactorBreakdown, MitigationTask, RiskTimeSlot 等
      siteCheck.ts           # SiteCheckItem, getDefaultSiteCheckItems
      whatIf.ts              # WhatIfCase
    utils/
      pins.ts                # ピン種別 ID・ラベル（DRY）
      mitigationDelta.ts     # computeDeltaSummary, computeEffectiveTimeSlots, countResolvedTodos（対策効果・分析タブ用）
      nextActionProposals.ts # 提案型、computeNextActionProposals
```

## デプロイ

- **バックエンド**: `backend/Dockerfile` で Python 3.11 + uvicorn。日本語 PDF 用にコンテナ内で Noto CJK または IPAex フォントを利用。
- **フロントエンド**: `frontend/Dockerfile`（Node ビルド → nginx 配信）と `frontend/cloudbuild.yaml`（ビルド時 `VITE_*` を渡して Cloud Run にデプロイ）。`VITE_API_BASE_URL` と必要に応じて `VITE_FIREBASE_*`・`VITE_GOOGLE_MAPS_API_KEY` をビルド時に指定する。
- 秘匿情報（API キー・環境変数）はリポジトリに含めず、`.env` および Cloud Run の「変数とシークレット」またはビルド substitution で設定する。

## バックエンドのディレクトリ構成（概要）

```
backend/
  main.py              # FastAPI アプリ、CORS、ルート: health, config, templates, validate, snap-to-roads, simulate, assist, translate-simulation, report/text, report/pdf
  models.py            # Pydantic: SimulationRequest, SimulationResponse, LatLng 等
  services/
    risk_engine.py     # RiskEngine: run_simulation, translate_simulation_to_english
    gemini_service.py  # Gemini 呼び出し、分析プロンプト、翻訳（チャンク並列）
    assist_engine.py   # AssistEngine: アプリガイド（APP_GUIDE）とシステムプロンプトで /api/assist に回答。context.report_text があればレポート本文を基に具体的に簡潔回答。オプションの context で現在状態を前提に次のアクションを提案
    pdf_report.py      # build_pdf, get_report_text（PDF フル版と同じ構成のテキスト）
    roads_service.py   # snap_path_to_map_boundaries
    weather_service.py # 天候取得
```

## 実装上の注意点

- **解析 AI（Gemini 3 Pro）**  
  リスクシミュレーションは `gemini-3-pro-preview` を Vertex AI の **グローバル** エンドポイントで利用。`thinking_level=HIGH` で推論を最大化し、`temperature=1.0` を推奨値として使用。他モデル利用時は `LOCATION`（例: us-central1）と `MODEL_ID` を環境変数で指定可能。アシスト（/api/assist）は Gemini 2.5 Flash を従来どおり使用。

- **2D 地図のパフォーマンス**  
  MapView は地図インスタンスへの購読を 1 つにまとめ、ポリゴンオーバーレイはポリゴン署名ごとに `fitBounds` を 1 回だけ実行してズーム競合を防ぐ。ピン・地図 ToDo のマーカーは、データ（id/lat/lng/種別）やコールバック参照が変わったときだけ再生成。MapView は `React.memo`、RiskDashboard から渡すコールバックは `useCallback` で安定化。解析画面の 2D 地図では衛星/ハイブリッド時に `tilt=0` と TiltLockOverlay で拡大時も 2.5D にならないよう固定。**エリア指定画面**（AreaDesignation）の地図も同様に `tilt=0` と TiltLockOverlay で常に 2D にし、解析画面の写真地図と同じ挙動にしている。

- **Firestore**  
  有効な参加コードごとに `onSnapshot` を 1 本。アンマウント時に解除。ピン・ToDo・提案の書き込みでは、現在状態を渡して読む回数を減らせる場合は省略する。

- **型**  
  ピン種別の ID とラベルは `utils/pins.ts` に集約。フロントエンド本番ソースでは `any` を使わず、Firestore のスナップショットは読み後に型付き構造へキャストする。

- **分析タブの対策反映・表示**  
  分析サマリーと時間帯ごとのリスクは、`computeEffectiveTimeSlots` と `countResolvedTodos` により ToDo チェック状態に応じてリアルタイムで再計算される。危険ポイントの表示は行わない（対策効果パネルでも危険ポイント数は表示しない）。リスク詳細では説明文・深刻度以降の要因分解・軽減策・連鎖リスクなどを `whiteSpace: normal` と `wordBreak: break-word` で折り返し全文表示し、途中で切れないようにしている。

- **What-if 比較**  
  追加ケースどうしだけでなく **現在の結果も含めた** `[現在, ケース1, ...]` で `getBestCase` を実行。`bestIdx > 0` のときだけ「おすすめ」を表示するため、現在より悪化したケースがおすすめになることはない。

- **翻訳**  
  ロケールが EN のとき、表示用シミュレーション結果は `translateSimulationResponse` で取得。バックエンドでは head + risks のあと、mitigation_tasks / composite_risks / bottlenecks / risk_time_series を `asyncio.gather` で並列翻訳して応答を短縮している。
