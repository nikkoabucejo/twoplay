<script lang="ts">
	import { Button } from "$lib/components/ui";
	import { getClerkAuth } from "$lib/services/auth";

	let { title = "Tic-Tac-Toe" }: { title?: string } = $props();

	const auth = getClerkAuth();
</script>

<header class="flex flex-nowrap items-center gap-3 text-sm">
	<div class="flex flex-1 items-center justify-end gap-2 font-normal">
		{#if auth.isSignedIn}
			<button
				type="button"
				class="whitespace-nowrap hover:opacity-80"
				onclick={() => auth.openUserProfile()}
			>
				{auth.profile?.name}
			</button>
		{:else}
			<Button variant="outline" size="sm" onclick={() => auth.signIn()}>Sign in</Button>
		{/if}
	</div>
	<div class="h-4 w-px shrink-0 bg-border"></div>
	<div class="flex flex-1 items-center">
		<span class="font-semibold whitespace-nowrap">{title}</span>
	</div>
</header>
