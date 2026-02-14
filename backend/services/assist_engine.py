import logging
import os

from google import genai
from google.genai import types

logger = logging.getLogger(__name__)

APP_GUIDE = """
## FlowGuard AI とは
イベントリスクシミュレーションアプリです。大規模イベント（音楽フェス・花火大会・マラソン・展示会など）の開催エリアと条件を入力すると、AIが混雑・交通・環境・法規制などのリスクを分析し、対策案やToDoを提案します。

## アプリの流れ（使い方）
1. **ランディング画面**: 「新規で作成」で新規プロジェクト、または「6文字の参加コード」で既存プロジェクトに参加。
2. **ステップ1（イベント設定）**: イベント名・場所・日時・予想来場者数・来場者属性・天候メモなどを入力。**アラート閾値**でリスク検出の感度を選択する（保守的＝やや厳しめに多く検出、標準＝バランス、攻め＝重要度の高いものに絞る）。分析結果の件数や推奨の出方に影響する。
3. **ステップ2（エリア指定）**: 地図上で多角形を描き、分析対象エリアを指定。「道路に沿って最適化」で境界を整え、「シミュレーション実行」で分析開始。
4. **ステップ3（解析・ダッシュボード）**: リスク一覧・地図・対策・ToDo・What-if比較・PDF出力が可能。

## ダッシュボードの構成
- **左パネル**: リスクカテゴリの表示ON/OFF、並び替え（深刻度・重要度・緊急度・実行難易度）、リスク項目の一覧。項目をクリックで右に詳細表示。
- **中央**: 2D地図または3D表示。ピンや地図ToDoのマーカー表示。ピン追加モード・地図ToDo追加モードあり。
- **右パネル**: タブで切り替え。
  - **分析**: 選択したリスクの詳細、対策効果（対策前→対策後）、次にやるべき確認・対策、採用/却下/保留。
  - **対策・次アクション**: 対策案とToDo。
  - **ToDo・比較・メモ**: 対策ToDoリスト（チェックで完了すると対策効果が再計算）、What-if比較（ケースA/B/C）、現場確認メモ。
- **トップバー**: イベント名、リスク件数、天気、2D/3D切替、ピン追加・地図ToDo追加、PDFバリアント選択、PDFエクスポート。

## 主な機能
- **リスクカテゴリ**: 群衆安全、交通・物流、環境・保健、運営、視界・見通し、法規制対応。
- **対策効果**: 右パネル「分析」内。下のToDoを完了すると、総合リスクスコア・危険ポイント数などが即時再計算される。
- **ピン**: 地図上に任意の地点をマーク（名前・メモ・種別）。PDFに含まれる。
- **地図ToDo**: 地図上に「ここを直す」のようなToDoを追加。対策ToDoリストに統合される。
- **What-if比較**: 参加者数・時間帯・天候などを変えた複数ケースを追加し、スコア・危険数・ピーク時間帯を比較。おすすめ案を採用可能。
- **PDFレポート**: フル版または1ページ要約をダウンロード。
- **プロジェクト共有**: 参加コードで他ユーザーが参加すると、ToDo進捗・ピン・地図ToDo・採用提案などがリアルタイム共有される。
- **言語**: ヘッダーで日本語(JP)・英語(EN)を切替可能。シミュレーション結果は翻訳APIで英語表示に対応。

## アラート閾値（イベント設定）
イベント設定画面の「アラート閾値」は、リスク検出の感度を決める設定です。
- **保守的**: やや厳しめに、検出されるリスクが多くなります。見落としを減らしたい場合向け。
- **標準**: バランスの取れた設定。多くの場合このままで問題ありません。
- **攻め**: 重要度の高いリスクに絞って検出します。件数を抑えたい場合向け。
選択した値は分析結果のリスク件数や推奨の出方に影響します。
"""

ASSIST_SYSTEM_PROMPT = """You are a helpful in-app assistant for "FlowGuard AI", an event risk simulation application.
Your role is to answer the user's questions about how to use the app, what each screen/button does, and how the project flow works.
Answer based ONLY on the following app guide. Keep answers concise and practical. Use the same language as the user's question (Japanese or English).
If the user asks something not covered by the guide, say so briefly and suggest they try the relevant screen or contact support.
Do not invent features or steps that are not in the guide.
Do NOT use ** or any markdown for emphasis. Use plain text only.
"""


class AssistEngine:
    def __init__(self) -> None:
        self._project_id = os.getenv("PROJECT_ID", "flowguard-hackathon-2026")
        self._location = os.getenv("LOCATION", "us-central1")
        self._model_id = os.getenv("MODEL_ID", "gemini-2.5-flash")
        self._client = genai.Client(
            vertexai=True,
            project=self._project_id,
            location=self._location,
        )
        self._config = types.GenerateContentConfig(
            system_instruction=ASSIST_SYSTEM_PROMPT + "\n\n" + APP_GUIDE,
            temperature=0.3,
            max_output_tokens=1024,
        )
        logger.info("AssistEngine initialised (model=%s)", self._model_id)

    async def answer(self, question: str) -> str:
        if not (question or str(question).strip()):
            return "質問を入力してください。"
        prompt = str(question).strip()
        try:
            response = await self._client.aio.models.generate_content(
                model=self._model_id,
                contents=prompt,
                config=self._config,
            )
            text = (response.text or "").strip()
            return text or "回答を取得できませんでした。もう一度お試しください。"
        except Exception as exc:
            logger.exception("Assist answer failed: %s", exc)
            return "申し訳ありません。一時的に回答できません。しばらくしてから再度お試しください。"
