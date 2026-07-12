<script lang="ts" module>
	export type EmojiProps = {
		/** Lowercase hex codepoint matching Noto's animated emoji asset naming, e.g. "1f602". */
		codepoint: string;
		/** Accessible name — the emoji conveys no text, so this is its only label. */
		label: string;
		class?: string;
	};
</script>

<script lang="ts">
	import { backOut } from "svelte/easing";
	import { scale } from "svelte/transition";
	import { cn } from "$lib/utils/style";
	import type { AnimationItem } from "lottie-web";

	let { codepoint, label, class: className }: EmojiProps = $props();

	let container = $state<HTMLDivElement>();
	let animation: AnimationItem | undefined;

	// Noto ships each animated emoji as its own Lottie file rather than a single sprite sheet,
	// so it's fetched lazily per instance instead of bundling every codepoint up front. `{#key}`
	// below remounts `container` on every codepoint change, so this effect naturally reruns too.
	$effect(() => {
		const element = container;
		if (!element) return;
		let cancelled = false;

		import("lottie-web").then(({ default: lottie }) => {
			if (cancelled) return;
			animation = lottie.loadAnimation({
				container: element,
				renderer: "svg",
				loop: true,
				autoplay: true,
				path: `https://fonts.gstatic.com/s/e/notoemoji/latest/${codepoint}/lottie.json`
			});
		});

		return () => {
			cancelled = true;
			animation?.destroy();
			animation = undefined;
		};
	});
</script>

<div class={cn("relative size-6", className)} role="img" aria-label={label}>
	{#key codepoint}
		<div
			bind:this={container}
			class="absolute inset-0"
			in:scale={{ duration: 380, start: 0.3, easing: backOut }}
			out:scale={{ duration: 180, start: 0.3 }}
		></div>
	{/key}
</div>
