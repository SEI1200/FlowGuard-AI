// ---------------------------------------------------------------------------
// FlowGuard AI - Internationalisation (i18n) Translation Strings
// ---------------------------------------------------------------------------

export type Locale = "ja" | "en";

export interface TranslationStrings {
  app: {
    title: string;
    subtitle: string;
    joinCodeLabel: (code: string) => string;
    leaveProject: string;
    copyCodeLabel: string;
    settingsLabel: string;
    /** 画面上部のヒントポップアップ（コピー・AIアシストの説明） */
    tipCopy: string;
    tipAssist: string;
    tipClose: string;
  };
  landing: {
    subtitle: string;
    description: string;
    newProject: string;
    newProjectDescription: string;
    joinSectionLabel: string;
    joinButton: string;
    joinPlaceholder: string;
    codeLabel: string;
    codeHint: string;
    welcomeTitle: string;
    welcomeSubtitle: string;
    orDivider: string;
    systemStatus: string;
    help: string;
    terms: string;
    privacy: string;
    heroHeadline1: string;
    heroHeadline2: string;
    heroSubtitle: string;
    feature1: string;
    feature2: string;
    feature3: string;
    errorFirebase: string;
    errorEnterCode: string;
    errorCodeNotFound: string;
    errorCreateFailed: string;
    errorJoinFailed: string;
    firebaseHint: string;
  };
  steps: {
    eventConfig: string;
    areaDesignation: string;
    riskAnalysis: string;
  };
  mission: {
    title: string;
    basicInfo: string;
    eventName: string;
    eventNamePlaceholder: string;
    eventLocation: string;
    eventLocationPlaceholder: string;
    eventType: string;
    dateTime: string;
    expectedAttendance: string;
    audienceType: string;
    weatherSection: string;
    temperature: string;
    precipitationProbability: string;
    weatherCondition: string;
    additionalNotes: string;
    additionalNotesPlaceholder: string;
    nextButton: string;
    role?: string;
    alertThreshold?: string;
    templates?: string;
    templateLabel: string;
    eventDateLabel: string;
    startTimeLabel: string;
    endTimeLabel: string;
    applyTemplate: string;
    noTemplateOption: string;
    userRoles: Record<string, string>;
    alertOptions: Record<string, string>;
    alertThresholdDescription: string;
    alertThresholdHelpLabel: string;
  };
  area: {
    title: string;
    back: string;
    reset: string;
    completePolygon: string;
    runSimulation: string;
    instruction: string;
    pointCount: (n: number) => string;
  };
  loading: {
    title: string;
    description: string;
    steps: string[];
    complete: string;
  };
  error: {
    startOver: string;
    retryButton: string;
    rateLimitHint: string;
    timeoutHint: string;
    /** 失敗時の次のアクション説明 */
    nextActionHint: string;
    areaNotSpecified: string;
    runFailed: string;
  };
  dashboard: {
    risksIdentified: (n: number) => string;
    newSimulation: string;
    riskItems: (n: number) => string;
    exportPdf: string;
    view2D: string;
    view3D: string;
    weatherLabel: string;
    weatherTempLabel: string;
    weatherTempUnit: string;
    weatherPrecipLabel: string;
    sortLabel: string;
    sortBySeverity: string;
    sortByImportance: string;
    sortByUrgency: string;
    sortByExecutionDifficulty: string;
    tabAnalysis: string;
    tabMeasuresActions: string;
    tabTodoCompare: string;
    pinAdd: string;
    pinAddModeBanner: string;
    pinAddModeOff: string;
    mapTodoAdd: string;
    mapTodoAddModeBanner: string;
    mapTodoAddModeOff: string;
    mapTodoTitleLabel: string;
    mapTodoTitlePlaceholder: string;
    riskLayerTitle: string;
    priorityRisks: (n: number) => string;
    riskSearchPlaceholder: string;
    systemOk: string;
    lastUpdated: string;
    riskLevelHigh: string;
    riskLevelMedium: string;
    riskLevelLow: string;
    heatmapLegendTitle: string;
    heatmapLow: string;
    heatmapHigh: string;
    allCategories: string;
    hideResolvedRisks: string;
  };
  pins: {
    nameLabel: string;
    namePlaceholder: string;
    memoLabel: string;
    memoPlaceholder: string;
    typeLabel: string;
    typeOptionSecurity: string;
    typeOptionDanger: string;
    typeOptionCaution: string;
    typeOptionGuidance: string;
    typeOptionOther: string;
    save: string;
    cancel: string;
    createdBy: string;
    updatedAt: string;
    edit: string;
    delete: string;
    detailTitle: string;
    deleteConfirm: string;
  };
  layer: {
    overallRiskScore: string;
    outOf10: string;
    /** 対策前のスコア表示用（例: 元 7.8） */
    originalScore: string;
    critical: string;
    high: string;
    moderate: string;
    low: string;
    riskLayers: string;
    trafficLayerHint: string;
    mapDisplay: string;
    mapTypeRoadmap: string;
    mapTypeRoadmapNoLabels: string;
    mapTypeSatellite: string;
    mapTypeHybrid: string;
    trafficLegendTitle: string;
    /** イベント日の曜日を入れた説明。引数は曜日名（例: 土曜日） */
    trafficLegendWeekday: (weekday: string) => string;
    trafficSmooth: string;
    trafficModerate: string;
    trafficCongested: string;
  };
  weekdays: [string, string, string, string, string, string, string]; // 日〜土
  detail: {
    analysisSummary: string;
    topRecommendations: string;
    clickToView: string;
    location: string;
    severity: string;
    probability: string;
    veryHigh: string;
    high: string;
    moderate: string;
    low: string;
    veryLow: string;
    mitigationActions: string;
    cascadingRisks: string;
    evidence?: string;
    factorBreakdown?: string;
    description?: string;
  };
  eventTypes: Record<string, string>;
  audienceTypes: Record<string, string>;
  weatherConditions: Record<string, string>;
  riskCategories: Record<string, string>;
  /** 対策効果・次にやるべき・参照条件・採用/却下/保留等 */
  detailExtra: {
    mitigationEffectTitle: string;
    improvement: (val: string) => string;
    worsening: (val: string) => string;
    dangerPoints: string;
    dangerCountUnit: string;
    riskItemsLabel: string;
    congestionPeakShort: (min: string) => string;
    todoCheckRecalcHint: string;
    nextActionsTitle: string;
    reasonLabel: string;
    adopt: string;
    reject: string;
    defer: string;
    rejectedHint: string;
    referenceConditions: string;
    timeSlotVenue: string;
    venueArea: string;
    conditionsNote: string;
    linkToTodo: string;
    showMeasuresAction: string;
    decisionAdopted: string;
    decisionRejected: string;
    decisionDeferred: string;
    reasonPlaceholder: string;
    decisionLog: string;
    logCount: (n: number) => string;
    routesSection: string;
    routesRecommendation: (rec: number, rest: number) => string;
    staffRecommendation: (n: number) => string;
    timeSlotAttention: string;
    timeSlotPeakNote: (label: string, score: string) => string;
    compositeRisks: string;
    bottlenecks: string;
    timeSlotGrid: string;
    scoreLabel: string;
    decisionSectionTitle: string;
    noMitigationMessage: string;
    alternativesTitle: string;
    tradeoffsTitle: string;
    alternativeHint: string;
    factorContribution: (label: string, pct: string) => string;
    analysisEffectiveSummary: (n: number) => string;
    analysisBeforeMitigationLabel: string;
  };
  whatif: {
    title: string;
    description: string;
    currentCase: string;
    addCase: string;
    caseLabel: (n: number) => string;
    tableCase: string;
    tableScore: string;
    tableDanger: string;
    tablePeak: string;
    peakTimeSlot: string;
    recommended: string;
    adopt: string;
    recommendedHint: (label: string) => string;
    dialogTitle: string;
    dialogDescription: string;
    caseName: string;
    runAndAdd: string;
    running: string;
    expectedAttendance: string;
    startTime: string;
    endTime: string;
    audienceType: string;
    additionalNotes: string;
    cancel: string;
  };
  siteCheck: {
    title: string;
    description: string;
    linkToDo: string;
    memoPlaceholder: string;
  };
  todo: {
    listTitle: string;
    completedPriority: (total: number, done: number) => string;
    assigneeLabel: string;
    assigneeOtherPlaceholder: string;
    assigneeOptions: string[];
    assigneeOther: string;
    noAssigneeOption: string;
    onSiteChecked: string;
    emptyListHint: string;
  };
  dashboardExtra: {
    noRisksMessage: string;
    pdfFull: string;
    pdfOnePage: string;
    translatingContent: string;
  };
  /** 次にやるべき確認・対策の提案文（locale に応じて表示） */
  proposals: {
    reasonUnfinishedTodo: (riskTitle: string) => string;
    reasonHighImpact: string;
    titleDefault: string;
    reasonOverdue: (dueBy: string) => string;
    titleHighSlot: (label: string) => string;
    reasonHighSlot: (score: string) => string;
  };
  assist: {
    title: string;
    greeting: string;
    placeholder: string;
    send: string;
    close: string;
    loading: string;
    error: string;
  };
  settings: {
    title: string;
    apiUrlNotSet: string;
  };
  systemInfo: {
    title: string;
    tabArchitecture: string;
    tabCostEffect: string;
    tabOperations: string;
  };
}

// ---------------------------------------------------------------------------
// Japanese
// ---------------------------------------------------------------------------

const ja: TranslationStrings = {
  app: {
    title: "FlowGuard AI",
    subtitle: "統合イベントリスクシミュレーター",
    joinCodeLabel: (code: string) => `参加コード: ${code}`,
    leaveProject: "プロジェクトを抜ける",
    copyCodeLabel: "コードをコピー",
    settingsLabel: "設定",
    tipCopy: "隣のコピーボタンで参加コードをコピーして、仲間に共有できます。",
    tipAssist: "右下のロボットボタンは AI アシスト。使い方や次のアクションを相談できます。",
    tipClose: "閉じる",
  },
  landing: {
    subtitle: "イベントリスク評価・共有",
    description: "プロジェクトを作成して関係者と共有するか、参加コードで既存のプロジェクトに参加します。",
    newProject: "新しいプランを作成",
    newProjectDescription: "新規シミュレーション環境を開始",
    joinSectionLabel: "参加コードで参加",
    joinButton: "参加する",
    joinPlaceholder: "ABC123",
    codeLabel: "プロジェクトアクセスコード",
    codeHint: "* 招待時に伝えられた6文字のコードを入力してください",
    welcomeTitle: "ようこそ",
    welcomeSubtitle: "セッションを開始するオプションを選択",
    orDivider: "または",
    systemStatus: "システム稼働中",
    help: "ヘルプ",
    terms: "利用規約",
    privacy: "プライバシー",
    heroHeadline1: "次世代のイベント",
    heroHeadline2: "リスクシミュレーション",
    heroSubtitle: "AIが多方向からリスクを分析。\n安全なイベント運営をサポートします。",
    feature1: "リアルタイム分析",
    feature2: "セキュアシミュレーション",
    feature3: "複数人でリアルタイム共有",
    errorFirebase: "共有機能は設定されていません。VITE_FIREBASE_* を設定してください。",
    errorEnterCode: "参加コードを入力してください。",
    errorCodeNotFound: "参加コードが見つかりません。",
    errorCreateFailed: "プロジェクトの作成に失敗しました。",
    errorJoinFailed: "参加に失敗しました。",
    firebaseHint: "共有機能を使うには Firebase の設定が必要です。新規・参加は利用できません。",
  },
  steps: {
    eventConfig: "イベント設定",
    areaDesignation: "エリア指定",
    riskAnalysis: "リスク分析",
  },
  mission: {
    title: "イベント設定",
    basicInfo: "基本情報",
    eventName: "イベント名",
    eventNamePlaceholder: "例: Summer Sonic 2026",
    eventLocation: "開催場所",
    eventLocationPlaceholder: "例: 幕張メッセ, 千葉県",
    eventType: "イベント種別",
    dateTime: "開催日時",
    expectedAttendance: "予想来場者数",
    audienceType: "来場者の属性",
    weatherSection: "天候条件",
    temperature: "気温",
    precipitationProbability: "降水確率",
    weatherCondition: "天候",
    additionalNotes: "補足事項",
    additionalNotesPlaceholder:
      "特記事項、周辺のランドマーク、既知の危険要因など...",
    nextButton: "次へ: エリア指定",
    role: "役割（表示・出力の視点）",
    alertThreshold: "アラート閾値",
    templates: "シナリオテンプレート",
    templateLabel: "テンプレート",
    eventDateLabel: "開催日",
    startTimeLabel: "開始時刻",
    endTimeLabel: "終了時刻",
    applyTemplate: "テンプレートを適用",
    noTemplateOption: "選択なし",
    userRoles: { organizer: "主催者", security: "警備", local_gov: "自治体", venue_manager: "施設管理" },
    alertOptions: { conservative: "保守的", standard: "標準", aggressive: "攻め" },
    alertThresholdDescription: "リスク検出の感度です。保守的＝やや厳しめに多く検出、標準＝バランス、攻め＝重要度の高いものに絞って検出。分析結果の件数や推奨の出方に影響します。",
    alertThresholdHelpLabel: "説明",
  },
  area: {
    title: "イベントエリアの指定",
    back: "戻る",
    reset: "リセット",
    completePolygon: "ポリゴン確定",
    runSimulation: "シミュレーション実行",
    instruction:
      "地図上をクリックしてイベントエリアの頂点を配置してください。3点以上配置後「ポリゴン確定」をクリックしてください。",
    pointCount: (n: number) => `${n}点`,
  },
  loading: {
    title: "イベントリスクを分析中",
    description:
      "AIが群衆安全、交通、環境、運営のリスクを総合的に評価しています...",
    steps: [
      "地理的特性を解析中...",
      "群衆安全リスクを評価中...",
      "交通・物流リスクを評価中...",
      "環境・健康リスクを評価中...",
      "運営リスクを評価中...",
      "連鎖リスクを推論中...",
      "軽減策を策定中...",
      "最終レポートを生成中...",
    ],
    complete: "完了",
  },
  error: {
    startOver: "最初からやり直す",
    retryButton: "再試行",
    rateLimitHint: "APIの利用制限に達しました。少し待ってから再試行してください。",
    timeoutHint: "分析に時間がかかりすぎました。そのまま「再試行」するか、エリアを小さくしてから再度実行してください。",
    nextActionHint: "再試行: 同じ条件で再実行。最初から: イベント設定やエリアを変えてやり直せます。",
    areaNotSpecified: "エリアが指定されていません",
    runFailed: "実行に失敗しました",
  },
  dashboard: {
    risksIdentified: (n: number) => `${n}件のリスクを検出`,
    newSimulation: "新規シミュレーション",
    riskItems: (n: number) => `リスク項目 (${n})`,
    exportPdf: "PDFレポート出力",
    view2D: "2D地図",
    view3D: "3D地図",
    weatherLabel: "当日の天気予報",
    weatherTempLabel: "平均気温",
    weatherTempUnit: "度",
    weatherPrecipLabel: "降水確率",
    sortLabel: "並べ替え",
    sortBySeverity: "深刻度",
    sortByImportance: "重要度",
    sortByUrgency: "緊急度",
    sortByExecutionDifficulty: "実行難易度",
    tabAnalysis: "分析",
    tabMeasuresActions: "対策・次アクション",
    tabTodoCompare: "ToDo・比較・メモ",
    pinAdd: "ピン追加",
    pinAddModeBanner: "ピン追加中 — 地図をクリックして位置を指定",
    pinAddModeOff: "ピン追加を終了",
    mapTodoAdd: "地図にTo-Doを追加",
    mapTodoAddModeBanner: "「ここを直す」— 地図をクリックしてTo-Doの位置を指定",
    mapTodoAddModeOff: "To-Do追加を終了",
    mapTodoTitleLabel: "やること（例：看板を設置する・段差を埋める）",
    mapTodoTitlePlaceholder: "例：ここに看板を設置する",
    riskLayerTitle: "リスクレイヤー",
    priorityRisks: (n: number) => `優先リスク (${n})`,
    riskSearchPlaceholder: "リスクを検索...",
    systemOk: "システム正常",
    lastUpdated: "最終更新",
    riskLevelHigh: "高リスク",
    riskLevelMedium: "中リスク",
    riskLevelLow: "低リスク",
    heatmapLegendTitle: "人流密度ヒートマップ",
    heatmapLow: "低",
    heatmapHigh: "高",
    allCategories: "すべて",
    hideResolvedRisks: "解決したリスクを非表示",
  },
  pins: {
    nameLabel: "名前",
    namePlaceholder: "ピン名を入力（必須）",
    memoLabel: "メモ",
    memoPlaceholder: "メモを入力（任意）",
    typeLabel: "種別",
    typeOptionSecurity: "警備配置",
    typeOptionDanger: "危険",
    typeOptionCaution: "注意",
    typeOptionGuidance: "誘導",
    typeOptionOther: "その他",
    save: "保存",
    cancel: "キャンセル",
    createdBy: "作成者",
    updatedAt: "更新日時",
    edit: "編集",
    delete: "削除",
    detailTitle: "ピン詳細",
    deleteConfirm: "このピンを削除しますか？",
  },
  layer: {
    overallRiskScore: "総合リスクスコア",
    outOf10: "/ 10",
    originalScore: "元",
    critical: "重大",
    high: "高い",
    moderate: "中程度",
    low: "低い",
    riskLayers: "リスクレイヤー",
    trafficLayerHint: "地図にGoogle Mapsの交通情報を表示",
    mapDisplay: "地図の表示",
    mapTypeRoadmap: "地図（ラベル付き）",
    mapTypeRoadmapNoLabels: "地図（ラベルなし）",
    mapTypeSatellite: "写真（ラベルなし）",
    mapTypeHybrid: "写真（ラベル付き）",
    trafficLegendTitle: "交通状況レイヤー",
    trafficLegendWeekday: (weekday: string) =>
      `イベント日（${weekday}）の交通混雑の参考として表示しています。`,
    trafficSmooth: "スムーズ",
    trafficModerate: "やや混雑",
    trafficCongested: "混雑",
  },
  weekdays: ["日曜日", "月曜日", "火曜日", "水曜日", "木曜日", "金曜日", "土曜日"],
  detail: {
    analysisSummary: "分析サマリー",
    topRecommendations: "主要な推奨事項",
    clickToView: "左のリストからリスクを選択すると詳細が表示されます。",
    location: "場所",
    severity: "深刻度",
    probability: "発生確率",
    veryHigh: "非常に高い",
    high: "高い",
    moderate: "中程度",
    low: "低い",
    veryLow: "非常に低い",
    mitigationActions: "軽減策",
    cascadingRisks: "連鎖リスク",
    evidence: "根拠",
    factorBreakdown: "スコアの要因分解",
    description: "説明",
  },
  eventTypes: {
    music_festival: "音楽フェスティバル",
    fireworks: "花火大会",
    sports_event: "スポーツイベント",
    exhibition: "展示会",
    other: "その他",
  },
  audienceTypes: {
    youth: "若年層 (18-30)",
    family: "ファミリー",
    elderly: "高齢者 (65+)",
    mixed: "混合",
  },
  weatherConditions: {
    clear: "晴れ",
    cloudy: "曇り",
    rain: "雨",
    heavy_rain: "大雨",
    storm: "暴風雨",
    snow: "雪",
    extreme_heat: "猛暑",
  },
  riskCategories: {
    crowd_safety: "群衆安全",
    traffic_logistics: "交通・物流",
    environmental_health: "環境・健康",
    operational: "運営",
    visibility: "高さ・死角",
    legal_compliance: "法的留意点",
  },
  detailExtra: {
    mitigationEffectTitle: "対策効果（対策前 → 対策後）",
    improvement: (val: string) => `△${val} 改善`,
    worsening: (val: string) => `+${val}`,
    dangerPoints: "危険ポイント数",
    dangerCountUnit: "件",
    riskItemsLabel: "リスク項目",
    congestionPeakShort: (min: string) => `混雑ピーク: 約 ${min}分 短縮`,
    todoCheckRecalcHint: "ToDoを完了すると、ここが即時再計算されます。",
    nextActionsTitle: "次にやるべき確認・対策",
    reasonLabel: "理由",
    adopt: "採用",
    reject: "却下",
    defer: "保留",
    rejectedHint: "却下した提案は次回から表示されません。",
    referenceConditions: "参照条件",
    timeSlotVenue: "時間帯・開催日時",
    venueArea: "会場・エリア",
    conditionsNote: "参加者数・会場条件は上記イベント設定に基づいています。",
    linkToTodo: "関連ToDoを表示",
    showMeasuresAction: "対策アクションを表示",
    decisionAdopted: "採用",
    decisionRejected: "却下",
    decisionDeferred: "保留",
    reasonPlaceholder: "選択理由・メモ（任意）",
    decisionLog: "変更・判断ログ",
    logCount: (n: number) => `${n}件`,
    routesSection: "導線・配置の要点",
    routesRecommendation: (rec: number, rest: number) => `推奨導線 ${rec}本、規制線 ${rest}本を想定。`,
    staffRecommendation: (n: number) => `誘導員の配置推奨は ${n}箇所（混雑が予想されるポイント）。`,
    timeSlotAttention: "注意したい時間帯と対策",
    timeSlotPeakNote: (label: string, score: string) => `特にリスクが高くなる時間帯は「${label}」（スコア ${score}）。この時間帯は誘導員の増員や導線の見直し、必要に応じて入場制限の検討を推奨します。`,
    compositeRisks: "複合条件リスク",
    bottlenecks: "ボトルネック（詰まりやすい箇所）",
    timeSlotGrid: "時間帯ごとのリスク（全時間帯）",
    scoreLabel: "スコア",
    decisionSectionTitle: "この提案の判断",
    noMitigationMessage: "推奨アクションはありません。",
    alternativesTitle: "代替案",
    tradeoffsTitle: "トレードオフ",
    alternativeHint: "代替案: イベント設定やエリアを変えて「新規シミュレーション」を実行すると、別の提案が得られます。",
    factorContribution: (label: string, pct: string) => `${label}: ${pct}% がスコアに寄与`,
    analysisEffectiveSummary: (n: number) => `現在${n}件の対策を完了しています。対策に応じて、リスクスコアや時間帯ごとのリスクは更新されます。`,
    analysisBeforeMitigationLabel: "対策前の分析",
  },
  whatif: {
    title: "What-if 比較（ケース A/B/C）",
    description: "参加者数・時間帯・天候などを変えた複数ケースを比較し、最も効果が大きい変更案を採用できます。",
    currentCase: "現在",
    addCase: "ケースを追加",
    caseLabel: (n: number) => `ケース ${["A", "B", "C", "D"][n] ?? String(n + 1)}`,
    tableCase: "ケース",
    tableScore: "スコア",
    tableDanger: "危険数",
    tablePeak: "ピーク",
    peakTimeSlot: "ピーク時間帯",
    recommended: "おすすめ",
    adopt: "採用",
    recommendedHint: (label: string) => `「${label}」が現在より総合スコア・危険ポイントで改善しています。採用でToDo案を反映します。`,
    dialogTitle: "ケースを追加",
    dialogDescription: "現在の設定をコピーして、参加者数・時間帯などを変えてシミュレーションを実行します。",
    caseName: "ケース名",
    runAndAdd: "実行してケースに追加",
    running: "実行中…",
    expectedAttendance: "予想来場者数",
    startTime: "開始時刻",
    endTime: "終了時刻",
    audienceType: "来場者属性",
    additionalNotes: "補足事項",
    cancel: "キャンセル",
  },
  siteCheck: {
    title: "現場確認メモ",
    description: "入口・導線・段差・視界・待機列・救護・誘導員配置などの確認項目。メモはPDF詳細に差し込まれます。",
    linkToDo: "ToDoと関連付け",
    memoPlaceholder: "確認メモを入力",
  },
  todo: {
    listTitle: "対策 ToDo リスト",
    completedPriority: (total: number, done: number) => `${total}件（完了 ${done}）・優先度順`,
    assigneeLabel: "担当",
    assigneeOtherPlaceholder: "担当名を入力",
    assigneeOptions: ["警備", "施設", "主催", "誘導", "医療", "その他"],
    assigneeOther: "その他",
    noAssigneeOption: "未定",
    onSiteChecked: "現場確認済",
    emptyListHint: "「分析」タブの「次にやるべき確認・対策」で採用した項目がここに追加されます。",
  },
  dashboardExtra: {
    noRisksMessage: "リスクは検出されませんでした。エリアや設定を変えて再実行してみてください。",
    pdfFull: "フルレポート",
    pdfOnePage: "1枚サマリー",
    translatingContent: "翻訳中…",
  },
  proposals: {
    reasonUnfinishedTodo: (riskTitle: string) => `重要対策が未実施です。リスク「${riskTitle}」の軽減のため。`,
    reasonHighImpact: "重要度の高い対策が未実施です。",
    titleDefault: "対策の実施",
    reasonOverdue: (dueBy: string) => `期限（${dueBy}）を過ぎています。早めの対応を推奨します。`,
    titleHighSlot: (label: string) => `${label} の時間帯はリスクが高めです`,
    reasonHighSlot: (score: string) => `時間帯別スコアが ${score} です。誘導員の確認や入場制限の検討を推奨します。`,
  },
  assist: {
    title: "AIアシスト",
    greeting: "こんにちは！FlowGuard AI の使い方や、画面の操作で分からないことがあれば、何でも聞いてください。",
    placeholder: "メッセージを入力…",
    send: "送信",
    close: "閉じる",
    loading: "回答を取得中…",
    error: "エラーが発生しました。",
  },
  settings: {
    title: "設定",
    apiUrlNotSet: "（未設定・相対パス）",
  },
  systemInfo: {
    title: "システム情報",
    tabArchitecture: "アーキテクチャ",
    tabCostEffect: "費用対効果",
    tabOperations: "運用設計",
  },
};

// ---------------------------------------------------------------------------
// English
// ---------------------------------------------------------------------------

const en: TranslationStrings = {
  app: {
    title: "FlowGuard AI",
    subtitle: "Comprehensive Event Risk Simulator",
    joinCodeLabel: (code: string) => `Join code: ${code}`,
    leaveProject: "Leave project",
    copyCodeLabel: "Copy code",
    settingsLabel: "Settings",
    tipCopy: "Use the copy button next to the code to copy the join code and share it with others.",
    tipAssist: "The robot button in the bottom-right is AI Assist—ask about how to use the app or next steps.",
    tipClose: "Close",
  },
  landing: {
    subtitle: "Event Risk Assessment & Sharing",
    description: "Create a project to share with stakeholders, or join an existing project with a participation code.",
    newProject: "Create new plan",
    newProjectDescription: "Start a new simulation environment",
    joinSectionLabel: "Join with code",
    joinButton: "Join",
    joinPlaceholder: "ABC123",
    codeLabel: "Project access code",
    codeHint: "* Enter the 6-character code you were given",
    welcomeTitle: "Welcome",
    welcomeSubtitle: "Choose an option to start your session",
    orDivider: "or",
    systemStatus: "System operational",
    help: "Help",
    terms: "Terms",
    privacy: "Privacy",
    heroHeadline1: "Next-generation event",
    heroHeadline2: "risk simulation",
    heroSubtitle: "AI analyzes risks from multiple angles. We support safe event operations.",
    feature1: "Real-time analysis",
    feature2: "Secure simulation",
    feature3: "Real-time sharing with your team",
    errorFirebase: "Sharing is not configured. Set VITE_FIREBASE_* to enable.",
    errorEnterCode: "Please enter a participation code.",
    errorCodeNotFound: "Participation code not found.",
    errorCreateFailed: "Failed to create project.",
    errorJoinFailed: "Failed to join.",
    firebaseHint: "Firebase configuration is required for sharing. New project and Join are unavailable.",
  },
  steps: {
    eventConfig: "Event Configuration",
    areaDesignation: "Area Designation",
    riskAnalysis: "Risk Analysis",
  },
  mission: {
    title: "Event Configuration",
    basicInfo: "Basic Information",
    eventName: "Event Name",
    eventNamePlaceholder: "e.g. Summer Sonic 2026",
    eventLocation: "Event Location",
    eventLocationPlaceholder: "e.g. Makuhari Messe, Chiba",
    eventType: "Event Type",
    dateTime: "Date & Time",
    expectedAttendance: "Expected Attendance",
    audienceType: "Audience Type",
    weatherSection: "Weather Conditions",
    temperature: "Temperature",
    precipitationProbability: "Precipitation Probability",
    weatherCondition: "Weather Condition",
    additionalNotes: "Additional Notes",
    additionalNotesPlaceholder:
      "Special considerations, nearby landmarks, known hazards ...",
    nextButton: "Next: Designate Area",
    role: "Role (viewpoint for display & reports)",
    alertThreshold: "Alert threshold",
    templates: "Scenario templates",
    templateLabel: "Template",
    eventDateLabel: "Event date",
    startTimeLabel: "Start time",
    endTimeLabel: "End time",
    applyTemplate: "Apply template",
    noTemplateOption: "None",
    userRoles: { organizer: "Organizer", security: "Security", local_gov: "Local gov.", venue_manager: "Venue manager" },
    alertOptions: { conservative: "Conservative", standard: "Standard", aggressive: "Aggressive" },
    alertThresholdDescription: "Sensitivity for risk detection. Conservative = detect more (stricter), Standard = balanced, Aggressive = focus on higher-priority risks. Affects how many risks are listed and which recommendations appear.",
    alertThresholdHelpLabel: "Help",
  },
  area: {
    title: "Designate Event Area",
    back: "Back",
    reset: "Reset",
    completePolygon: "Complete Polygon",
    runSimulation: "Run Simulation",
    instruction:
      "Click on the map to place polygon vertices around the event area. Place at least 3 points, then click 'Complete Polygon'.",
    pointCount: (n: number) => `${n} point${n !== 1 ? "s" : ""}`,
  },
  loading: {
    title: "Analysing Event Risks",
    description:
      "The AI is evaluating crowd safety, traffic, environmental, and operational risks...",
    steps: [
      "Analysing geographic features...",
      "Evaluating crowd safety risks...",
      "Evaluating traffic & logistics risks...",
      "Evaluating environmental & health risks...",
      "Evaluating operational risks...",
      "Inferring cascading risks...",
      "Formulating mitigation strategies...",
      "Generating final report...",
    ],
    complete: "Complete",
  },
  error: {
    startOver: "Start Over",
    retryButton: "Retry",
    rateLimitHint: "API rate limit reached. Please wait a moment and try again.",
    timeoutHint: "The analysis took too long. Try again, or use a smaller area and run again.",
    nextActionHint: "Retry: run again with the same setup. Start Over: change event or area and try again.",
    areaNotSpecified: "Area is not specified",
    runFailed: "Execution failed",
  },
  dashboard: {
    risksIdentified: (n: number) => `${n} Risks Identified`,
    newSimulation: "New Simulation",
    riskItems: (n: number) => `Risk Items (${n})`,
    exportPdf: "Export PDF Report",
    view2D: "2D Map",
    view3D: "3D Map",
    weatherLabel: "Weather (day of event)",
    weatherTempLabel: "Avg temp",
    weatherTempUnit: "\u00B0", // degree symbol
    weatherPrecipLabel: "Precip prob",
    sortLabel: "Sort by",
    sortBySeverity: "Severity",
    sortByImportance: "Importance",
    sortByUrgency: "Urgency",
    sortByExecutionDifficulty: "Execution difficulty",
    tabAnalysis: "Analysis",
    tabMeasuresActions: "Measures & next actions",
    tabTodoCompare: "ToDo・Compare・Memo",
    pinAdd: "Add pin",
    pinAddModeBanner: "Adding pin — click the map to place",
    pinAddModeOff: "Exit pin-add mode",
    mapTodoAdd: "Add To-Do on map",
    mapTodoAddModeBanner: "Fix here — click the map to add a To-Do",
    mapTodoAddModeOff: "Exit To-Do-add mode",
    mapTodoTitleLabel: "Task (e.g. Put up sign, Fix step)",
    mapTodoTitlePlaceholder: "e.g. Put up sign here",
    riskLayerTitle: "Risk layers",
    priorityRisks: (n: number) => `Priority risks (${n})`,
    riskSearchPlaceholder: "Search risks...",
    systemOk: "System OK",
    lastUpdated: "Last updated",
    riskLevelHigh: "High risk",
    riskLevelMedium: "Medium risk",
    riskLevelLow: "Low risk",
    heatmapLegendTitle: "Crowd density heatmap",
    heatmapLow: "Low",
    heatmapHigh: "High",
    allCategories: "All",
    hideResolvedRisks: "Hide resolved risks",
  },
  pins: {
    nameLabel: "Name",
    namePlaceholder: "Pin name (required)",
    memoLabel: "Memo",
    memoPlaceholder: "Memo (optional)",
    typeLabel: "Type",
    typeOptionSecurity: "Security",
    typeOptionDanger: "Danger",
    typeOptionCaution: "Caution",
    typeOptionGuidance: "Guidance",
    typeOptionOther: "Other",
    save: "Save",
    cancel: "Cancel",
    createdBy: "Created by",
    updatedAt: "Updated",
    edit: "Edit",
    delete: "Delete",
    detailTitle: "Pin details",
    deleteConfirm: "Delete this pin?",
  },
  layer: {
    overallRiskScore: "Overall Risk Score",
    outOf10: "/ 10",
    originalScore: "was",
    critical: "Critical",
    high: "High",
    moderate: "Moderate",
    low: "Low",
    riskLayers: "Risk Layers",
    trafficLayerHint: "Shows Google Maps traffic on the map",
    mapDisplay: "Map display",
    mapTypeRoadmap: "Map (labels)",
    mapTypeRoadmapNoLabels: "Map (no labels)",
    mapTypeSatellite: "Photo (no labels)",
    mapTypeHybrid: "Photo (labels)",
    trafficLegendTitle: "Traffic layer",
    trafficLegendWeekday: (weekday: string) =>
      `Showing traffic as reference for event day (${weekday}).`,
    trafficSmooth: "Smooth",
    trafficModerate: "Moderate",
    trafficCongested: "Congested",
  },
  weekdays: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
  detail: {
    analysisSummary: "Analysis Summary",
    topRecommendations: "Top Recommendations",
    clickToView: "Select a risk from the list to view its details.",
    location: "Location",
    severity: "Severity",
    probability: "Probability",
    veryHigh: "Very High",
    high: "High",
    moderate: "Moderate",
    low: "Low",
    veryLow: "Very Low",
    mitigationActions: "Mitigation Actions",
    cascadingRisks: "Cascading Risks",
    evidence: "Evidence",
    factorBreakdown: "Score factor breakdown",
    description: "Description",
  },
  eventTypes: {
    music_festival: "Music Festival",
    fireworks: "Fireworks Display",
    sports_event: "Sports Event",
    exhibition: "Exhibition",
    other: "Other",
  },
  audienceTypes: {
    youth: "Youth (18-30)",
    family: "Family",
    elderly: "Elderly (65+)",
    mixed: "Mixed",
  },
  weatherConditions: {
    clear: "Clear",
    cloudy: "Cloudy",
    rain: "Rain",
    heavy_rain: "Heavy Rain",
    storm: "Storm",
    snow: "Snow",
    extreme_heat: "Extreme Heat",
  },
  riskCategories: {
    crowd_safety: "Crowd Safety",
    traffic_logistics: "Traffic & Logistics",
    environmental_health: "Environmental & Health",
    operational: "Operational",
    visibility: "Visibility & Blind Spots",
    legal_compliance: "Legal & Compliance",
  },
  detailExtra: {
    mitigationEffectTitle: "Mitigation effect (before → after)",
    improvement: (val: string) => `−${val} improved`,
    worsening: (val: string) => `+${val}`,
    dangerPoints: "Danger points",
    dangerCountUnit: "",
    riskItemsLabel: "Risk items",
    congestionPeakShort: (min: string) => `Congestion peak: ~${min} min shorter`,
    todoCheckRecalcHint: "When you complete the ToDo, this is recalculated.",
    nextActionsTitle: "Next actions to consider",
    reasonLabel: "Reason",
    adopt: "Adopt",
    reject: "Reject",
    defer: "Defer",
    rejectedHint: "Rejected suggestions will not be shown again.",
    referenceConditions: "Reference conditions",
    timeSlotVenue: "Time slot / event date",
    venueArea: "Venue / area",
    conditionsNote: "Attendance and venue conditions are based on the event settings above.",
    linkToTodo: "Show related ToDo",
    showMeasuresAction: "Show mitigation actions",
    decisionAdopted: "Adopted",
    decisionRejected: "Rejected",
    decisionDeferred: "Deferred",
    reasonPlaceholder: "Reason or note (optional)",
    decisionLog: "Change / decision log",
    logCount: (n: number) => `${n} item(s)`,
    routesSection: "Routes & layout",
    routesRecommendation: (rec: number, rest: number) => `Recommended routes: ${rec}, restriction lines: ${rest}.`,
    staffRecommendation: (n: number) => `Staff placement recommended at ${n} point(s) (expected congestion).`,
    timeSlotAttention: "Time slots to watch & measures",
    timeSlotPeakNote: (label: string, score: string) => `Higher risk time slot: "${label}" (score ${score}). Consider extra staff, route review, or entry limits for this period.`,
    compositeRisks: "Composite risks",
    bottlenecks: "Bottlenecks",
    timeSlotGrid: "Risk by time slot",
    scoreLabel: "Score",
    decisionSectionTitle: "Decision on this proposal",
    noMitigationMessage: "No recommended actions.",
    alternativesTitle: "Alternatives",
    tradeoffsTitle: "Trade-offs",
    alternativeHint: "Run a new simulation with different event settings or area to get alternative proposals.",
    factorContribution: (label: string, pct: string) => `${label}: ${pct}% contributes to score`,
    analysisEffectiveSummary: (n: number) => `${n} mitigation(s) completed. Risk score and time-slot risks are updated according to mitigations.`,
    analysisBeforeMitigationLabel: "Analysis (before mitigations)",
  },
  whatif: {
    title: "What-if comparison (Cases A/B/C)",
    description: "Compare cases with different attendance, time slots, or conditions and adopt the most effective option.",
    currentCase: "Current",
    addCase: "Add case",
    caseLabel: (n: number) => `Case ${["A", "B", "C", "D"][n] ?? String(n + 1)}`,
    tableCase: "Case",
    tableScore: "Score",
    tableDanger: "Danger",
    tablePeak: "Peak",
    peakTimeSlot: "Peak time slot",
    recommended: "Recommended",
    adopt: "Adopt",
    recommendedHint: (label: string) => `"${label}" improves over the current case (score and danger points). Adopt to apply its ToDo list.`,
    dialogTitle: "Add case",
    dialogDescription: "Copy current settings and run a simulation with different attendance, time, etc.",
    caseName: "Case name",
    runAndAdd: "Run and add case",
    running: "Running…",
    expectedAttendance: "Expected attendance",
    startTime: "Start time",
    endTime: "End time",
    audienceType: "Audience type",
    additionalNotes: "Additional notes",
    cancel: "Cancel",
  },
  siteCheck: {
    title: "Site check notes",
    description: "Checklist: entrance, routes, steps, visibility, queues, first aid, staff. Notes are included in the PDF report.",
    linkToDo: "Link to ToDo",
    memoPlaceholder: "Enter check note",
  },
  todo: {
    listTitle: "Mitigation ToDo list",
    completedPriority: (total: number, done: number) => `${total} items (${done} done), by priority`,
    assigneeLabel: "Assignee",
    assigneeOtherPlaceholder: "Enter assignee name",
    assigneeOptions: ["Security", "Venue", "Organizer", "Guidance", "Medical", "Other"],
    assigneeOther: "Other",
    noAssigneeOption: "Unassigned",
    onSiteChecked: "Site verified",
    emptyListHint: "Items you adopt in \"Next actions to consider\" (Analysis tab) will appear here.",
  },
  dashboardExtra: {
    noRisksMessage: "No risks detected. Try changing the area or settings and run again.",
    pdfFull: "Full report",
    pdfOnePage: "One-page summary",
    translatingContent: "Translating…",
  },
  proposals: {
    reasonUnfinishedTodo: (riskTitle: string) => `Key mitigation not done. To reduce risk: "${riskTitle}".`,
    reasonHighImpact: "High-priority mitigation not yet done.",
    titleDefault: "Implement mitigation",
    reasonOverdue: (dueBy: string) => `Past due (${dueBy}). Early action recommended.`,
    titleHighSlot: (label: string) => `Higher risk in time slot: ${label}`,
    reasonHighSlot: (score: string) => `Time-slot score: ${score}. Consider staff check and entry limits.`,
  },
  assist: {
    title: "AI Assist",
    greeting: "Hello! If you have any questions about how to use FlowGuard AI or what a screen does, feel free to ask.",
    placeholder: "Type a message…",
    send: "Send",
    close: "Close",
    loading: "Getting answer…",
    error: "An error occurred.",
  },
  settings: {
    title: "Settings",
    apiUrlNotSet: "(not set / relative path)",
  },
  systemInfo: {
    title: "System information",
    tabArchitecture: "Architecture",
    tabCostEffect: "Cost-effectiveness",
    tabOperations: "Operations",
  },
};

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

export const translations: Record<Locale, TranslationStrings> = { ja, en };
