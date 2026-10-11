/**
 * Privacy-friendly measurement hooks. No tracker is loaded by default - events
 * are dispatched as DOM CustomEvents (`ivxray:<name>`) and pushed onto
 * `window.dataLayer` if one exists, so GA4/Plausible/Umami can be attached
 * later without touching the tools. Attach a listener to record usage:
 *
 *   addEventListener('ivxray:tool_complete', e => console.log(e.detail));
 */
export type ToolEventName =
  | 'tool_start'
  | 'tool_complete'
  | 'result_copy'
  | 'tool_error'
  | 'example_load';

export function track(name: ToolEventName, params: Record<string, string | number | boolean> = {}) {
  try {
    window.dispatchEvent(new CustomEvent(`ivxray:${name}`, { detail: params }));
    const w = window as unknown as { dataLayer?: Record<string, unknown>[] };
    w.dataLayer = w.dataLayer ?? [];
    w.dataLayer.push({ event: name, ...params });
  } catch {
    /* analytics must never break the tool */
  }
}

/** Fire tool_start once per page per tool. */
export function oncePerLoad(name: ToolEventName, params: Record<string, string | number | boolean> = {}) {
  if ((oncePerLoad as unknown as { _fired?: Set<string> })._fired?.has(name)) return;
  ((oncePerLoad as unknown as { _fired?: Set<string> })._fired ??= new Set()).add(name);
  track(name, params);
}
