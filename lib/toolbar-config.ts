export type ToolbarPreferences = {
  order: string[];
  hidden: string[];
  groupByFamily: boolean;
};

export function normalizeToolbar(
  toolIds: readonly string[],
  value?: Partial<ToolbarPreferences>,
): ToolbarPreferences {
  const known = new Set(toolIds),
    order = [...new Set((value?.order ?? []).filter((id) => known.has(id)))];
  for (const id of toolIds) if (!order.includes(id)) order.push(id);
  return {
    order,
    hidden: [...new Set((value?.hidden ?? []).filter((id) => known.has(id)))],
    groupByFamily: value?.groupByFamily !== false,
  };
}

export function moveToolbarItem(
  preferences: ToolbarPreferences,
  id: string,
  direction: -1 | 1,
) {
  const order = [...preferences.order],
    index = order.indexOf(id),
    target = index + direction;
  if (index < 0 || target < 0 || target >= order.length) return preferences;
  [order[index], order[target]] = [order[target], order[index]];
  return { ...preferences, order };
}

export function visibleToolbarIds(preferences: ToolbarPreferences) {
  const hidden = new Set(preferences.hidden);
  return preferences.order.filter((id) => !hidden.has(id));
}
