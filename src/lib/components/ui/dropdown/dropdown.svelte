<script lang="ts">
	import { DropdownMenu as DropdownPrimitive } from "bits-ui";

	let { open = $bindable(false), ...restProps }: DropdownPrimitive.RootProps = $props();
</script>

<DropdownPrimitive.Root bind:open {...restProps} />
