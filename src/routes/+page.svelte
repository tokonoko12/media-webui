<script lang="ts">
	import MovieCard from '$lib/components/ui/MovieCard.svelte';
	import SectionRow from '$lib/components/ui/SectionRow.svelte';
	import Skeleton from '$lib/components/ui/Skeleton.svelte';
	import { BackendClient } from '$lib/backend';
	import { onDestroy, onMount } from 'svelte';

	// No longer receiving data from server load
	// let { data } = $props();

	let homeData = $state<{ featured: any[]; sections: any[] }>({ featured: [], sections: [] });
	let isLoading = $state(true);
	let error = $state<string | null>(null);

	let currentIndex = $state(0);
	let interval: ReturnType<typeof setInterval>;

	function startCarousel() {
		interval = setInterval(() => {
			if (homeData.featured.length > 0) {
				currentIndex = (currentIndex + 1) % Math.min(homeData.featured.length, 5);
			}
		}, 8000);
	}

	function stopCarousel() {
		if (interval) clearInterval(interval);
	}

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

	// Auto-start carousel when data loads
	$effect(() => {
		if (!isLoading && homeData.featured.length > 0) {
			startCarousel();
		}
		return () => stopCarousel();
	});
</script>

<svelte:head>
	<title>MEDIAHUB // TERMINAL</title>
</svelte:head>

<!-- Full Width Layout -->
<div class="mx-auto flex h-full max-w-7xl flex-col px-4 pt-20 pb-12">
	{#if isLoading}
		<!-- Skeletons -->
		<div class="flex flex-col gap-12 pt-12 pb-20">
			{#each Array(2) as _}
				<div class="space-y-4 px-6 md:px-12">
					<Skeleton class="h-8 w-48" />
					<div class="scrollbar-hide flex gap-4 overflow-x-auto">
						{#each Array(6) as _}
							<Skeleton class="aspect-[2/3] w-[140px] flex-none md:w-[180px]" />
						{/each}
					</div>
				</div>
			{/each}
		</div>
	{:else if error}
		<div class="flex h-96 w-full items-center justify-center font-mono text-red-500">
			{error}
		</div>
	{:else}
		<!-- Featured Carousel -->
		{#if homeData.featured.length > 0}
			{@const featuredMovies = homeData.featured.filter((m) => m.backdrop_path).slice(0, 5)}
			{#if featuredMovies.length > 0}
				<section class="panel group relative mb-8 h-[500px] w-full overflow-hidden">
					<!-- Carousel State -->
					{#each featuredMovies as movie, i}
						<div
							class="absolute inset-0 h-full w-full transition-opacity duration-1000 {i ===
							currentIndex
								? 'z-10 opacity-100'
								: 'z-0 opacity-0'}"
						>
							<img
								src={movie.backdrop_path}
								alt={movie.title}
								class="absolute inset-0 h-full w-full object-cover"
							/>
							<!-- Gradient & Noise -->
							<div
								class="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-black/30"
							></div>
							<div
								class="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20"
							></div>

							<!-- Content -->
							<!-- Mobile: Centered content, darker overlay. Desktop: Left aligned, standard gradient -->
							<div
								class="absolute bottom-0 left-0 z-20 flex w-full flex-col justify-end p-4 md:justify-start md:p-12"
							>
								<div class="mb-2 flex items-center gap-2 md:mb-4 md:gap-3">
									<span
										class="bg-dash-amber px-1.5 py-0.5 text-[10px] font-bold text-black uppercase md:px-2 md:text-xs"
									>
										FEATURED
									</span>
									<span
										class="border-dash-text-light/30 text-dash-text-light border px-1.5 py-0.5 text-[10px] uppercase md:px-2 md:text-xs"
									>
										#{i + 1}
									</span>
								</div>

								<h1
									class="font-retro text-dash-text-light mb-2 line-clamp-2 max-w-4xl text-2xl leading-none tracking-tight md:mb-4 md:line-clamp-2 md:text-7xl"
								>
									{movie.title.toUpperCase()}
								</h1>

								<p
									class="text-dash-text border-dash-amber mb-4 line-clamp-3 max-w-2xl border-l-4 pl-4 font-mono text-xs leading-relaxed drop-shadow-md md:mb-8 md:line-clamp-4 md:text-sm"
								>
									{movie.overview}
								</p>

								<div class="flex flex-wrap gap-3 md:gap-4">
									<a
										href={movie.media_type === 'series'
											? `/series/${movie.id}`
											: `/movies/${movie.id}`}
										class="bg-dash-border hover:bg-dash-amber text-dash-text-light border border-transparent px-4 py-2 text-xs font-bold tracking-widest uppercase transition-colors hover:border-black hover:text-black md:px-8 md:py-3 md:text-base"
									>
										PLAY
									</a>
									<button
										class="border-dash-border hover:border-dash-text-light text-dash-text hover:text-dash-text-light border px-4 py-2 text-xs font-bold tracking-widest uppercase transition-colors md:px-6 md:py-3 md:text-base"
									>
										INFO
									</button>
								</div>
							</div>
						</div>
					{/each}

					<!-- Controls -->
					<div class="absolute right-6 bottom-6 z-30 flex items-center gap-2">
						{#each featuredMovies as _, i}
							<button
								aria-label="Go to slide {i + 1}"
								onclick={() => (currentIndex = i)}
								class="h-2 w-2 border transition-all {i === currentIndex
									? 'bg-dash-amber border-dash-amber'
									: 'border-dash-text hover:border-dash-amber bg-transparent'}"
							></button>
						{/each}
					</div>
				</section>
			{/if}
		{/if}

		<!-- Dynamic Sections -->
		<div class="flex flex-col gap-12">
			{#each homeData.sections as section}
				<SectionRow title={section.title.toUpperCase()} movies={section.items} color="dash-amber" />
			{/each}
		</div>
	{/if}
</div>
