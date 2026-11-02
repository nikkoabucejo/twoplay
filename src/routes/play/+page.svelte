<script lang="ts">
	import { page } from "$app/state";
	import { Page } from "$lib/components/layout";
	import { Meta } from "$lib/components/ui";
	import { Play } from "$lib/features/core";
	import { GAME_TYPES } from "$lib/features/play";

	// Lets the home page's per-game icons land here with that game pre-selected, e.g. /play?game=checkers.
	const initialGame = $derived(
		GAME_TYPES.find((type) => type === page.url.searchParams.get("game"))
	);
</script>

<Meta title="Play" description="Find a match, create a room, or join one with a code." />

<Page title="Play" titleClass="sr-only">
	<Play {initialGame} />
</Page>
