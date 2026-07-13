<script lang="ts">
	import type { Snippet } from "svelte";
	import { fade } from "svelte/transition";
	import { cn } from "$lib/utils/style";
	import { CursorPresence } from "./cursor.svelte.js";

	let {
		roomCode,
		colorFor,
		flip = false,
		class: className,
		children
	}: {
		roomCode: string;
		/** Maps a peer's seat index (-1 if unseated) to a Tailwind text-color class for their cursor. */
		colorFor: (index: number) => string;
		/** Set when this player's view of the tracked area is rotated 180° (e.g. a flipped board), so
		 * positions are mirrored to/from the shared, un-rotated coordinate space other players use. */
		flip?: boolean;
		class?: string;
		/** The tracked area — pointer moves over this are what get shared as this player's cursor. */
		children: Snippet;
	} = $props();

	const presence = new CursorPresence(() => roomCode);

	let container = $state<HTMLDivElement>();

	function handlePointerMove(event: PointerEvent) {
		const rect = container?.getBoundingClientRect();
		if (!rect || rect.width === 0 || rect.height === 0) return;
		const x = (event.clientX - rect.left) / rect.width;
		const y = (event.clientY - rect.top) / rect.height;
		presence.move(flip ? 1 - x : x, flip ? 1 - y : y);
	}

	function handlePointerLeave() {
		presence.leave();
	}

	$effect(() => () => presence.dispose());
</script>

<!-- Broadcasts pointer position for live cursor presence; purely supplementary, no keyboard equivalent needed. -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
	bind:this={container}
	class={cn("relative", className)}
	onpointermove={handlePointerMove}
	onpointerleave={handlePointerLeave}
>
	{@render children()}

	{#each presence.peers as peer (peer.playerId)}
		{@const x = flip ? 1 - peer.x : peer.x}
		{@const y = flip ? 1 - peer.y : peer.y}
		{@const color = colorFor(peer.index)}
		<div
			class="pointer-events-none absolute z-50 -translate-x-0.5 -translate-y-0.5 transition-[left,top] duration-100 ease-linear"
			style={`left: ${x * 100}%; top: ${y * 100}%;`}
			out:fade={{ duration: 400 }}
		>
			<div class="relative">
				<svg
					viewBox="0 0 24 24"
					class={cn("size-5 drop-shadow-[0_3px_4px_rgba(0,0,0,0.45)]", color)}
					fill="currentColor"
				>
					<path d="M4 3l6.5 17 2.3-7.2L20 10.6 4 3z" />
				</svg>
				<span
					class={cn(
						"absolute top-4 left-4 rounded-md bg-background/95 px-1.5 py-0.5 text-xs leading-none font-semibold whitespace-nowrap shadow-md",
						color
					)}
				>
					{peer.name.split(" ")[0]}
				</span>
			</div>
		</div>
	{/each}
</div>
