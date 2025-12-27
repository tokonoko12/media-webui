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

	let scrollContainer = $state<HTMLElement | undefined>(undefined);

	const colorClasses = {
		'dash-green': 'text-dash-green border-dash-green/30 hover:text-dash-green',
		'dash-amber': 'text-dash-amber border-dash-amber/30 hover:text-dash-amber',
		'dash-red': 'text-dash-red border-dash-red/30 hover:text-dash-red',
		'dash-light': 'text-dash-light border-dash-light/30 hover:text-dash-light',
		'dash-text-light': 'text-dash-text-light border-dash-border hover:text-dash-text-light'
	};

	const bgClasses = {
		'dash-green': 'bg-dash-green/10 border-dash-green/30',
		'dash-amber': 'bg-dash-amber/10 border-dash-amber/30',
		'dash-red': 'bg-dash-red/10 border-dash-red/30',
		'dash-light': 'bg-dash-light/10 border-dash-light/30',
		'dash-text-light': 'bg-white/5 border-dash-border'
	};

	function scroll(direction: 'left' | 'right') {
		if (scrollContainer) {
			const scrollAmount = 600;
			const target =
				direction === 'left'
					? scrollContainer.scrollLeft - scrollAmount
					: scrollContainer.scrollLeft + scrollAmount;

			scrollContainer.scrollTo({
				left: target,
				behavior: 'smooth'
			});
		}
	}
</script>

<section class="flex flex-col gap-4">
	<!-- Header -->
	<div class="flex items-center justify-between border-b {bgClasses[color].split(' ')[1]} pb-2">
		<div class="flex items-center gap-3">
			<div class="h-6 w-1 {bgClasses[color].split(' ')[0].replace('/10', '')}"></div>
			<h2 class="font-retro text-2xl tracking-wide uppercase {colorClasses[color].split(' ')[0]}">
				{title}
			</h2>
		</div>

		{#if link}
			<a
				href={link}
				class="text-xs font-bold tracking-widest uppercase transition-colors {colorClasses[color]}"
			>
				{linkText}
			</a>
		{/if}
	</div>

	<!-- Carousel Container -->
	<div class="group/row relative">
		<!-- Left Control -->
		<button
			onclick={() => scroll('left')}
			class="absolute top-0 bottom-4 left-0 z-10 flex w-12 -translate-x-4 items-center justify-center bg-gradient-to-r from-black to-transparent opacity-0 transition-all duration-300 group-hover/row:translate-x-0 group-hover/row:opacity-100"
			aria-label="Scroll Left"
		>
			<svg
				xmlns="http://www.w3.org/2000/svg"
				fill="none"
				viewBox="0 0 24 24"
				stroke-width="2"
				stroke="currentColor"
				class="h-8 w-8 text-white drop-shadow-lg"
			>
				<path stroke-linecap="round" stroke-linejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
			</svg>
		</button>

		<!-- Scrollable List -->
		<div
			bind:this={scrollContainer}
			class="scrollbar-hide flex snap-x snap-mandatory flex-nowrap gap-4 overflow-x-auto overflow-y-hidden pt-4 pr-20 pb-4 pl-1"
		>
			{#each movies as movie}
				<div class="w-[160px] flex-none snap-start transition-transform duration-300 md:w-[200px]">
					<MovieCard {movie} />
				</div>
			{/each}

			<!-- Spacer for end of list -->
			<div class="w-8 flex-none"></div>
		</div>

		<!-- Right Control -->
		<button
			onclick={() => scroll('right')}
			class="absolute top-0 right-0 bottom-4 z-10 flex w-12 translate-x-4 items-center justify-center bg-gradient-to-l from-black to-transparent opacity-0 transition-all duration-300 group-hover/row:translate-x-0 group-hover/row:opacity-100"
			aria-label="Scroll Right"
		>
			<svg
				xmlns="http://www.w3.org/2000/svg"
				fill="none"
				viewBox="0 0 24 24"
				stroke-width="2"
				stroke="currentColor"
				class="h-8 w-8 text-white drop-shadow-lg"
			>
				<path stroke-linecap="round" stroke-linejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
			</svg>
		</button>
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
