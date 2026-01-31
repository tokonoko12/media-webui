<script lang="ts">
	import MovieCard from '$lib/components/ui/MovieCard.svelte';
	import SectionRow from '$lib/components/ui/SectionRow.svelte';
	import { Skeleton } from '$lib/components/ui/skeleton';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import * as Carousel from '$lib/components/ui/carousel';
	import { BackendClient } from '$lib/backend';
	import { onMount } from 'svelte';
	import { Play, Info } from 'lucide-svelte';
	import Autoplay from 'embla-carousel-autoplay';

	let homeData = $state<{ featured: any[]; sections: any[] }>({ featured: [], sections: [] });
	let isLoading = $state(true);
	let error = $state<string | null>(null);

	onMount(async () => {
		try {
			const client = new BackendClient();
			homeData = await client.getHomeCatalog();
			isLoading = false;
		} catch (e: any) {
			console.error(e);
			error = 'Failed to load catalog';
			isLoading = false;
		}
	});
</script>

<svelte:head>
	<title>MEDIAHUB // HOME</title>
</svelte:head>

<!-- Full Width Layout -->
<div class="mx-auto flex h-full max-w-7xl flex-col px-4 pt-10 pb-12">
	{#if isLoading}
		<!-- Skeletons -->
		<div class="flex flex-col gap-12 pt-12 pb-20">
			{#each Array(2) as _}
				<div class="space-y-4 px-6 md:px-12">
					<Skeleton class="h-8 w-48" />
					<div class="scrollbar-hide flex gap-4 overflow-x-auto">
						{#each Array(6) as _}
							<Skeleton class="aspect-[2/3] w-[140px] flex-none rounded-md md:w-[180px]" />
						{/each}
					</div>
				</div>
			{/each}
		</div>
	{:else if error}
		<div class="text-destructive flex h-96 w-full items-center justify-center font-mono">
			{error}
		</div>
	{:else}
		<!-- Featured Carousel -->
		{#if homeData.featured.length > 0}
			{@const featuredMovies = homeData.featured.filter((m) => m.backdrop_path).slice(0, 5)}
			{#if featuredMovies.length > 0}
				<Carousel.Root
					opts={{ loop: true }}
					plugins={[
						Autoplay({
							delay: 8000
						})
					]}
					class="group border-border bg-card relative mb-8 w-full overflow-hidden rounded-xl border shadow-2xl"
				>
					<Carousel.Content class="m-0">
						{#each featuredMovies as movie, i}
							<Carousel.Item class="p-0">
								<div class="relative h-[500px] w-full">
									<img
										src={movie.backdrop_path}
										alt={movie.title}
										class="absolute inset-0 h-full w-full object-cover"
									/>
									<!-- Gradient & Noise -->
									<div
										class="from-background via-background/60 to-background/10 absolute inset-0 bg-gradient-to-t"
									></div>

									<!-- Content -->
									<div
										class="absolute bottom-0 left-0 z-20 flex w-full flex-col justify-end p-4 md:justify-start md:p-12"
									>
										<div class="mb-2 flex items-center gap-2 md:mb-4 md:gap-3">
											<Badge class="bg-primary hover:bg-primary/90 text-black">FEATURED</Badge>
											<Badge variant="outline" class="border-white/30 text-white backdrop-blur-sm">
												#{i + 1}
											</Badge>
										</div>

										<h1
											class="text-foreground mb-2 line-clamp-2 max-w-4xl text-2xl leading-none font-bold tracking-tight md:mb-4 md:line-clamp-2 md:text-6xl"
										>
											{movie.title.toUpperCase()}
										</h1>

										<p
											class="text-muted-foreground mb-4 line-clamp-3 max-w-2xl text-xs leading-relaxed font-medium drop-shadow-md md:mb-8 md:line-clamp-4 md:text-sm"
										>
											{movie.overview}
										</p>

										<div class="flex flex-wrap gap-3 md:gap-4">
											<Button
												href={movie.media_type === 'series'
													? `/series/${movie.id}`
													: `/movies/${movie.id}`}
												class="min-w-[140px] font-bold tracking-widest uppercase md:h-12 md:px-8"
											>
												<Play class="mr-2 h-4 w-4" /> PLAY
											</Button>

											<Button
												variant="outline"
												class="min-w-[140px] border-white/20 bg-black/20 font-bold tracking-widest text-white uppercase backdrop-blur-md hover:bg-white/10 hover:text-white md:h-12 md:px-8"
											>
												<Info class="mr-2 h-4 w-4" /> INFO
											</Button>
										</div>
									</div>
								</div>
							</Carousel.Item>
						{/each}
					</Carousel.Content>

					<!-- Navigation -->
					<Carousel.Previous
						class="hover:text-primary left-4 h-12 w-12 border-white/20 bg-black/50 text-white opacity-0 backdrop-blur-sm transition-opacity duration-300 group-hover:opacity-100 hover:bg-black/80"
					/>
					<Carousel.Next
						class="hover:text-primary right-4 h-12 w-12 border-white/20 bg-black/50 text-white opacity-0 backdrop-blur-sm transition-opacity duration-300 group-hover:opacity-100 hover:bg-black/80"
					/>
				</Carousel.Root>
			{/if}
		{/if}

		<!-- Dynamic Sections -->
		<div class="flex flex-col gap-12">
			{#each homeData.sections as section}
				<SectionRow title={section.title.toUpperCase()} movies={section.items} />
			{/each}
		</div>
	{/if}
</div>
