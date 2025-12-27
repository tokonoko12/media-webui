<script lang="ts">
	import MovieCard from '$lib/components/ui/MovieCard.svelte';
	import VideoPlayer from '$lib/components/ui/VideoPlayer.svelte';
	import Skeleton from '$lib/components/ui/Skeleton.svelte';
	import { BackendClient } from '$lib/backend';
	import { page } from '$app/stores';
	import { onMount, tick } from 'svelte';

	// No props from server
	// let { data } = $props();

	const seriesId = $derived($page.params.id);

	let series = $state<any>(null);
	let cast = $state<any[]>([]);
	let recommendations = $state<any[]>([]);
	let trailer = $state<string | undefined>(undefined);
	let inWatchlist = $state(false);
	let isLoading = $state(true);
	let error = $state<string | null>(null);

	let isVideoOpen = $state(false);

	function openVideo() {
		isVideoOpen = true;
	}

	// State for Season Selection
	let selectedSeason = $state(1);
	let episodes = $state<any[]>([]);
	let isLoadingEpisodes = $state(false);

	$effect(() => {
		if (seriesId) {
			// Reset state
			series = null;
			selectedSeason = 1;
			episodes = [];
			loadSeriesData(seriesId);
		}
	});

	async function loadSeriesData(id: string) {
		isLoading = true;
		error = null;
		try {
			const client = new BackendClient();
			const details = await client.getSeriesDetails(id);
			console.log('Series Details:', details);

			// Fallback if seasons array is missing but number_of_seasons exists
			if ((!details.seasons || details.seasons.length === 0) && details.number_of_seasons > 0) {
				details.seasons = Array.from({ length: details.number_of_seasons }, (_, i) => ({
					season_number: i + 1,
					name: `Season ${i + 1}`,
					episode_count: 0 // Unknown
				}));
			}

			series = details;
			cast = details.credits?.cast || [];
			recommendations = details.recommendations || [];

			// Watchlist
			if (typeof details.in_watchlist === 'boolean') {
				inWatchlist = details.in_watchlist;
			} else {
				try {
					const { watchlist } = await client.getWatchlist();
					inWatchlist = watchlist.some(
						(item: any) =>
							(item.tmdb_id && item.tmdb_id.toString() === id) ||
							(item.id && item.id === id && item.media_type === 'series')
					);
				} catch (ignore) {}
			}

			// Initial Season
			const firstSeason =
				details.seasons && details.seasons.length > 0 ? details.seasons[0].season_number : 1;
			selectedSeason = firstSeason;
			await changeSeason(firstSeason, true);
		} catch (e: any) {
			console.error(e);
			error = 'Failed to load series details';
		} finally {
			isLoading = false;
		}
	}

	async function changeSeason(seasonNumber: number, force = false) {
		if (!series) return;
		if (!force && selectedSeason === seasonNumber && episodes.length > 0) return;

		selectedSeason = seasonNumber;
		isLoadingEpisodes = true;
		try {
			const client = new BackendClient();
			const seasonData = await client.getSeasonDetails(series.id.toString(), seasonNumber);
			if (seasonData.episodes) {
				episodes = seasonData.episodes;
			}
		} catch (e) {
			console.error('Failed to load season:', e);
		} finally {
			isLoadingEpisodes = false;
		}
	}

	async function toggleWatchlist() {
		if (!series) return;
		try {
			const client = new BackendClient();
			if (inWatchlist) {
				await client.removeFromWatchlist(series.id.toString());
				inWatchlist = false;
			} else {
				await client.addToWatchlist({ media_id: series.id.toString(), media_type: 'series' });
				inWatchlist = true;
			}
		} catch (e) {
			console.error('Watchlist toggle failed', e);
		}
	}

	function closeVideo() {
		isVideoOpen = false;
	}

	function scrollContainer(id: string, direction: 'left' | 'right') {
		const container = document.getElementById(id);
		if (container) {
			const scrollAmount = direction === 'left' ? -300 : 300;
			container.scrollBy({ left: scrollAmount, behavior: 'smooth' });
			setTimeout(() => checkScroll(id), 350);
		}
	}

	// Scroll Detection
	let canScrollLeft = $state(false);
	let canScrollRight = $state(true);

	function checkScroll(id: string) {
		const container = document.getElementById(id);
		if (container) {
			canScrollLeft = container.scrollLeft > 0;
			const remainingScroll =
				container.scrollWidth - (container.scrollLeft + container.clientWidth);
			canScrollRight = remainingScroll > 10;
		}
	}

	$effect(() => {
		if (episodes && episodes.length > 0) {
			tick().then(() => checkScroll('episode-list'));
		}
	});
</script>

<svelte:head>
	<title>MEDIAHUB // {series ? series.title.toUpperCase() : 'LOADING...'}</title>
</svelte:head>

<VideoPlayer isOpen={isVideoOpen} youtubeId={trailer} onClose={closeVideo} />

{#if isLoading}
	<div class="animate-pulse">
		<div class="h-[60vh] w-full bg-white/5 md:h-[70vh]"></div>
		<div class="mx-auto mt-8 flex max-w-7xl flex-col gap-12 px-6 md:px-12">
			<div class="space-y-4">
				<Skeleton class="h-8 w-48" />
				<div class="space-y-2">
					<Skeleton class="h-4 w-full max-w-2xl" />
					<Skeleton class="h-4 w-full max-w-xl" />
					<Skeleton class="h-4 w-full max-w-lg" />
				</div>
			</div>
		</div>
	</div>
{:else if error}
	<div class="flex h-screen w-full items-center justify-center font-mono text-red-500">
		{error}
	</div>
{:else if series}
	<!-- Hero Section -->
	<div
		class="relative flex min-h-[60vh] w-full flex-col justify-end overflow-hidden md:h-[70vh] md:min-h-0 md:justify-end"
	>
		{#if series.backdrop_path}
			<img
				src={series.backdrop_path}
				alt={series.title}
				class="absolute inset-0 h-full w-full object-cover opacity-60"
			/>
		{/if}
		<div class="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-black/30"></div>
		<div
			class="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20"
		></div>

		<div class="relative z-20 w-full p-6 pt-24 md:p-12">
			<div class="mx-auto w-full max-w-7xl">
				<h1
					class="font-retro text-dash-text-light mb-4 max-w-4xl text-2xl leading-none tracking-tight sm:text-4xl md:text-7xl"
				>
					{series.title.toUpperCase()}
				</h1>

				<div
					class="text-dash-text mb-6 flex items-center gap-6 font-mono text-xs tracking-widest uppercase"
				>
					<span class="text-white/80">{series.release_date.split('-')[0]}</span>
					<span class="text-dash-text/30">|</span>
					<span class="text-white/80">RATING: {series.vote_average.toFixed(1)}</span>
				</div>

				{#if cast && cast.length > 0}
					<div class="mb-8 flex flex-wrap items-center gap-4">
						<span
							class="text-dash-text/50 font-mono text-[10px] font-bold tracking-widest uppercase"
							>STARRING:</span
						>
						<div class="flex items-center -space-x-4 pl-2">
							{#each cast.slice(0, 7) as person}
								<div
									class="ring-dash-bg relative z-0 h-10 w-10 overflow-hidden rounded-full ring-2 transition-transform duration-300 hover:z-10 hover:scale-110 sm:h-12 sm:w-12"
									title={person.name}
								>
									{#if person.profile_path}
										<img
											src={person.profile_path}
											alt={person.name}
											class="h-full w-full object-cover"
										/>
									{:else}
										<div class="bg-dash-panel flex h-full w-full items-center justify-center">
											<span class="text-[8px] uppercase">{person.name.charAt(0)}</span>
										</div>
									{/if}
								</div>
							{/each}
						</div>
					</div>
				{/if}

				<div class="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:gap-4">
					<button
						onclick={openVideo}
						class="border-dash-border hover:border-dash-text-light text-dash-text hover:text-dash-text-light flex items-center justify-center gap-2 border px-6 py-3 text-sm font-bold tracking-widest uppercase transition-all sm:text-base"
					>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							fill="none"
							viewBox="0 0 24 24"
							stroke-width="1.5"
							stroke="currentColor"
							class="h-4 w-4 sm:h-5 sm:w-5"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z"
							/>
						</svg>
						TRAILER
					</button>
					<button
						onclick={toggleWatchlist}
						class="border-dash-border hover:border-dash-text-light text-dash-text hover:text-dash-text-light flex items-center justify-center gap-2 border px-6 py-3 text-sm font-bold tracking-widest uppercase transition-all sm:text-base"
					>
						{#if inWatchlist}
							<svg
								xmlns="http://www.w3.org/2000/svg"
								fill="none"
								viewBox="0 0 24 24"
								stroke-width="1.5"
								stroke="currentColor"
								class="h-4 w-4 sm:h-5 sm:w-5"
							>
								<path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5" />
							</svg>
							IN_LIST
						{:else}
							<svg
								xmlns="http://www.w3.org/2000/svg"
								fill="none"
								viewBox="0 0 24 24"
								stroke-width="1.5"
								stroke="currentColor"
								class="h-4 w-4 sm:h-5 sm:w-5"
							>
								<path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
							</svg>
							ADD_LIST
						{/if}
					</button>
				</div>
			</div>
		</div>
	</div>

	<!-- Content Grid -->
	<div class="mt-8 flex w-full flex-col gap-20 px-6 md:px-12">
		<div class="mx-auto flex w-full max-w-7xl flex-col gap-16">
			<!-- Episodes Section (Now First) -->
			{#if series.seasons && series.seasons.length > 0}
				<section>
					<!-- Season Tabs -->
					<div class="border-dash-border/30 mb-8 flex w-full items-center gap-2 border-b">
						<button
							aria-label="Scroll seasons left"
							onclick={() => scrollContainer('season-list', 'left')}
							class="hover:text-dash-amber text-dash-text hidden h-full px-2 transition-colors md:block"
						>
							<svg
								xmlns="http://www.w3.org/2000/svg"
								fill="none"
								viewBox="0 0 24 24"
								stroke-width="2"
								stroke="currentColor"
								class="h-4 w-4"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									d="M15.75 19.5L8.25 12l7.5-7.5"
								/>
							</svg>
						</button>
						<div
							id="season-list"
							class="scrollbar-hide flex flex-grow gap-8 overflow-x-auto scroll-smooth px-2"
						>
							{#each series.seasons as season}
								<button
									onclick={() => changeSeason(season.season_number)}
									class="group relative flex-none py-4 font-mono text-sm font-bold tracking-widest uppercase transition-colors
									{selectedSeason === season.season_number ? 'text-dash-amber' : 'text-dash-text hover:text-white'}"
								>
									SEASON {season.season_number}
									{#if selectedSeason === season.season_number}
										<span
											class="bg-dash-amber absolute bottom-0 left-0 h-0.5 w-full shadow-[0_0_10px_rgba(255,165,0,0.5)]"
										></span>
									{/if}
								</button>
							{/each}
						</div>
						<button
							aria-label="Scroll seasons right"
							onclick={() => scrollContainer('season-list', 'right')}
							class="hover:text-dash-amber text-dash-text hidden h-full px-2 transition-colors md:block"
						>
							<svg
								xmlns="http://www.w3.org/2000/svg"
								fill="none"
								viewBox="0 0 24 24"
								stroke-width="2"
								stroke="currentColor"
								class="h-4 w-4"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									d="M8.25 4.5l7.5 7.5-7.5 7.5"
								/>
							</svg>
						</button>
					</div>

					<div class="group relative">
						<!-- Left Scroll Button -->
						{#if canScrollLeft}
							<button
								aria-label="Scroll episodes left"
								onclick={() => scrollContainer('episode-list', 'left')}
								class="hover:bg-dash-amber absolute top-1/2 left-0 z-10 -ml-6 hidden h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white opacity-0 backdrop-blur-sm transition-all group-hover:opacity-100 hover:text-black md:flex"
							>
								<svg
									xmlns="http://www.w3.org/2000/svg"
									fill="none"
									viewBox="0 0 24 24"
									stroke-width="2"
									stroke="currentColor"
									class="h-6 w-6"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										d="M15.75 19.5L8.25 12l7.5-7.5"
									/>
								</svg>
							</button>
						{/if}

						<div
							id="episode-list"
							class="scrollbar-hide flex gap-4 overflow-x-auto pt-4 pb-4 pl-1"
							onscroll={() => checkScroll('episode-list')}
						>
							{#if isLoadingEpisodes}
								<div
									class="text-dash-text flex w-full animate-pulse justify-center py-12 text-center font-mono opacity-50"
								>
									RETRIEVING_DATA...
								</div>
							{:else}
								{#each episodes as episode}
									<div class="w-[300px] flex-none transition-all duration-300 hover:scale-[1.02]">
										<a
											href={`/series/${series.id}/season/${episode.season_number}/episode/${episode.episode_number}`}
											class="border-dash-border/30 hover:border-dash-amber/50 group/card flex h-full w-full flex-col gap-4 border bg-black/20 p-4 text-left transition-colors"
										>
											<!-- Still Image -->
											<div class="relative h-40 w-full overflow-hidden bg-black/50">
												{#if episode.still_path}
													<img
														src={episode.still_path}
														alt={episode.name}
														class="absolute inset-0 h-full w-full object-cover transition-transform group-hover/card:scale-110"
													/>
												{:else}
													<div class="flex h-full w-full items-center justify-center">
														<span class="text-dash-text/20 font-mono text-xs">NO_SIGNAL</span>
													</div>
												{/if}

												<!-- Play Overlay -->
												<div
													class="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover/card:opacity-100"
												>
													<svg
														xmlns="http://www.w3.org/2000/svg"
														viewBox="0 0 24 24"
														fill="currentColor"
														class="text-dash-amber h-10 w-10"
													>
														<path
															fill-rule="evenodd"
															d="M4.5 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.348c1.295.712 1.295 2.573 0 3.285L7.28 19.991c-1.25.687-2.779-.217-2.779-1.643V5.653z"
															clip-rule="evenodd"
														/>
													</svg>
												</div>

												<div
													class="bg-dash-amber absolute bottom-2 left-2 px-1.5 py-0.5 font-mono text-[10px] font-bold text-black"
												>
													EP_{episode.episode_number}
												</div>
											</div>

											<!-- Info -->
											<div class="flex flex-grow flex-col gap-2">
												<div class="flex items-start justify-between gap-2">
													<h3
														class="text-dash-text-light line-clamp-1 text-sm font-bold tracking-wide uppercase"
													>
														{episode.name}
													</h3>
													<span class="text-dash-text/40 shrink-0 font-mono text-[10px]">
														{episode.air_date}
													</span>
												</div>
												<p class="text-dash-text/70 line-clamp-3 text-xs leading-relaxed">
													{episode.overview}
												</p>
											</div>
										</a>
									</div>
								{/each}
							{/if}
						</div>

						<!-- Right Scroll Button -->
						<button
							aria-label="Scroll episodes right"
							onclick={() => scrollContainer('episode-list', 'right')}
							class="hover:bg-dash-amber absolute top-1/2 right-0 z-10 -mr-6 hidden h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white opacity-0 backdrop-blur-sm transition-all group-hover:opacity-100 hover:text-black md:flex"
						>
							<svg
								xmlns="http://www.w3.org/2000/svg"
								fill="none"
								viewBox="0 0 24 24"
								stroke-width="2"
								stroke="currentColor"
								class="h-6 w-6"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									d="M8.25 4.5l7.5 7.5-7.5 7.5"
								/>
							</svg>
						</button>
					</div>
				</section>
			{/if}

			<!-- Overview -->
			<section>
				<div class="border-dash-border/30 mb-4 flex items-center border-b pb-2">
					<div class="flex items-center gap-3">
						<div class="bg-dash-amber h-6 w-1"></div>
						<h2 class="font-retro text-dash-amber text-2xl tracking-wide uppercase">Description</h2>
					</div>
				</div>
				<p class="text-dash-text max-w-4xl font-mono text-sm leading-relaxed md:text-base">
					{series.overview}
				</p>

				<!-- Extended Details Table -->
				{#if series.status || series.runtime || series.networks}
					<div class="mt-8 border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
						<h3 class="text-dash-amber font-retro mb-4 tracking-widest uppercase">FILE_METADATA</h3>
						<div class="grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2 md:grid-cols-3">
							{#if series.status}
								<div class="flex flex-col gap-1">
									<span class="text-[10px] font-bold tracking-widest text-white/40 uppercase"
										>STATUS</span
									>
									<span class="font-mono text-sm text-white/90">{series.status}</span>
								</div>
							{/if}
							{#if series.runtime}
								<div class="flex flex-col gap-1">
									<span class="text-[10px] font-bold tracking-widest text-white/40 uppercase"
										>EPISODE_RUNTIME</span
									>
									<span class="font-mono text-sm text-white/90">{series.runtime} MIN</span>
								</div>
							{/if}
							<div class="flex flex-col gap-1">
								<span class="text-[10px] font-bold tracking-widest text-white/40 uppercase"
									>TOTAL_SEASONS</span
								>
								<span class="font-mono text-sm text-white/90">{series.seasons?.length || 0}</span>
							</div>
							{#if series.networks && series.networks.length > 0}
								<div class="flex flex-col gap-1 sm:col-span-2 md:col-span-1">
									<span class="text-[10px] font-bold tracking-widest text-white/40 uppercase"
										>NETWORK</span
									>
									<span class="font-mono text-sm text-white/90">{series.networks[0].name}</span>
								</div>
							{/if}
						</div>
					</div>
				{/if}
			</section>

			<!-- Recommendations -->
			<section>
				<div class="border-dash-border/30 mb-6 flex items-center justify-between border-b pb-2">
					<div class="flex items-center gap-3">
						<div class="bg-dash-text-light h-6 w-1"></div>
						<h2 class="font-retro text-dash-text-light text-2xl tracking-wide uppercase">
							Recommendations
						</h2>
					</div>
				</div>
				<div
					id="recommendations-list"
					class="scrollbar-hide flex gap-4 overflow-x-auto pt-4 pb-4 pl-1"
				>
					{#each recommendations as rec}
						<div class="w-[140px] flex-none">
							<MovieCard movie={rec} />
						</div>
					{/each}
				</div>
			</section>
		</div>
	</div>
{/if}
