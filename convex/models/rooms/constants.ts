/** Per-player starting clock bank when a room doesn't specify its own time control. */
export const DEFAULT_TIME_CONTROL_MS = 5 * 60_000;
const MIN_TIME_CONTROL_MS = 10_000;
const MAX_TIME_CONTROL_MS = 60 * 60_000;

/** Clamps a client-supplied time control into a sane range — a raw client value could otherwise be
 *  zero/negative (instant loss for whoever moves first) or `NaN` (silently disables timeouts). */
export function resolveTimeControlMs(timeControlMs: number | undefined): number {
	if (timeControlMs === undefined || !Number.isFinite(timeControlMs))
		return DEFAULT_TIME_CONTROL_MS;
	return Math.min(MAX_TIME_CONTROL_MS, Math.max(MIN_TIME_CONTROL_MS, timeControlMs));
}
