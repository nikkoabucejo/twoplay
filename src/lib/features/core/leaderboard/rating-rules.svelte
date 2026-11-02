<script lang="ts">
	const titleId = $props.id();
</script>

<section
	aria-labelledby={titleId}
	class="flex flex-col gap-2 rounded-xl border bg-muted/40 p-4 backdrop-blur-sm"
>
	<h2 id={titleId} class="text-xs font-semibold">How ratings work</h2>
	<ul class="flex flex-col gap-1 text-caption text-muted-foreground">
		<li>Everyone starts at 400.</li>
		<li>A win adds 8 and a loss takes 8, but a rating never drops below 100.</li>
		<li>A draw changes nothing.</li>
		<li>One rating covers every game.</li>
	</ul>
</section>
