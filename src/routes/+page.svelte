<script lang="ts">
	import MovieCard from '$lib/components/ui/MovieCard.svelte';
	import SectionRow from '$lib/components/ui/SectionRow.svelte';
	import { onDestroy } from 'svelte';

	let { data } = $props();

	let currentIndex = $state(0);
	let interval: ReturnType<typeof setInterval>;

	function startCarousel() {
		interval = setInterval(() => {
			if (data.trending.length > 0) {
				currentIndex = (currentIndex + 1) % Math.min(data.trending.length, 5);
			}
		}, 8000);
	}

	function stopCarousel() {
		clearInterval(interval);
	}

	// Simple auto-start effect
	$effect(() => {
		startCarousel();
		return () => stopCarousel();
	});
</script>

<svelte:head>
	<title>MEDIAHUB // TERMINAL</title>
</svelte:head>

<!-- Full Width Layout -->
<div class="mx-auto flex h-full max-w-7xl flex-col gap-8 pb-12">
	<!-- Featured Carousel -->
	{#if data.trending.length > 0}
		{@const featuredMovies = data.trending.slice(0, 5)}
		<section class="panel group relative h-[500px] w-full overflow-hidden">
			<!-- Carousel State -->
			{#each featuredMovies as movie, i}
				<div
					class="absolute inset-0 h-full w-full transition-opacity duration-1000 {i === currentIndex
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
						class="from-dash-bg absolute inset-0 bg-gradient-to-t via-black/40 to-black/30"
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
							class="text-dash-text border-dash-amber mb-4 line-clamp-3 max-w-2xl border-l-2 bg-black/60 p-2 font-mono text-xs leading-relaxed backdrop-blur-sm md:mb-8 md:line-clamp-4 md:p-4 md:text-sm"
						>
							{movie.overview}
						</p>

						<div class="flex flex-wrap gap-3 md:gap-4">
							<button
								class="bg-dash-border hover:bg-dash-amber text-dash-text-light border border-transparent px-4 py-2 text-xs font-bold tracking-widest uppercase transition-colors hover:border-black hover:text-black md:px-8 md:py-3 md:text-base"
							>
								PLAY
							</button>
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

	<!-- Grid replaced by stacked SectionRows for better media browsing -->
	<div class="flex flex-col gap-12">
		<SectionRow
			title="RECENT_ARRIVALS"
			movies={data.newReleases}
			link="/movies?cat=new"
			color="dash-green"
		/>

		<SectionRow
			title="TOP_RATED_ARCHIVE"
			movies={data.topRated}
			link="/movies?cat=top"
			color="dash-amber"
		/>

		<SectionRow
			title="GENRE: ACTION"
			movies={data.action}
			link="/movies?genre=28"
			linkText="[EXPAND_LIST]"
			color="dash-red"
		/>

		<SectionRow
			title="GENRE: COMEDY"
			movies={data.comedy}
			link="/movies?genre=35"
			linkText="[EXPAND_LIST]"
			color="dash-amber"
		/>

		<SectionRow
			title="TRENDING.LOG"
			movies={data.trending}
			link="/movies?cat=trending"
			linkText="[VIEW_ALL]"
			color="dash-amber"
		/>

		<SectionRow
			title="RETRO_ARCHIVE"
			movies={data.classics}
			link="/movies?cat=retro"
			linkText="[ACCESS_ARCHIVE]"
			color="dash-light"
		/>
	</div>
</div>
