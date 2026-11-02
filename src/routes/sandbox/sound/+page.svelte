<script lang="ts">
	import { Page } from "$lib/components/layout";
	import { Meta } from "$lib/components/ui";
	import { SoundLab } from "$lib/features/core";
</script>

<Meta
	title="Sound & mood"
	description="Play the twoplay music and game sounds, and watch the background shift with each moment of a game."
/>

<Page
	title="Sound & mood"
	description="Pick a moment to hear its music and see the background change."
	class="max-w-2xl"
>
	<SoundLab />
</Page>
