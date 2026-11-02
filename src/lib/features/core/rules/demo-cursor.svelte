<script lang="ts">
	import { ACCENTS, cn } from "$lib/utils/style";

	let {
		seat,
		label,
		x,
		y,
		isActive = true
	}: {
		seat: 0 | 1;
		label: string;
		/** Position as a fraction of the nearest size container. */
		x: number;
		y: number;
		isActive?: boolean;
	} = $props();
</script>

<!-- Same pointer as a live opponent's cursor. Moved with transform, so it never shifts layout. -->
<div
	class={cn(
		"pointer-events-none absolute top-0 left-0 z-20 ease-in-out motion-safe:transition-[transform,opacity] motion-safe:duration-700",
		!isActive && "opacity-40"
	)}
	style:transform="translate({x * 100}cqw, {y * 100}cqh)"
	data-float
	aria-hidden="true"
>
	<div class="relative -translate-x-0.5 -translate-y-0.5">
		<svg
			viewBox="0 0 24 24"
			class={cn("size-5 drop-shadow-[0_3px_4px_rgba(0,0,0,0.45)]", ACCENTS[seat].text)}
			fill="currentColor"
		>
			<path d="M4 3l6.5 17 2.3-7.2L20 10.6 4 3z" />
		</svg>
		<span
			class={cn(
				"absolute top-4 rounded-md bg-background/95 px-1.5 py-0.5 text-xs leading-none font-semibold whitespace-nowrap shadow-md",
				// Near the right edge the label sits left of the pointer, so the board doesn't clip it.
				x > 0.7 ? "right-4" : "left-4",
				ACCENTS[seat].text
			)}
		>
			{label}
		</span>
	</div>
</div>
