/**
 * constants.ts — Shared visual constants for the Atlas Ink Dashboard
 *
 * STATUS_ICON and STATUS_COLOR maps used by SidebarPanel and InspectorPanel.
 */

export const STATUS_ICON: Record<string, string> = {
  active:   '●',
  paused:   '◐',
  stable:   '◆',
  complete: '✓',
  planning: '○',
  blocked:  '✗',
};

export const STATUS_COLOR: Record<string, string> = {
  active:   'green',
  paused:   'yellow',
  stable:   'cyan',
  complete: 'gray',
  planning: 'blue',
  blocked:  'red',
};

/** Look up the status icon for a given status string, with fallback. */
export function statusIcon(status: string): string {
  return STATUS_ICON[status] ?? '○';
}

/** Look up the status color for a given status string, with fallback. */
export function statusColor(status: string): string {
  return STATUS_COLOR[status] ?? 'white';
}
