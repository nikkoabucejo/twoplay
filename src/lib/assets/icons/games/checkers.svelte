<script lang="ts" module>
	import { cn } from "$lib/utils/style";

	export type CheckersIconProps = {
		class?: string;
	};
</script>

<script lang="ts">
	let { class: className }: CheckersIconProps = $props();
</script>

<svg
	viewBox="0 0 24 24"
	fill="currentColor"
	stroke="none"
	class={cn("lucide", className)}
	aria-hidden="true"
>
	<rect x="3" y="17" width="18" height="3" rx="1" />

	<polygon points="3,17 8.67,17 5.83,7" fill="#00e5ff">
		<animate
			attributeName="points"
			values="3,17 8.67,17 5.83,7; 3,17 8.67,17 5.83,5.5; 3,17 8.67,17 5.83,7"
			dur="2.2s"
			repeatCount="indefinite"
		/>
	</polygon>
	<circle cx="5.83" cy="7" r="1.3" fill="#00e5ff">
		<animate attributeName="cy" values="7;5.5;7" dur="2.2s" repeatCount="indefinite" />
	</circle>

	<polygon points="8.67,17 15.33,17 12,2.5" fill="#ff0080">
		<animate
			attributeName="points"
			values="8.67,17 15.33,17 12,2.5; 8.67,17 15.33,17 12,1; 8.67,17 15.33,17 12,2.5"
			dur="2.6s"
			begin="0.3s"
			repeatCount="indefinite"
		/>
	</polygon>
	<circle cx="12" cy="2.5" r="1.5" fill="#ff0080">
		<animate
			attributeName="cy"
			values="2.5;1;2.5"
			dur="2.6s"
			begin="0.3s"
			repeatCount="indefinite"
		/>
	</circle>

	<polygon points="15.33,17 21,17 18.17,7" fill="#00e5ff">
		<animate
			attributeName="points"
			values="15.33,17 21,17 18.17,7; 15.33,17 21,17 18.17,5.5; 15.33,17 21,17 18.17,7"
			dur="2.4s"
			begin="0.6s"
			repeatCount="indefinite"
		/>
	</polygon>
	<circle cx="18.17" cy="7" r="1.3" fill="#00e5ff">
		<animate attributeName="cy" values="7;5.5;7" dur="2.4s" begin="0.6s" repeatCount="indefinite" />
	</circle>
</svg>
