<script lang="ts">
	import { Page } from "$lib/components/layout";
	import { Meta } from "$lib/components/ui";
	import { Leaderboard, RatingRules, RatingSummary } from "$lib/features/core";
	import { getClerkAuth } from "$lib/services/auth";

	const auth = getClerkAuth();
</script>

{#snippet ratings()}
	<div class="mx-auto flex w-full max-w-2xl flex-col gap-3 lg:max-w-none">
		<RatingSummary />
		<RatingRules />
	</div>
{/snippet}

<Meta title="Leaderboard" description="Top players ranked by rating." />

<Page
	title="Leaderboard"
	description="Top players ranked by rating."
	titleClass="mx-auto w-full max-w-2xl shrink-0 lg:mx-0 lg:max-w-none"
	class="gap-3 lg:min-h-0 max-lg:[&_aside]:order-first"
	sidebar={auth.isSignedIn ? ratings : undefined}
>
	<Leaderboard />
</Page>
