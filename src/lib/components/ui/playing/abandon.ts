/** The cost of abandoning, for the confirmation. Always "8": the server's rating step isn't exported,
 *  and players at the 100 floor lose less. */
export function abandonMessage({
	round,
	opponentName,
	isRoundLive
}: {
	round: number;
	/** First name of the opponent, or null while the second seat is empty. */
	opponentName: string | null;
	isRoundLive: boolean;
}): string {
	if (opponentName === null) return "No one has joined yet. The room closes.";
	if (!isRoundLive) return "The room closes.";
	return `You'll forfeit round ${round} to ${opponentName} and lose 8 rating points. The room closes.`;
}
