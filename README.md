# FlowGuard AI - イベントリスクシミュレーション

イベントのリスクを AI でシミュレーションし、関係者で共有・対策まで一気通貫で扱う Web アプリケーションです。

## 概要

FlowGuard AI は、地図（Google Maps / Cesium）とバックエンドの AI 分析（FastAPI + Vertex AI Gemini）、リアルタイム共有（Firebase Firestore）を組み合わせ、主催者・警備・自治体・会場管理者が、イベント前からリスクを予測・分析・軽減策の検討を行えるようにします。

- **3 ステップ**: イベント設定 → エリア指定（地図でポリゴン描画）→ リスク分析ダッシュボード
- **6 カテゴリのリスク**: 群衆安全、交通・物流、環境・保健、運営、視界・見通し、法規制対応
- **2D / 3D 地図**: Google Maps（2D）、Cesium（3D）
- **プロジェクト共有**: 6 文字の参加コードで複数人が同一プロジェクトをリアルタイム同期
- **日英対応**: UI とシミュレーション結果の翻訳
- **PDF レポート**: フル版・1 枚サマリーのエクスポート

詳細は [docs/OVERVIEW.md](docs/OVERVIEW.md) を参照してください。

## アーキテクチャ

```
frontend/   React 19 + TypeScript 5.7 + Vite 6 + MUI 6 + Google Maps (vis.gl) + Cesium
backend/    Python 3.11+ / FastAPI + Vertex AI (Gemini 3 Pro: 解析, Gemini 2.5 Flash: アシスト)
```

- フロントエンドはバックエンドに HTTP でシミュレーション・翻訳・PDF・アシストを依頼
- プロジェクト共有を使う場合のみ Firebase（Firestore・匿名認証）を利用

## 必要な環境

- **Node.js** 20+
- **Python** 3.11+
- **Google Cloud** プロジェクト（Vertex AI API 有効）
- **Google Maps** API キー（Maps JavaScript API 有効）
- プロジェクト共有を使う場合: **Firebase** プロジェクト（Firestore・匿名認証）

## セットアップ

環境変数は、各ディレクトリの `.env.example` を `.env` にコピーして設定します。

### バックエンド

```bash
cd backend
python -m venv venv
venv\Scripts\activate   # Windows
# source venv/bin/activate  # macOS / Linux
pip install -r requirements.txt
```

`backend/.env.example` を `backend/.env` にコピーし、以下を設定します。

- `PROJECT_ID`: Google Cloud プロジェクト ID
- `GOOGLE_MAPS_API_KEY`: Google Maps API キー
- `LOCATION`: Vertex AI のリージョン（`gemini-3-pro-preview` 利用時は `global`）
- `MODEL_ID`: 解析用モデル（例: `gemini-3-pro-preview`）

Google Cloud の認証:

```bash
gcloud auth application-default login
```

起動:

```bash
python main.py
# http://localhost:8000 で API が起動します
```

### フロントエンド

```bash
cd frontend
npm install
```

`frontend/.env.example` を `frontend/.env` にコピーし、以下を設定します。

- `VITE_API_BASE_URL`: バックエンドの URL（例: `http://localhost:8000`）
- `VITE_GOOGLE_MAPS_API_KEY`: Google Maps API キー

プロジェクト共有（参加コードで参加・新規作成）を使う場合は、Firebase の設定を追加します。

- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`

起動:

```bash
npm run dev
# http://localhost:5173 でアプリが開きます
```

## 利用の流れ

1. **イベント設定** … イベント名・種別・場所・日時・来場者数・来場者属性・補足などを入力。テンプレートやアラート閾値あり。
2. **エリア指定** … 地図上でクリックしてポリゴン頂点を追加。3 点以上で「ポリゴン確定」→ シミュレーション実行。
3. **リスク分析ダッシュボード** … リスク一覧・地図（2D/3D）・分析サマリー・対策 ToDo・What-if 比較・PDF エクスポート。

## 技術スタック

| 構成要素 | 技術 |
|----------|------|
| フロントエンド | React 19, TypeScript 5.7, Vite 6, MUI 6, Emotion, @vis.gl/react-google-maps, Cesium |
| バックエンド | FastAPI, Pydantic, Vertex AI SDK |
| 解析 AI | Gemini 3 Pro（Vertex AI、グローバル） |
| アシスト AI | Gemini 2.5 Flash（アプリの使い方ガイド） |
| 地図 | Google Maps JavaScript API（2D）、Cesium（3D） |
| 共有 | Firebase Firestore、Firebase Auth（匿名） |

## ドキュメント

- [docs/OVERVIEW.md](docs/OVERVIEW.md) - プロジェクト概要・対象ユーザー・解決する課題
- [docs/FEATURES.md](docs/FEATURES.md) - 機能一覧と利用手順
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) - アーキテクチャ・API・データモデル・ディレクトリ構成
