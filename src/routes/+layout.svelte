<script lang="ts">
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';
	import Navbar from '$lib/components/layout/Navbar.svelte';
	import { navigating } from '$app/stores';

	let { children } = $props();
</script>

<svelte:head><link rel="icon" href={favicon} /></svelte:head>

<!-- Global Loading Bar -->
{#if $navigating}
	<div class="bg-dash-border fixed top-0 right-0 left-0 z-[100] h-1">
		<div class="bg-dash-amber animate-progress h-full" style="width: 100%"></div>
	</div>
	<style>
		@keyframes progress {
			0% {
				width: 0%;
				transform: translateX(-100%);
			}
			50% {
				width: 50%;
				transform: translateX(0);
			}
			100% {
				width: 100%;
				transform: translateX(0);
			}
		}
		.animate-progress {
			animation: progress 2s infinite linear;
			transform-origin: 0% 50%;
		}
	</style>
{/if}

<div
	class="bg-dash-bg text-dash-text selection:bg-dash-amber flex min-h-screen flex-col overflow-x-hidden font-mono selection:text-black"
>
	<Navbar />
	<main class="flex-grow px-4 pt-16 pb-8">
		{@render children()}
	</main>
</div>
