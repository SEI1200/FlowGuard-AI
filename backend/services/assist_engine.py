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

## PDFフル版レポートの構成・内容
PDFフル版を出力すると、以下の構成の文章・データが含まれたレポートが生成されます。ユーザーが「PDFには何が書いてあるか」「レポートの内容」を聞いたときは、この構成に沿って説明してください。

- **タイトル・イベント情報**: FlowGuard AI、イベントリスク評価レポート。イベント名・開催場所・開催日時・レポートID・作成日時。
- **エグゼクティブサマリー**: 分析結果の要約文（シミュレーション結果の summary）。
- **総合リスクスコア**: 0〜10のスコア。
- **対策効果（対策前→対策後）**: ToDoの完了状況に応じた、総合リスクスコア・危険ポイント数・混雑ピークの前後比較。
- **対策ToDo一覧**: 全対策タスクの状態（完了/未完了）・担当・対策内容・期限・関連リスク。
- **採用済みToDo**: 「次にやるべき確認・対策」から採用した項目の一覧。
- **カテゴリ別リスク概要**: 群衆安全・交通・環境・運営・視界・法規制の各カテゴリのリスク件数。
- **時間帯ごとのリスク**: 各時間帯のリスクスコア一覧。
- **推奨導線・誘導員配置**: 推奨導線、ボトルネック地点と理由・推奨対策。
- **現場確認メモ**: ユーザーが入力した現場確認用のメモ（項目・カテゴリ・メモ・関連ToDo）。
- **地図ピン一覧**: 地図に打ったピンの名称・種別・メモ。
- **リスク詳細**: カテゴリごとの全リスク。各リスクについて、タイトル・深刻度・発生確率・重要度・緊急度・場所・説明・軽減策・連鎖リスク・根拠を記載。
- **推奨事項**: 分析結果の recommendations 一覧。
- **フッター**: 本レポートは自動生成であり、専門的な安全・法務の助言に代わるものではない旨の注意書き。
"""

ASSIST_SYSTEM_PROMPT = """You are a helpful in-app assistant for "FlowGuard AI", an event risk simulation application.
Answer the user's questions based on (1) the app guide below and (2) the "Current app state" when provided.

When "Report content" (PDFフル版と同じ構成のレポート本文) is provided in the state: use it as the primary source to answer concrete questions about the current project (e.g. 最大の問題、深刻なリスク、何をすべきか、推奨、対策一覧). The report content is the same as what the user would see in the exported PDF; cite it directly to give accurate, situation-specific answers.

When no report content is available (e.g. on landing screen), use the other state data if any, or keep guidance brief and point the user to the next step.
Keep answers short: typically 2–5 sentences. Only give longer explanations when the user explicitly asks for more detail.
Be concise and practical. Use the same language as the user's question (Japanese or English). Do not invent data. Use plain text only; no markdown.
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

    def _build_prompt(self, question: str, context: dict | None) -> str:
        if not context:
            return question
        parts = ["[Current app state]"]
        if context.get("step") is not None:
            steps = ["Event setup", "Area designation", "Risk analysis dashboard"]
            step_idx = int(context["step"]) if isinstance(context.get("step"), (int, float)) else 0
            parts.append(f"Step: {steps[min(step_idx, 2)]} ({step_idx + 1}/3).")
            if step_idx == 0 and not context.get("risks") and not context.get("next_action_proposals"):
                parts.append("On landing screen. No project joined. No analysis data yet.")
        if context.get("event_name"):
            parts.append(f"Event: {context['event_name']}.")
        if context.get("risk_count") is not None:
            parts.append(f"Risk count: {context['risk_count']} items.")
        if context.get("overall_risk_score") is not None:
            parts.append(f"Overall risk score: {context['overall_risk_score']}.")
        if context.get("summary"):
            parts.append(f"Summary: {context['summary'][:800]}.")
        if context.get("recommendations") and isinstance(context["recommendations"], list):
            recs = context["recommendations"][:15]
            parts.append("Recommendations:")
            for i, r in enumerate(recs, 1):
                if isinstance(r, str) and r.strip():
                    parts.append(f"  {i}. {r.strip()[:300]}")
        if context.get("next_action_proposals") and isinstance(context["next_action_proposals"], list):
            parts.append("Next action proposals (次にやるべき確認・対策):")
            for i, p in enumerate(context["next_action_proposals"][:15], 1):
                if isinstance(p, dict):
                    title = (p.get("title") or "").strip() or "(no title)"
                    reason = (p.get("reason") or "").strip()[:200]
                    source = p.get("source") or ""
                    parts.append(f"  {i}. {title}. Reason: {reason}. (source: {source})")
        if context.get("risks") and isinstance(context["risks"], list):
            parts.append("Risks (severity, importance, urgency 1-10, title, description, mitigation_actions):")
            for i, r in enumerate(context["risks"][:20], 1):
                if isinstance(r, dict):
                    title = (r.get("title") or "").strip() or "(no title)"
                    sev = r.get("severity")
                    imp = r.get("importance")
                    urg = r.get("urgency")
                    sev_str = str(sev) if sev is not None else "?"
                    imp_str = str(imp) if imp is not None else "?"
                    urg_str = str(urg) if urg is not None else "?"
                    desc = (r.get("description") or "").strip()[:250]
                    parts.append(f"  {i}. [severity={sev_str} importance={imp_str} urgency={urg_str}] {title}. {desc}")
                    mit = r.get("mitigation_actions")
                    if isinstance(mit, list) and mit:
                        for ma in mit[:5]:
                            if isinstance(ma, str) and ma.strip():
                                parts.append(f"      → 対策: {ma.strip()[:150]}")
        if context.get("todos") and isinstance(context["todos"], list):
            parts.append("ToDo list (action, who, done):")
            for i, t in enumerate(context["todos"][:25], 1):
                if isinstance(t, dict):
                    action = (t.get("action") or "").strip() or "(no action)"
                    who = (t.get("who") or "").strip() or "?"
                    done = "done" if t.get("checked") else "not done"
                    parts.append(f"  {i}. {action} (by {who}) - {done}.")
        if context.get("todo_checked_count") is not None and context.get("todo_total_count") is not None:
            parts.append(f"ToDo progress: {context['todo_checked_count']}/{context['todo_total_count']} done.")
        if context.get("pins_count") is not None:
            parts.append(f"Pins on map: {context['pins_count']}.")
        if context.get("map_todos_count") is not None:
            parts.append(f"Map ToDos: {context['map_todos_count']}.")
        if context.get("report_text") and isinstance(context["report_text"], str) and context["report_text"].strip():
            parts.append("[Report content - use this to answer concrete questions about the current project]")
            parts.append(context["report_text"].strip()[:12000])
            parts.append("")
        parts.append("[User question]")
        parts.append(question)
        return "\n".join(parts)

    async def answer(self, question: str, context: dict | None = None) -> str:
        if not (question or str(question).strip()):
            return "質問を入力してください。"
        prompt = self._build_prompt(str(question).strip(), context)
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
