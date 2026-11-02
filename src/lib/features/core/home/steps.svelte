<script lang="ts">
	import { cn } from "$lib/utils/style";

	let { class: className }: { class?: string } = $props();

	const headingId = $props.id();

	const STEPS = [
		{ title: "Sign in", body: "One account keeps your games and rating." },
		{
			title: "Pick a game",
			body: "Get matched with anyone waiting, or share a code with a friend."
		},
		{ title: "Play live", body: "Every move shows on both screens as it happens." }
	];
</script>

<section class={cn("flex flex-col gap-4 border-t pt-8", className)}>
	<h2 id={headingId} class="text-sm font-semibold">How it works</h2>
	<ol aria-labelledby={headingId} class="grid gap-4 sm:grid-cols-3">
		{#each STEPS as step, i (step.title)}
			<li class="flex gap-3">
				<span
					class="flex size-7 shrink-0 items-center justify-center rounded-full border font-mono text-caption tabular-nums"
					aria-hidden="true"
				>
					{i + 1}
				</span>
				<span class="flex min-w-0 flex-col gap-1">
					<span class="font-medium whitespace-nowrap">{step.title}</span>
					<span class="text-sm text-muted-foreground">{step.body}</span>
				</span>
			</li>
		{/each}
	</ol>
</section>
