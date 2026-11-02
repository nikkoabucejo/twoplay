<script lang="ts" module>
	export type GateProps = {
		message: string;
		class?: string;
	};
</script>

<script lang="ts">
	import { getClerkAuth } from "$lib/services/auth";
	import { cn } from "$lib/utils/style";
	import { Button } from "../button/index.js";

	let { message, class: className }: GateProps = $props();

	const auth = getClerkAuth();
</script>

<div data-slot="gate" class={cn("flex flex-col items-center gap-3 text-center", className)}>
	<p class="text-sm text-muted-foreground">{message}</p>
	<Button disabled={auth.loadError !== null} onclick={() => auth.signIn()}>Sign in</Button>
</div>
