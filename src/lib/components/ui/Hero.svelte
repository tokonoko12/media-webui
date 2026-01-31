<script lang="ts">
	import type { Movie } from '$lib/data';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { Play, Info } from 'lucide-svelte';

	interface Props {
		movie: Movie;
	}

	let { movie }: Props = $props();
</script>

<section class="relative flex h-[85vh] w-full items-end overflow-hidden pb-20">
	<!-- Background Image -->
	<div class="absolute inset-0 h-full w-full">
		<img
			src={movie.backdrop_path}
			alt={movie.title}
			class="h-full w-full object-cover object-center opacity-70"
		/>
		<!-- Gradient Overlay -->
		<div
			class="from-background via-background/40 absolute inset-0 bg-gradient-to-t to-transparent"
		></div>
		<div
			class="from-background/80 absolute inset-0 bg-gradient-to-r via-transparent to-transparent"
		></div>
	</div>

	<div class="relative z-10 container mx-auto flex flex-col items-start gap-6 px-6 md:px-12">
		<!-- Genres Pill -->
		<div class="flex gap-2">
			{#each movie.genres as genre}
				<Badge variant="secondary" class="border-white/20 bg-white/10 text-white backdrop-blur-md">
					{genre}
				</Badge>
			{/each}
		</div>

		<h1
			class="text-foreground max-w-4xl text-4xl leading-tight font-extrabold drop-shadow-xl md:text-6xl lg:text-7xl"
		>
			{movie.title}
		</h1>

		<p
			class="text-muted-foreground line-clamp-3 max-w-2xl text-lg font-medium drop-shadow-md md:text-xl"
		>
			{movie.overview}
		</p>

		<div class="mt-4 flex items-center gap-4">
			<Button size="lg" class="gap-2 px-8 text-lg font-bold">
				<Play class="h-6 w-6" />
				Play Now
			</Button>

			<Button
				variant="outline"
				size="lg"
				class="gap-2 border-white/20 bg-white/10 px-8 text-lg font-semibold text-white backdrop-blur-md hover:bg-white/20"
			>
				<Info class="h-6 w-6" />
				More Info
			</Button>
		</div>
	</div>
</section>
