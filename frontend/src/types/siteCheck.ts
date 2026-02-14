/**
 * 現場確認メモテンプレート: 入口/導線/段差/視界/待機列/救護/誘導員配置 等
 * ToDo と関連付け可能。PDF 詳細に自動差し込み。
 */

export const SITE_CHECK_TEMPLATE: { id: string; label: string; category: string }[] = [
  { id: "entrance", label: "入口・ゲート", category: "導線" },
  { id: "routes", label: "導線・動線", category: "導線" },
  { id: "steps", label: "段差・傾斜", category: "施設" },
  { id: "visibility", label: "視界・死角", category: "施設" },
  { id: "queue", label: "待機列・混雑ポイント", category: "導線" },
  { id: "first_aid", label: "救護・医療体制", category: "運営" },
  { id: "staff", label: "誘導員配置", category: "運営" },
  { id: "signage", label: "案内表示・サイン", category: "施設" },
  { id: "evacuation", label: "避難経路・非常口", category: "安全" },
];

export interface SiteCheckItem {
  id: string;
  label: string;
  category: string;
  memo?: string;
  linkedTaskId?: string;
}

export function getDefaultSiteCheckItems(): SiteCheckItem[] {
  return SITE_CHECK_TEMPLATE.map((t) => ({
    id: t.id,
    label: t.label,
    category: t.category,
    memo: "",
    linkedTaskId: undefined,
  }));
}
