<script lang="ts">
	import { CountedValue, getAboutBuild } from "./build.svelte.js";

	let {
		value,
		from = 0,
		decimals = 0,
		suffix = ""
	}: { value: number; from?: number; decimals?: number; suffix?: string } = $props();

	const build = getAboutBuild();
	const part = new CountedValue(
		() => value,
		() => from
	);

	const finalText = $derived(`${value}${suffix}`);
	const fromText = $derived(`${from.toFixed(decimals)}${suffix}`);
	const isFromWider = $derived(fromText.length > finalText.length);
</script>

<!-- The invisible copy reserves the widest text, so counting never resizes the box. -->
<span
	class="inline-grid justify-items-start tabular-nums"
	data-build-readout
	{@attach (node) => build.registerReadout(node, part)}
>
	{#if part.value === null}
		{#if isFromWider}
			<span class="invisible col-start-1 row-start-1" aria-hidden="true">{fromText}</span>
		{/if}
		<span class="col-start-1 row-start-1">{finalText}</span>
	{:else}
		<span class="sr-only">{finalText}</span>
		<span class="invisible col-start-1 row-start-1" aria-hidden="true">
			{isFromWider ? fromText : finalText}
		</span>
		<span class="col-start-1 row-start-1" aria-hidden="true">
			{part.value.toFixed(decimals)}{suffix}
		</span>
	{/if}
</span>
