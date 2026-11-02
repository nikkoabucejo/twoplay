export type FeedScroll = { scrollTop: number; scrollHeight: number; clientHeight: number };
export type FeedEdges = { top: boolean; bottom: boolean };

/** Sub-pixel scroll positions on zoomed or high-DPI screens can stop short of the true end. */
const TOLERANCE_PX = 1;

export function feedEdges({ scrollTop, scrollHeight, clientHeight }: FeedScroll): FeedEdges {
	return {
		top: scrollTop > TOLERANCE_PX,
		bottom: scrollHeight - clientHeight - scrollTop > TOLERANCE_PX
	};
}
