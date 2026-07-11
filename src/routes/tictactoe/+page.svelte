<script lang="ts">
	import { useMutation } from "convex-svelte";
	import { goto } from "$app/navigation";
	import { Header } from "$lib/components/layout";
	import { Button } from "$lib/components/ui";
	import { getClerkAuth } from "$lib/services/auth";
	import { api } from "../../../convex/_generated/api.js";

	const auth = getClerkAuth();
	const createRoom = useMutation(api.rooms.create);

	let joinCode = $state("");
	let error = $state<string | null>(null);
	let creating = $state(false);

	async function handleCreate() {
		error = null;
		creating = true;
		try {
			const code = await createRoom({ gameType: "tictactoe" });
			await goto(`/tictactoe/${code}`);
		} catch (err) {
			error = err instanceof Error ? err.message : "Could not create a room";
		} finally {
			creating = false;
		}
	}

	function handleJoin(event: SubmitEvent) {
		event.preventDefault();
		const code = joinCode.trim().toUpperCase();
		if (code) goto(`/tictactoe/${code}`);
	}
</script>

<div class="flex min-h-svh flex-col items-center justify-center gap-8 px-4 py-8 text-center">
	<Header />

	{#if !auth.isSignedIn}
		<div class="flex flex-col items-center gap-3">
			<p class="text-muted-foreground">Sign in to create or join a room.</p>
			<Button onclick={() => auth.signIn()}>Sign in</Button>
		</div>
	{:else}
		<div class="flex w-full max-w-xs flex-col items-center gap-6">
			<Button onclick={handleCreate} disabled={creating}>
				{creating ? "Creating room…" : "Create room"}
			</Button>

			<div class="flex w-full items-center gap-3 text-xs text-muted-foreground">
				<div class="h-px flex-1 bg-border"></div>
				or
				<div class="h-px flex-1 bg-border"></div>
			</div>

			<form class="flex w-full flex-col items-center gap-3" onsubmit={handleJoin}>
				<input
					type="text"
					placeholder="Room code"
					bind:value={joinCode}
					maxlength={6}
					class="w-full rounded-md border bg-background px-3 py-2 text-center font-mono uppercase tracking-widest"
				/>
				<Button type="submit" variant="outline" disabled={!joinCode.trim()}>Join room</Button>
			</form>

			{#if error}
				<p class="text-sm text-destructive">{error}</p>
			{/if}
		</div>
	{/if}
</div>
