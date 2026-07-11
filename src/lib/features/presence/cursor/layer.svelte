<script lang="ts">
	import type { Snippet } from "svelte";
	import { cn } from "$lib/utils/style";
	import { CursorPresence } from "./cursor.svelte.js";

	let {
		roomCode,
		colorFor,
		class: className,
		children
	}: {
		roomCode: string;
		/** Maps a peer's seat index (-1 if unseated) to a Tailwind text-color class for their cursor. */
		colorFor: (index: number) => string;
		class?: string;
		/** The tracked area — pointer moves over this are what get shared as this player's cursor. */
		children: Snippet;
	} = $props();

	const presence = new CursorPresence(() => roomCode);

	let container = $state<HTMLDivElement>();

	function handlePointerMove(event: PointerEvent) {
		const rect = container?.getBoundingClientRect();
		if (!rect || rect.width === 0 || rect.height === 0) return;
		presence.move(
			(event.clientX - rect.left) / rect.width,
			(event.clientY - rect.top) / rect.height
		);
	}

	$effect(() => () => presence.dispose());
</script>

<!-- Broadcasts pointer position for live cursor presence; purely supplementary, no keyboard equivalent needed. -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
	bind:this={container}
	class={cn("relative", className)}
	onpointermove={handlePointerMove}
	onpointerleave={() => presence.leave()}
>
	{@render children()}

	{#each presence.peers as peer (peer.userId)}
		<svg
			viewBox="0 0 24 24"
			class={cn(
				"pointer-events-none absolute z-50 size-5 -translate-x-0.5 -translate-y-0.5 drop-shadow-sm transition-[left,top] duration-100 ease-linear",
				colorFor(peer.index)
			)}
			style={`left: ${peer.x * 100}%; top: ${peer.y * 100}%;`}
			fill="currentColor"
		>
			<path d="M4 3l6.5 17 2.3-7.2L20 10.6 4 3z" />
		</svg>
	{/each}
</div>
