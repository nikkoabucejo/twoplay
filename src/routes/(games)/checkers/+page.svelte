<script lang="ts">
	import { Check, Crown, Link, LogIn, Plus } from "@lucide/svelte";
	import { useMutation, useQuery } from "convex-svelte";
	import { goto } from "$app/navigation";
	import { Button } from "$lib/components/ui";
	import { getClerkAuth } from "$lib/services/auth";
	import { api } from "../../../../convex/_generated/api.js";

	const auth = getClerkAuth();
	const createRoom = useMutation(api.rooms.create);

	let joinCode = $state("");
	let error = $state<string | null>(null);
	let creating = $state(false);
	let createdCode = $state<string | null>(null);
	let copied = $state(false);
	let copiedTimeout: ReturnType<typeof setTimeout> | undefined;

	const createdRoom = useQuery(api.rooms.get, () => (createdCode ? { code: createdCode } : "skip"));

	$effect(() => {
		if (createdCode && createdRoom.data?.players[1]) goto(`/checkers/${createdCode}`);
	});

	async function handleCreate() {
		error = null;
		creating = true;
		try {
			createdCode = await createRoom({ gameType: "checkers" });
		} catch (err) {
			error = err instanceof Error ? err.message : "Could not create a room";
		} finally {
			creating = false;
		}
	}

	function handleJoin(event: SubmitEvent) {
		event.preventDefault();
		const code = joinCode.trim().toUpperCase();
		if (code) goto(`/checkers/${code}`);
	}

	function copyInviteLink() {
		if (!createdCode) return;
		navigator.clipboard.writeText(`${location.origin}/checkers/${createdCode}`);
		copied = true;
		clearTimeout(copiedTimeout);
		copiedTimeout = setTimeout(() => (copied = false), 1500);
	}
</script>

<div class="flex flex-1 flex-col items-center justify-center gap-8 px-4 py-8 text-center">
	<div class="flex flex-col items-center gap-3">
		<div
			class="flex size-14 items-center justify-center rounded-full bg-muted/40 shadow-sm backdrop-blur-sm"
		>
			<Crown class="size-7" />
		</div>
		<h1 class="text-2xl font-bold tracking-tight">Checkers</h1>
	</div>

	{#if !auth.isSignedIn}
		<div class="flex flex-col items-center gap-3">
			<p class="text-muted-foreground">Sign in to create or join a room.</p>
			<Button onclick={() => auth.signIn()}>Sign in</Button>
		</div>
	{:else}
		<div
			class="flex w-full max-w-xs flex-col items-center gap-6 rounded-2xl border bg-muted/40 p-6 backdrop-blur-sm"
		>
			<div class="flex w-full items-center gap-2">
				{#if createdCode}
					<p
						class="flex h-9 flex-1 items-center justify-center rounded-md border bg-background/60 font-mono tracking-widest"
					>
						{createdCode}
					</p>
					<Button
						variant="outline"
						size="icon"
						onclick={copyInviteLink}
						aria-label="Copy invite link"
					>
						{#if copied}
							<Check />
						{:else}
							<Link />
						{/if}
					</Button>
				{:else}
					<Button class="w-full" onclick={handleCreate} disabled={creating}>
						<Plus />
						{creating ? "Creating room…" : "Create room"}
					</Button>
				{/if}
			</div>

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
				<Button type="submit" variant="outline" class="w-full" disabled={!joinCode.trim()}>
					<LogIn />
					Join room
				</Button>
			</form>

			{#if error}
				<p class="text-sm text-destructive">{error}</p>
			{/if}
		</div>
	{/if}
</div>
