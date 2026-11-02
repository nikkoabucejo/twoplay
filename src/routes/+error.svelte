<script lang="ts">
	import { page } from "$app/state";
	import { Page } from "$lib/components/layout";
	import { Button, Meta } from "$lib/components/ui";

	const isNotFound = $derived(page.status === 404);
	const heading = $derived(isNotFound ? "Page not found" : "Something went wrong");
	const message = $derived(
		isNotFound
			? "This page doesn't exist or has moved."
			: "This page couldn't load. Try again in a moment."
	);
</script>

<Meta title={heading} description={message} />

<Page class="items-center justify-center text-center">
	<div class="flex flex-col items-center gap-2">
		<p class="font-mono text-5xl font-bold text-muted-foreground tabular-nums">{page.status}</p>
		<h1 class="text-2xl font-bold tracking-tight">{heading}</h1>
		<p class="text-sm text-muted-foreground">{message}</p>
		<div class="mt-4 flex gap-2">
			<Button href="/play">New game</Button>
			<Button href="/lobby" variant="outline">Lobby</Button>
		</div>
	</div>
</Page>
