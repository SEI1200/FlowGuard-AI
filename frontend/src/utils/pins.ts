// ---------------------------------------------------------------------------
// FlowGuard AI - Pin type constants and helpers (DRY for map pins)
// ---------------------------------------------------------------------------

export const PIN_TYPE_IDS = ["security", "danger", "caution", "guidance", "other"] as const;
export type PinTypeId = (typeof PIN_TYPE_IDS)[number];

export interface PinTypeLabels {
  typeOptionSecurity: string;
  typeOptionDanger: string;
  typeOptionCaution: string;
  typeOptionGuidance: string;
  typeOptionOther: string;
}

const PIN_TYPE_LABEL_KEYS: Record<string, keyof PinTypeLabels> = {
  security: "typeOptionSecurity",
  danger: "typeOptionDanger",
  caution: "typeOptionCaution",
  guidance: "typeOptionGuidance",
  other: "typeOptionOther",
};

/** Returns the display label for a pin type using the given translations. */
export function getPinTypeLabel(type: string | undefined, labels: PinTypeLabels): string {
  if (!type) return labels.typeOptionOther;
  const key = PIN_TYPE_LABEL_KEYS[type];
  return key ? labels[key] : type;
}
