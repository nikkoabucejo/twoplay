<script lang="ts">
	import { DropdownMenu as DropdownPrimitive } from "bits-ui";

	let { ...restProps }: DropdownPrimitive.PortalProps = $props();
</script>

<DropdownPrimitive.Portal {...restProps} />
