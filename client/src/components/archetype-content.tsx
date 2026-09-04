export const CORE_CHARACTERISTIC_COUNT = 4;

export const ARCHETYPE_DISPLAY_ORDER = [
  "Sharpshooter",
  "Shot Creator",
  "Floor General",
  "Lockdown Defender",
  "Athletic Slasher",
  "Playmaking Wing",
  "Two-Way Player",
  "Swiss Army Knife",
  "Rim Protector",
  "Stretch Big",
] as const;

export function sortArchetypeDefinitions<T extends { name: string }>(definitions: T[]): T[] {
  const order = new Map<string, number>(ARCHETYPE_DISPLAY_ORDER.map((name, index) => [name, index]));
  return [...definitions].sort((a, b) => {
    const aOrder = order.get(a.name) ?? ARCHETYPE_DISPLAY_ORDER.length;
    const bOrder = order.get(b.name) ?? ARCHETYPE_DISPLAY_ORDER.length;
    return aOrder - bOrder;
  });
}

const ASSESSMENT_ARCHETYPE_DEFINITION_IDS: Record<string, string> = {
  "Sharpshooter": "sharpshooter",
  "Shot Creator": "slasher",
  "Lockdown Defender": "two-way-lockdown",
  "Athletic Slasher": "glass-cleaner",
  "Playmaking Wing": "versatile-wing",
  "Two-Way Player": "two-way-player",
  "Swiss Army Knife": "playmaker",
};

/**
 * Archetype descriptions and characteristics are authored in the archetype
 * definitions returned by the API. Keep the four-characteristic limit here so
 * every surface presents the same content.
 */
export function getCoreCharacteristics(traits: string[] | null | undefined): string[] {
  return (traits ?? []).filter(Boolean).slice(0, CORE_CHARACTERISTIC_COUNT);
}

export function findArchetypeDefinition<T extends { id: string; name: string }>(
  definitions: T[],
  assessmentLabel: string | null | undefined,
): T | undefined {
  if (!assessmentLabel) return undefined;
  const mappedId = ASSESSMENT_ARCHETYPE_DEFINITION_IDS[assessmentLabel];
  const normalizedLabel = assessmentLabel.replace(/^the\s+/i, "").trim().toLowerCase();
  return definitions.find(definition => {
    const normalizedName = definition.name.replace(/^the\s+/i, "").trim().toLowerCase();
    const normalizedId = definition.id.replace(/-/g, " ").toLowerCase();
    return definition.id === mappedId || normalizedName === normalizedLabel || normalizedId === normalizedLabel;
  });
}