<script lang="ts">
	import { Check, Link, LogIn, Plus } from "@lucide/svelte";
	import { useMutation, useQuery } from "convex-svelte";
	import type { Component } from "svelte";
	import { goto } from "$app/navigation";
	import { Button, Tabs } from "$lib/components/ui";
	import { getClerkAuth } from "$lib/services/auth";
	import type { GameType } from "../../../../../convex/models/games/index.js";
	import { DEFAULT_TIME_CONTROL_MS } from "../../../../../convex/models/rooms/index.js";
	import { api } from "../../../../../convex/_generated/api.js";

	/** Minutes offered for each player's starting clock bank. The default is derived from the server's
	 *  `DEFAULT_TIME_CONTROL_MS` (convex/models/rooms/index.ts) so the two can't drift out of sync. */
	const TIME_CONTROL_MINUTES = [3, 5, 10] as const;
	const DEFAULT_TIME_CONTROL_MINUTES = DEFAULT_TIME_CONTROL_MS / 60_000;

	let {
		gameType,
		title,
		icon: Icon
	}: {
		/** Also doubles as the route base path — every game's lobby lives at `/${gameType}`. */
		gameType: GameType;
		title: string;
		icon: Component<{ class?: string }>;
	} = $props();

	const auth = getClerkAuth();
	const createRoom = useMutation(api.models.rooms.index.create);

	let joinCode = $state("");
	let error = $state<string | null>(null);
	let creating = $state(false);
	let timeControlMinutes = $state<number>(DEFAULT_TIME_CONTROL_MINUTES);
	let createdCode = $state<string | null>(null);
	let copied = $state(false);
	let copiedTimeout: ReturnType<typeof setTimeout> | undefined;

	const createdRoom = useQuery(api.models.rooms.index.get, () =>
		createdCode ? { code: createdCode } : "skip"
	);

	$effect(() => {
		if (createdCode && createdRoom.data?.players[1]) goto(`/${gameType}/${createdCode}`);
	});

	async function handleCreate() {
		error = null;
		creating = true;
		try {
			createdCode = await createRoom({
				type: gameType,
				timeControlMs: timeControlMinutes * 60_000
			});
		} catch (err) {
			error = err instanceof Error ? err.message : "Could not create a room";
		} finally {
			creating = false;
		}
	}

	function handleJoin(event: SubmitEvent) {
		event.preventDefault();
		const code = joinCode.trim().toUpperCase();
		if (code) goto(`/${gameType}/${code}`);
	}

	function copyInviteLink() {
		if (!createdCode) return;
		navigator.clipboard.writeText(`${location.origin}/${gameType}/${createdCode}`);
		copied = true;
		clearTimeout(copiedTimeout);
		copiedTimeout = setTimeout(() => (copied = false), 1500);
	}
</script>

<div class="flex flex-1 flex-col items-center justify-center gap-8 px-4 py-8 text-center">
	<div class="flex flex-col items-center gap-3">
		<Icon class="size-10" />
		<h1 class="text-2xl font-bold tracking-tight">{title}</h1>
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
			<Tabs
				items={TIME_CONTROL_MINUTES.map((minutes) => ({ value: minutes, label: `${minutes} min` }))}
				value={timeControlMinutes}
				onValueChange={(minutes) => (timeControlMinutes = minutes)}
				disabled={!!createdCode}
				aria-label="Starting clock per player"
			/>

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
