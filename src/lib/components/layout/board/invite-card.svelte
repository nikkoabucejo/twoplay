<script lang="ts">
	import { Link, Share2 } from "@lucide/svelte";
	import { Button, surfaceClass } from "$lib/components/ui";
	import { ACCENTS, cn } from "$lib/utils/style";
	import { canShare } from "./invite.js";

	let {
		code,
		isHost,
		onCopyLink,
		onShare
	}: {
		code: string;
		/** The seated host gets the code and share buttons; anyone else sees only the wait. */
		isHost: boolean;
		onCopyLink: () => void;
		onShare: () => void;
	} = $props();

	const headlineId = $props.id();
	const isShareable = canShare();
</script>

<div
	class="@container absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-background/60 p-2 backdrop-blur-xs motion-safe:animate-in motion-safe:fade-in-0"
>
	<section
		aria-labelledby={headlineId}
		class={cn(
			surfaceClass,
			"flex w-full max-w-72 flex-col items-center gap-4 rounded-2xl p-5 text-center shadow-2xl motion-safe:animate-in motion-safe:fade-in-0 motion-safe:zoom-in-95"
		)}
	>
		<!-- One seat taken, one open. -->
		<div class="flex items-center gap-2" aria-hidden="true">
			<span class={cn("size-3 rounded-full", ACCENTS[0].bg)}></span>
			<span class="h-px w-10 bg-linear-to-r from-seat-0/60 to-seat-1/60"></span>
			<span class={cn("size-3 rounded-full ring-2 motion-safe:animate-pulse", ACCENTS[1].ring)}
			></span>
		</div>

		<div class="flex flex-col items-center gap-1">
			<h2 id={headlineId} class="text-lg font-semibold">Waiting for an opponent</h2>
			{#if isHost}
				<p class="text-caption text-muted-foreground">Share the code or the link to start.</p>
			{/if}
		</div>

		{#if isHost}
			<p
				class="flex h-12 w-full items-center justify-center rounded-xl border bg-background/50 font-mono text-2xl font-semibold tracking-widest"
			>
				<span class="sr-only">Room code </span>{code}
			</p>
			<div class="flex w-full gap-2">
				<Button variant="outline" size="sm" class="flex-1" onclick={onCopyLink}>
					<Link />
					Copy link
				</Button>
				{#if isShareable}
					<Button variant="outline" size="sm" class="flex-1" onclick={onShare}>
						<Share2 />
						Share
					</Button>
				{/if}
			</div>
		{/if}
	</section>
</div>
