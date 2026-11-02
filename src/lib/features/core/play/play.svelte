<script lang="ts">
	import { useMutation, useQuery } from "convex-svelte";
	import { untrack } from "svelte";
	import { goto } from "$app/navigation";
	import { Page } from "$lib/components/layout";
	import {
		Beacon,
		Button,
		Emblem,
		Gate,
		Skeleton,
		Spinner,
		Tabs,
		getToaster,
		type TabItem
	} from "$lib/components/ui";
	import { GAME_TYPES, GAMES } from "$lib/features/play";
	import { getMood } from "$lib/features/presence";
	import { getClerkAuth } from "$lib/services/auth";
	import { getPreferences, type PlayMinutes, type PlayOpponent } from "$lib/utils/storage";
	import { cn } from "$lib/utils/style";
	import { playView } from "./active-room.js";
	import { copyLink, shareLink } from "./copy-link.js";
	import { formatElapsed } from "./elapsed.js";
	import Choices from "./choices.svelte";
	import type { GameType } from "../../../../../convex/models/games/index.js";
	import { DEFAULT_TIME_CONTROL_MS } from "../../../../../convex/models/rooms/index.js";
	import { api } from "../../../../../convex/_generated/api.js";

	const OPPONENTS: Record<PlayOpponent, { label: string; hint: string }> = {
		anyone: { label: "Anyone", hint: "Matched with the next player looking for a game" },
		friend: { label: "A friend", hint: "Private room. Share a link or code" },
		open: { label: "Open room", hint: "Listed in the lobby for anyone to join" }
	};
	const OPPONENT_TYPES = Object.keys(OPPONENTS) as PlayOpponent[];
	const CLOCK_OPTIONS: TabItem<PlayMinutes>[] = [3, 5, 10].map((minutes) => ({
		value: minutes as PlayMinutes,
		label: `${minutes} min`
	}));
	// Derived from the server's default so the two can't drift apart.
	const DEFAULT_MINUTES = (DEFAULT_TIME_CONTROL_MS / 60_000) as PlayMinutes;

	let { initialGame }: { initialGame?: GameType } = $props();

	const auth = getClerkAuth();
	const toaster = getToaster();
	const preferences = getPreferences();
	const mood = getMood();
	const createRoom = useMutation(api.models.rooms.index.create);
	const abandonRoom = useMutation(api.models.rooms.index.abandon);
	const enqueuePairing = useMutation(api.models.pairings.index.enqueue);
	const cancelPairing = useMutation(api.models.pairings.index.cancel);
	const activeRoom = useQuery(api.models.rooms.index.active, () => (auth.isSignedIn ? {} : "skip"));
	const activeRoomDetail = useQuery(api.models.rooms.index.get, () =>
		activeRoom.data ? { code: activeRoom.data.code } : "skip"
	);
	const queueStatus = useQuery(api.models.pairings.index.status, () =>
		auth.isSignedIn ? {} : "skip"
	);
	const openRooms = useQuery(api.models.rooms.index.lobbies, () => (auth.isSignedIn ? {} : "skip"));
	const ids = $props.id();

	// Shared with the loading skeleton so its cards take the same boxes as the real choices.
	const CHOICE_CLASS = "flex items-center gap-3 rounded-lg px-3 py-2";

	// Seeds the choices once; later changes to `initialGame` shouldn't override the user's own picks.
	const lastPlay = preferences.lastPlay;
	// svelte-ignore state_referenced_locally
	let game = $state<GameType>(initialGame ?? lastPlay?.game ?? "tictactoe");
	let opponent = $state<PlayOpponent>(lastPlay?.opponent ?? "anyone");
	let minutes = $state<PlayMinutes>(lastPlay?.minutes ?? DEFAULT_MINUTES);
	let joinCode = $state("");
	let error = $state<string | null>(null);
	let isCreating = $state(false);
	let isQueuing = $state(false);
	let startedHere = $state(false);
	let queuedMs = $state(0);
	let canShare = $state(false);

	const room = $derived(
		auth.isSignedIn ? (activeRoom.isLoading ? undefined : (activeRoom.data ?? null)) : null
	);
	const seatCount = $derived(
		activeRoomDetail.data ? activeRoomDetail.data.players.filter(Boolean).length : undefined
	);
	const view = $derived(
		playView({
			room,
			seatCount,
			isQueued: queueStatus.data === true,
			startedHere,
			isPending: isCreating || isQueuing
		})
	);
	// A primitive, so effects keyed on it rerun only when the view changes, not on every query update.
	const viewKind = $derived(view.kind);
	const isSetupLocked = $derived(viewKind !== "setup");
	// The server rendered the controls, then the auth client failed to load: the reload prompt takes
	// the controls' box so the page doesn't move.
	const holdsControlsBox = $derived(!auth.isSignedIn && auth.showsMemberNav);
	const isSetupHidden = $derived(
		(viewKind !== "setup" && viewKind !== "pending") || holdsControlsBox
	);
	const roomUrl = $derived(room ? `/${room.type}/${room.code}` : "");

	$effect(() => {
		if (view.redirect) goto(view.redirect);
	});

	$effect(() => {
		if (viewKind !== "queued") return;
		const queuedAt = Date.now();
		queuedMs = 0;
		const interval = setInterval(() => (queuedMs = Date.now() - queuedAt), 1000);
		return () => clearInterval(interval);
	});

	// Best effort: a mutation sent during `pagehide` may not reach the server, which sweeps stale
	// entries. The cleanup also runs when a match moves the view on, so it cancels only on teardown.
	$effect(() => {
		if (viewKind !== "queued") return;
		const leaveQueue = () => cancelPairing({}).catch(() => {});
		window.addEventListener("pagehide", leaveQueue);
		return () => {
			window.removeEventListener("pagehide", leaveQueue);
			if (untrack(() => viewKind) === "queued") leaveQueue();
		};
	});

	$effect(() => {
		if (!mood || viewKind !== "queued") return;
		mood.searching = true;
		return () => (mood.searching = false);
	});

	$effect(() => {
		canShare = typeof navigator.share === "function";
	});

	async function findMatch() {
		isQueuing = true;
		try {
			await enqueuePairing({ type: game, timeControlMs: minutes * 60_000 });
		} catch (err) {
			error = err instanceof Error ? err.message : "Could not join the queue";
		} finally {
			isQueuing = false;
		}
	}

	async function createOwnRoom() {
		startedHere = true;
		isCreating = true;
		try {
			await createRoom({
				type: game,
				timeControlMs: minutes * 60_000,
				visibility: opponent === "open" ? "public" : "private"
			});
		} catch (err) {
			startedHere = false;
			error = err instanceof Error ? err.message : "Could not create a room";
		} finally {
			isCreating = false;
		}
	}

	function start() {
		error = null;
		preferences.setLastPlay({ game, opponent, minutes });
		return opponent === "anyone" ? findMatch() : createOwnRoom();
	}

	async function leaveQueue() {
		error = null;
		try {
			await cancelPairing({});
		} catch (err) {
			error = err instanceof Error ? err.message : "Could not leave the queue";
		}
	}

	function playFriendInstead() {
		opponent = "friend";
		return leaveQueue();
	}

	async function cancelRoom() {
		if (!room) return;
		error = null;
		try {
			await abandonRoom({ code: room.code });
			// Only after the abandon lands: while the room is still active, a reset would redirect into it.
			startedHere = false;
		} catch (err) {
			error = err instanceof Error ? err.message : "Could not cancel the room";
		}
	}

	function join(event: SubmitEvent) {
		event.preventDefault();
		const code = joinCode.trim().toUpperCase();
		if (code) goto(`/${game}/${code}`);
	}

	function copyInviteLink() {
		copyLink(location.origin + roomUrl, { clipboard: navigator.clipboard, toaster });
	}

	function shareInviteLink() {
		shareLink(location.origin + roomUrl, { share: (data) => navigator.share(data), toaster });
	}
</script>

{#snippet startLabel()}
	{#if viewKind === "pending"}
		<span aria-hidden="true" class="inline-flex"><Spinner size="sm" class="text-current" /></span>
		{opponent === "anyone" ? "Finding…" : "Creating…"}
	{:else}
		{opponent === "anyone" ? "Find match" : "Create room"}
	{/if}
{/snippet}

{#snippet gameCard(type: GameType, labelId: string, hintId: string)}
	{@const openCount = openRooms.data?.filter((entry) => entry.type === type).length ?? 0}
	<Emblem icon={GAMES[type].icon} colors={GAMES[type].colors} class="size-9" sparkles={false} />
	<span class="flex min-w-0 flex-1 flex-col">
		<span class="flex items-center gap-2">
			<span id={labelId} class="truncate text-sm font-semibold">{GAMES[type].name}</span>
			{#if openCount > 0}
				<span
					class="flex shrink-0 items-center gap-1 text-caption whitespace-nowrap text-muted-foreground tabular-nums"
				>
					<span class="size-1.5 rounded-full bg-emerald-500"></span>
					{openCount} open
				</span>
			{/if}
		</span>
		<span id={hintId} class="truncate text-caption text-muted-foreground">
			{GAMES[type].description}
		</span>
	</span>
{/snippet}

{#snippet opponentRow(value: PlayOpponent, labelId: string, hintId: string)}
	<span
		class="flex size-4 shrink-0 items-center justify-center rounded-full border border-input"
		aria-hidden="true"
	>
		<span class={cn("size-2 rounded-full bg-foreground", value !== opponent && "invisible")}></span>
	</span>
	<span class="flex min-w-0 flex-col">
		<span id={labelId} class="text-sm font-medium whitespace-nowrap">{OPPONENTS[value].label}</span>
		<span id={hintId} class="truncate text-caption text-muted-foreground">
			{OPPONENTS[value].hint}
		</span>
	</span>
{/snippet}

{#snippet gameChoice()}
	<div class="flex flex-col gap-2">
		<h2 id="{ids}-game" class="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
			Game
		</h2>
		<Choices
			items={GAME_TYPES}
			value={room ? room.type : game}
			onValueChange={(value) => (game = value)}
			disabled={isSetupLocked}
			aria-labelledby="{ids}-game"
			class="grid grid-cols-1 gap-2 sm:grid-cols-2"
			itemClass={CHOICE_CLASS}
		>
			{#snippet choice(type, { labelId, hintId })}
				{@render gameCard(type, labelId, hintId)}
			{/snippet}
		</Choices>
	</div>
{/snippet}

{#snippet setup()}
	<div class="flex flex-col gap-2">
		<h2
			id="{ids}-opponent"
			class="text-xs font-semibold tracking-wide text-muted-foreground uppercase"
		>
			Opponent
		</h2>
		<Choices
			items={OPPONENT_TYPES}
			value={opponent}
			onValueChange={(value) => (opponent = value)}
			disabled={isSetupLocked}
			aria-labelledby="{ids}-opponent"
			class="flex flex-col gap-2"
			itemClass={CHOICE_CLASS}
		>
			{#snippet choice(value, { labelId, hintId })}
				{@render opponentRow(value, labelId, hintId)}
			{/snippet}
		</Choices>
	</div>

	<div class="flex flex-col gap-2">
		<h2
			id="{ids}-clock"
			class="text-xs font-semibold tracking-wide text-muted-foreground uppercase"
		>
			Clock per player
		</h2>
		<Tabs
			items={CLOCK_OPTIONS}
			value={minutes}
			onValueChange={(value) => (minutes = value)}
			disabled={isSetupLocked}
			class="font-mono whitespace-nowrap"
			aria-labelledby="{ids}-clock"
		/>
	</div>

	<div class="flex flex-col gap-2">
		<Button class="w-full" onclick={start} disabled={isSetupLocked}>
			{@render startLabel()}
		</Button>
		<!-- The summary and the error share one line, so an error never moves the controls. -->
		<div class="grid h-4 grid-cols-1 text-center text-caption">
			<p class={cn("col-start-1 row-start-1 truncate text-muted-foreground", error && "invisible")}>
				{GAMES[game].name} · {OPPONENTS[opponent].label} · {minutes} min
			</p>
			<p
				role="alert"
				class={cn("col-start-1 row-start-1 truncate text-destructive", !error && "invisible")}
			>
				{error ?? ""}
			</p>
		</div>
	</div>

	<form class="flex items-center gap-2 border-t pt-4" onsubmit={join}>
		<label for="{ids}-code" class="shrink-0 text-xs whitespace-nowrap text-muted-foreground">
			Have a code?
		</label>
		<input
			id="{ids}-code"
			type="text"
			aria-label="Room code"
			placeholder="Room code"
			autocomplete="off"
			bind:value={joinCode}
			maxlength={6}
			disabled={isSetupLocked}
			class="h-8 min-w-0 flex-1 rounded-md border border-input bg-background/60 px-2.5 font-mono text-sm tracking-widest uppercase outline-none placeholder:font-sans placeholder:tracking-normal placeholder:text-muted-foreground placeholder:normal-case focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50"
		/>
		<Button type="submit" variant="outline" size="sm" disabled={isSetupLocked || !joinCode.trim()}>
			Join
		</Button>
	</form>
{/snippet}

{#snippet waiting(code: string)}
	<div class="flex h-full flex-col justify-center gap-4">
		<div class="flex flex-col gap-1">
			<p class="flex items-center gap-2 text-sm font-semibold whitespace-nowrap" aria-live="polite">
				<Beacon />
				Waiting for your opponent…
			</p>
			<p class="text-caption text-muted-foreground">
				Share the code or link. The game opens when they join.
			</p>
		</div>
		<p
			class="flex h-20 items-center justify-center rounded-xl border border-dashed border-input bg-background/60 font-mono text-3xl font-bold tracking-widest"
		>
			{code}
		</p>
		<div class="grid grid-cols-2 gap-2">
			<Button variant="outline" onclick={copyInviteLink}>Copy link</Button>
			<!-- The slot stays when Share is unsupported, so the row keeps its layout. -->
			{#if canShare}
				<Button variant="outline" onclick={shareInviteLink}>Share</Button>
			{:else}
				<span></span>
			{/if}
		</div>
		<Button variant="ghost" class="text-destructive" onclick={cancelRoom}>Cancel room</Button>
	</div>
{/snippet}

{#snippet queued()}
	<div class="flex h-full flex-col items-center justify-center gap-4 text-center">
		<div class="flex flex-col items-center gap-1" aria-live="polite">
			<p class="flex items-center gap-2 text-sm font-semibold whitespace-nowrap">
				<Beacon />
				Finding a match
			</p>
			<p class="text-caption whitespace-nowrap text-muted-foreground">
				{GAMES[game].name} · {minutes} min
			</p>
		</div>
		<p
			class="relative flex h-20 w-full items-center justify-center overflow-hidden rounded-xl border border-dashed border-input bg-background/60 font-mono text-3xl font-bold tabular-nums"
		>
			<!-- Ripples show only while animating; the dots rest on opposite sides under reduced motion. -->
			<span aria-hidden="true" class="absolute inset-0 flex items-center justify-center">
				<span
					class="absolute size-16 rounded-full border-2 border-seat-0/50 opacity-0 motion-safe:radar-ripple"
				></span>
				<span
					class="absolute size-16 rounded-full border-2 border-seat-1/50 opacity-0 [animation-delay:-1.2s] motion-safe:radar-ripple"
				></span>
				<span class="absolute -translate-x-20 motion-safe:orbit-x">
					<span
						class="block size-2.5 rounded-full bg-seat-0 [animation-delay:-0.6s] motion-safe:orbit-y"
					></span>
				</span>
				<span class="absolute translate-x-20 [animation-delay:-1.2s] motion-safe:orbit-x">
					<span
						class="block size-2.5 rounded-full bg-seat-1 [animation-delay:-1.8s] motion-safe:orbit-y"
					></span>
				</span>
			</span>
			<span class="relative">{formatElapsed(queuedMs)}</span>
		</p>
		<div class="flex w-full flex-col gap-2">
			<Button variant="outline" onclick={playFriendInstead}>Play a friend instead</Button>
			<Button variant="ghost" onclick={leaveQueue}>Cancel</Button>
		</div>
		<p class="text-caption text-muted-foreground">Leaving this page cancels the search.</p>
	</div>
{/snippet}

{#snippet setupSkeleton()}
	<!-- The setup controls' boxes, shown while checking for an active room. Same blocks, gaps,
	     and line boxes as gameChoice and setup, so the controls replace it in place. -->
	<div role="status" data-loading="play" class="col-start-1 row-start-1 flex flex-col gap-4">
		<span class="sr-only">Loading</span>
		<div class="flex flex-col gap-2" aria-hidden="true">
			<Skeleton variant="text" class="h-4 w-12" />
			<div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
				{#each GAME_TYPES as type (type)}
					<div class={cn("rounded-xl border bg-muted/30", CHOICE_CLASS)}>
						<Skeleton class="size-9 shrink-0 rounded-full" />
						<div class="flex min-w-0 flex-1 flex-col">
							<Skeleton variant="text" class="h-5 w-24 max-w-full" />
							<Skeleton variant="text" class="h-4 w-36 max-w-full" />
						</div>
					</div>
				{/each}
			</div>
		</div>
		<div class="flex flex-col gap-2" aria-hidden="true">
			<Skeleton variant="text" class="h-4 w-16" />
			<div class="flex flex-col gap-2">
				{#each OPPONENT_TYPES as value (value)}
					<div class={cn("rounded-xl border bg-muted/30", CHOICE_CLASS)}>
						<Skeleton class="size-4 shrink-0 rounded-full" />
						<div class="flex min-w-0 flex-col">
							<Skeleton variant="text" class="h-5 w-24" />
							<Skeleton variant="text" class="h-4 w-40 max-w-full" />
						</div>
					</div>
				{/each}
			</div>
		</div>
		<div class="flex flex-col gap-2" aria-hidden="true">
			<Skeleton variant="text" class="h-4 w-28" />
			<div class="flex w-full rounded-lg border">
				{#each CLOCK_OPTIONS as option (option.value)}
					<div class="flex flex-1 justify-center px-3 py-1.5">
						<Skeleton variant="text" class="h-4 w-10" />
					</div>
				{/each}
			</div>
		</div>
		<div class="flex flex-col gap-2" aria-hidden="true">
			<Skeleton class="h-9 w-full rounded-lg" />
			<Skeleton variant="text" class="mx-auto h-4 w-40" />
		</div>
		<div class="flex items-center gap-2 border-t pt-4" aria-hidden="true">
			<Skeleton variant="text" class="h-4 w-20 shrink-0" />
			<Skeleton class="h-8 min-w-0 flex-1" />
			<Skeleton class="h-8 w-13 shrink-0" />
		</div>
	</div>
{/snippet}

{#snippet controls()}
	{#if !auth.showsMemberNav}
		<Gate message="Sign in to create or join a room." class="rounded-2xl border bg-muted/40 p-6" />
	{:else}
		<div
			class={cn(
				"relative rounded-2xl border bg-muted/40 p-4 backdrop-blur-sm sm:p-5",
				viewKind === "queued" && "search-ring"
			)}
		>
			<!-- Every view shares one grid cell, sized by the setup controls that are always laid out,
			     so switching views never moves the page, and the other views center in the whole card. -->
			<div class="grid grid-cols-1">
				<div
					data-loaded="play"
					class={cn("col-start-1 row-start-1 flex flex-col gap-4", isSetupHidden && "invisible")}
				>
					{@render gameChoice()}
					{@render setup()}
				</div>

				{#if viewKind === "checking"}
					{@render setupSkeleton()}
				{:else if room && viewKind === "waiting"}
					<div class="col-start-1 row-start-1">{@render waiting(room.code)}</div>
				{:else if viewKind === "queued"}
					<div class="col-start-1 row-start-1">{@render queued()}</div>
				{/if}
			</div>

			{#if holdsControlsBox}
				<p class="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
					Can't reach sign-in. Reload to play.
				</p>
			{/if}
		</div>
	{/if}
{/snippet}

<Page title="New game" titleClass="sr-only" class="max-w-xl justify-center">
	{@render controls()}
</Page>
