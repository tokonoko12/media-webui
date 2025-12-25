<script lang="ts">
	import type { Movie } from '$lib/data';
	import MovieCard from './MovieCard.svelte';

	interface Props {
		title: string;
		movies: Movie[];
		link?: string;
		linkText?: string;
		color?: 'dash-green' | 'dash-amber' | 'dash-red' | 'dash-light' | 'dash-text-light';
	}

	let {
		title,
		movies,
		link,
		linkText = '[VIEW_MORE]',
		color = 'dash-text-light'
	}: Props = $props();

	const colorClasses = {
		'dash-green': 'text-dash-green border-dash-green/30 hover:text-dash-green',
		'dash-amber': 'text-dash-amber border-dash-amber/30 hover:text-dash-amber',
		'dash-red': 'text-dash-red border-dash-red/30 hover:text-dash-red',
		'dash-light': 'text-dash-light border-dash-light/30 hover:text-dash-light',
		'dash-text-light': 'text-dash-text-light border-dash-border hover:text-dash-text-light'
	};
</script>

<section class="panel">
	<div class="border-dash-border mb-4 flex items-center justify-between border-b pb-2">
		<div class="flex items-center gap-2">
			<h2 class="{colorClasses[color].split(' ')[0]} text-sm font-bold tracking-wider uppercase">
				{title}
			</h2>
			{#if color === 'dash-green'}
				<div class="bg-dash-green h-2 w-2 animate-pulse rounded-full"></div>
			{/if}
		</div>

		{#if link}
			<a
				href={link}
				class="text-dash-text {colorClasses[color].split(' ')[2]} text-xs tracking-wider uppercase"
			>
				{linkText}
			</a>
		{/if}
	</div>

	<div class="group relative">
		<div class="scrollbar-hide flex snap-x snap-mandatory gap-4 overflow-x-auto pr-6 pb-4">
			{#each movies as movie}
				<div class="w-[160px] flex-none snap-start md:w-[200px]">
					<MovieCard {movie} />
				</div>
			{/each}
		</div>

		<!-- Gradient Fade on right -->
		<div
			class="pointer-events-none absolute top-0 right-0 bottom-4 w-12 bg-gradient-to-l from-black to-transparent"
		></div>
	</div>
</section>

<style>
	/* Hide scrollbar for Chrome/Safari/Opera */
	.scrollbar-hide::-webkit-scrollbar {
		display: none;
	}
	/* Hide scrollbar for IE, Edge and Firefox */
	.scrollbar-hide {
		-ms-overflow-style: none; /* IE and Edge */
		scrollbar-width: none; /* Firefox */
	}
</style>
