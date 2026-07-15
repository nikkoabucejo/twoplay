<script lang="ts">
	import { page } from "$app/state";
	import { Play } from "$lib/components/layout";
	import { GAME_TYPES } from "$lib/features/play";

	// Lets the home page's per-game icons land here with that game pre-selected, e.g. /play?game=checkers.
	const initialGame = $derived(
		GAME_TYPES.find((type) => type === page.url.searchParams.get("game"))
	);
</script>

<Play {initialGame} />
