export type PeerCursor = {
	playerId: string;
	name: string;
	/** This player's seat in the room (e.g. 0/1 for X/O), or -1 if not seated. */
	index: number;
	/** Normalized position (0-1) within the tracked area. */
	x: number;
	y: number;
	updatedAt: number;
};
