<script lang="ts">
	import { LogOut } from "@lucide/svelte";
	import { Button } from "$lib/components/ui";
	import { getClerkAuth } from "$lib/services/auth";
	import { cn } from "$lib/utils/style";
	import type { LayoutProps } from "./$types.js";

	let { children }: LayoutProps = $props();

	const auth = getClerkAuth();
</script>

{#snippet cloud(color: string, position: string, anim: string)}
	<div class={cn("absolute", position, anim)}>
		<div
			class={cn("blob-float absolute inset-[15%] rounded-full blur-3xl", color)}
			style="animation-delay: -2s"
		></div>
		<div
			class={cn(
				"blob-float absolute top-[-5%] left-[-5%] size-[55%] rounded-full blur-3xl",
				color
			)}
			style="animation-delay: -9s"
		></div>
		<div
			class={cn(
				"blob-float absolute top-[2%] right-[-8%] size-[50%] rounded-full blur-3xl",
				color
			)}
			style="animation-delay: -4s"
		></div>
		<div
			class={cn(
				"blob-float absolute bottom-[-6%] left-[6%] size-[48%] rounded-full blur-3xl",
				color
			)}
			style="animation-delay: -12s"
		></div>
		<div
			class={cn(
				"blob-float absolute right-[-6%] bottom-[-8%] size-[42%] rounded-full blur-3xl",
				color
			)}
			style="animation-delay: -6s"
		></div>
	</div>
{/snippet}

<div class="relative flex min-h-svh flex-col overflow-hidden">
	<div class="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
		{@render cloud(
			"bg-cyan-500/20",
			"left-[calc(50%-10rem)] top-[calc(50%-23rem)] size-80",
			"drift-a animation-delay-[0s] animation-duration-[26s]"
		)}
		{@render cloud(
			"bg-pink-500/20",
			"left-[calc(50%-21.5rem)] top-[calc(50%-13rem)] size-72",
			"drift-b animation-delay-[-6s] animation-duration-[30s]"
		)}
		{@render cloud(
			"bg-cyan-500/15",
			"left-[calc(50%-16.5rem)] top-[calc(50%+1.5rem)] size-72",
			"drift-c animation-delay-[-13s] animation-duration-[24s]"
		)}
		{@render cloud(
			"bg-pink-500/20",
			"left-[calc(50%-4.5rem)] top-[calc(50%-1.5rem)] size-96",
			"drift-a animation-delay-[-9s] animation-duration-[28s]"
		)}
		{@render cloud(
			"bg-cyan-500/20",
			"left-[calc(50%+2.5rem)] top-[calc(50%-14rem)] size-80",
			"drift-b animation-delay-[-16s] animation-duration-[32s]"
		)}
	</div>

	<nav class="absolute inset-x-4 top-4 z-10 flex items-center justify-between">
		<div class="flex items-center gap-4">
			<a
				href="https://ko-fi.com/nikkoabucejo"
				target="_blank"
				rel="noopener noreferrer"
				class="flex items-center gap-1.5 text-sm text-[#ff5e5b] transition-colors hover:text-[#ff8785]"
			>
				<span
					aria-hidden="true"
					class="h-4 w-4 bg-[#ff5e5b]"
					style="mask: url('https://storage.ko-fi.com/cdn/cup-border.png') center / contain no-repeat; -webkit-mask: url('https://storage.ko-fi.com/cdn/cup-border.png') center / contain no-repeat;"
				></span>
				Buy me a coffee
			</a>
			<a href="/" class="text-sm text-muted-foreground transition-colors hover:text-foreground">
				Home
			</a>
		</div>

		{#if auth.isSignedIn}
			<div class="flex items-center gap-1">
				<button
					type="button"
					class="flex items-center gap-2 rounded-full py-1 pr-3 pl-1 text-sm transition-colors hover:bg-muted"
					onclick={() => auth.openUserProfile()}
				>
					{#if auth.profile?.imageUrl}
						<img src={auth.profile.imageUrl} alt="" class="size-6 rounded-full" />
					{:else}
						<span
							class="flex size-6 items-center justify-center rounded-full bg-muted text-xs font-semibold"
						>
							{(auth.profile?.name ?? "?").charAt(0).toUpperCase()}
						</span>
					{/if}
					<span class="font-medium">{auth.profile?.name}</span>
				</button>
				<Button variant="ghost" size="icon-sm" aria-label="Sign out" onclick={() => auth.signOut()}>
					<LogOut />
				</Button>
			</div>
		{/if}
	</nav>

	{@render children()}
</div>

<style>
	.drift-a {
		animation-name: drift-a;
		animation-timing-function: ease-in-out;
		animation-iteration-count: infinite;
	}

	.drift-b {
		animation-name: drift-b;
		animation-timing-function: ease-in-out;
		animation-iteration-count: infinite;
	}

	.drift-c {
		animation-name: drift-c;
		animation-timing-function: ease-in-out;
		animation-iteration-count: infinite;
	}

	.blob-float {
		animation-name: blob-float;
		animation-timing-function: ease-in-out;
		animation-iteration-count: infinite;
		animation-duration: 16s;
	}

	@keyframes drift-a {
		0%,
		100% {
			translate: 0 0;
			rotate: 0deg;
			scale: 1;
		}
		33% {
			translate: 18% 14%;
			rotate: 25deg;
			scale: 1.14;
		}
		66% {
			translate: -14% 16%;
			rotate: -20deg;
			scale: 0.88;
		}
	}

	@keyframes drift-b {
		0%,
		100% {
			translate: 0 0;
			rotate: 0deg;
			scale: 1;
		}
		33% {
			translate: -16% 15%;
			rotate: -28deg;
			scale: 0.9;
		}
		66% {
			translate: 15% -14%;
			rotate: 22deg;
			scale: 1.16;
		}
	}

	@keyframes drift-c {
		0%,
		100% {
			translate: 0 0;
			rotate: 0deg;
			scale: 1;
		}
		50% {
			translate: 20% 20%;
			rotate: 30deg;
			scale: 1.1;
		}
	}

	@keyframes blob-float {
		0%,
		100% {
			translate: 0 0;
			scale: 1;
		}
		50% {
			translate: 8% -6%;
			scale: 1.12;
		}
	}
</style>
