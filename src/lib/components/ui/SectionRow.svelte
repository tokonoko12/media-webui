<script lang="ts">
	import type { Movie } from '$lib/data';
	import MovieCard from './MovieCard.svelte';
	import { Button } from '$lib/components/ui/button';
	import * as Carousel from '$lib/components/ui/carousel';

	interface Props {
		title: string;
		movies: Movie[];
		link?: string;
		linkText?: string;
	}

	let { title, movies, link, linkText = 'View All' }: Props = $props();
</script>

<section class="flex flex-col gap-4">
	<!-- Header -->
	<div class="border-border flex items-center justify-between border-b pb-4">
		<div class="flex items-center gap-3">
			<div class="bg-primary h-6 w-1 rounded-full"></div>
			<h2 class="text-foreground text-2xl font-bold tracking-tight uppercase">
				{title}
			</h2>
		</div>

		{#if link}
			<Button
				variant="ghost"
				size="sm"
				href={link}
				class="text-xs font-bold tracking-widest uppercase"
			>
				{linkText}
			</Button>
		{/if}
	</div>

	<!-- Carousel -->
	<Carousel.Root
		opts={{
			align: 'start',
			slidesToScroll: 'auto'
		}}
		class="group/carousel w-full"
	>
		<Carousel.Content class="-ml-4">
			{#each movies as movie}
				<Carousel.Item class="basis-[160px] pl-4 md:basis-[200px]">
					<MovieCard {movie} />
				</Carousel.Item>
			{/each}
		</Carousel.Content>

		<!-- Navigation -->
		<Carousel.Previous
			class="hover:text-primary left-4 hidden h-12 w-12 rounded-full border-none bg-black/50 text-white shadow-lg backdrop-blur-sm transition-all duration-300 group-hover/carousel:left-0 group-hover/carousel:block hover:bg-black/80"
		/>
		<Carousel.Next
			class="hover:text-primary right-4 hidden h-12 w-12 rounded-full border-none bg-black/50 text-white shadow-lg backdrop-blur-sm transition-all duration-300 group-hover/carousel:right-0 group-hover/carousel:block hover:bg-black/80"
		/>
	</Carousel.Root>
</section>
