<script lang="ts" module>
	import {
		ChessBishop,
		ChessKing,
		ChessKnight,
		ChessPawn,
		ChessQueen,
		ChessRook,
		type IconProps
	} from "@lucide/svelte";
	import type { Component } from "svelte";
	import { seatOfColor } from "../../../../../convex/models/games/chess/rules.js";
	import { ACCENTS, cn } from "$lib/utils/style";
	import type { Piece } from "./types.js";

	const ICONS: Record<Piece["type"], Component<IconProps>> = {
		k: ChessKing,
		q: ChessQueen,
		r: ChessRook,
		b: ChessBishop,
		n: ChessKnight,
		p: ChessPawn
	};

	export type ChessPieceProps = { piece: Piece; class?: string };
</script>

<script lang="ts">
	let { piece, class: className }: ChessPieceProps = $props();

	const Icon = $derived(ICONS[piece.type]);
</script>

<!-- A faint fill keeps the silhouette without hiding Lucide's interior lines. -->
<Icon
	strokeWidth={1.25}
	class={cn("fill-current/15", ACCENTS[seatOfColor(piece.color)].text, className)}
/>
