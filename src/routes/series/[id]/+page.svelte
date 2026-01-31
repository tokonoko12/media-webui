<script lang="ts">
	import MovieCard from '$lib/components/ui/MovieCard.svelte';
	import VideoPlayer from '$lib/components/ui/VideoPlayer.svelte';
	import StreamModal from '$lib/components/ui/StreamModal.svelte';
	import { Skeleton } from '$lib/components/ui/skeleton';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { BackendClient } from '$lib/backend';
	import { page } from '$app/stores';
	import { onMount, tick } from 'svelte';
	import { Play, Check, Plus, Loader2, Info, ChevronLeft, ChevronRight } from 'lucide-svelte';
	import * as Card from '$lib/components/ui/card';

	const seriesId = $derived($page.params.id);

	let series = $state<any>(null);
	let cast = $state<any[]>([]);
	let recommendations = $state<any[]>([]);
	let trailer = $state<string | undefined>(undefined);
	let inWatchlist = $state(false);
	let isLoading = $state(true);
	let error = $state<string | null>(null);

	// Player & Stream State
	let isVideoOpen = $state(false);
	let isStreamModalOpen = $state(false);
	let streams = $state<any>(null);
	let isLoadingStreams = $state(false);
	let activeStream = $state<any>(undefined);
	let currentPlayQuality = $state<string | undefined>(undefined);
	let currentVideoUrl = $state<string | undefined>(undefined);
	let currentDownloader = $state<string | undefined>(undefined);
	let currentAudioTracks = $state<any>(undefined);
	let currentDuration = $state(0);
	let isResolving = $state(false);

	// Playback Context
	let playingEpisode = $state<any>(null);

	// State for Season Selection
	let selectedSeason = $state(1);
	let episodes = $state<any[]>([]);
	let isLoadingEpisodes = $state(false);
	let selectedEpisode = $state<any>(null); // Track selected episode for auto-play

	// Helper function to check if episode is watched
	function isEpisodeWatched(episode: any): boolean {
		if (!episode.runtime || !episode.watched_duration) return false;
		const totalSeconds = episode.runtime * 60;
		const remaining = totalSeconds - episode.watched_duration;
		return remaining < 5; // Watched if less than 5 seconds remaining
	}

	// Helper function to find first unwatched episode
	function findFirstUnwatchedEpisode(): any | null {
		if (!episodes || episodes.length === 0) return null;
		// Find first episode that is not fully watched
		const unwatched = episodes.find((ep) => !isEpisodeWatched(ep));
		return unwatched || episodes[0]; // Fallback to first episode
	}

	$effect(() => {
		if (seriesId) {
			// Reset state
			series = null;
			selectedSeason = 1;
			episodes = [];
			streams = null;
			activeStream = undefined;
			loadSeriesData(seriesId);
		}
	});

	async function loadSeriesData(id: string) {
		isLoading = true;
		error = null;
		try {
			const client = new BackendClient();
			const details = await client.getSeriesDetails(id);

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
				// Auto-select first unwatched episode
				selectedEpisode = findFirstUnwatchedEpisode();
			}
		} catch (e) {
			console.error('Failed to load season:', e);
		} finally {
			isLoadingEpisodes = false;
		}
	}

	// Handle URL parameter for episode selection
	$effect(() => {
		const episodeParam = $page.url.searchParams.get('episode');
		if (episodeParam && episodes.length > 0) {
			const targetEp = episodes.find((ep) => ep.episode_number === parseInt(episodeParam));
			if (targetEp) {
				selectedEpisode = targetEp;
			}
		}
	});

	// Fetch streams when episode is auto-selected
	$effect(() => {
		if (selectedEpisode && !streams) {
			playingEpisode = selectedEpisode;
			if (selectedEpisode.streams_url) {
				fetchStreams(selectedEpisode.streams_url);
			} else if (seriesId) {
				fetchStreams(seriesId, selectedEpisode.season_number, selectedEpisode.episode_number);
			}
		}
	});

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

	// --- Stream / Player Logic ---

	async function playEpisode(episode: any) {
		playingEpisode = episode;
		streams = null;
		activeStream = undefined;
		currentVideoUrl = undefined;

		if (episode.streams_url) {
			await fetchStreams(episode.streams_url);
		} else {
			await fetchStreams(seriesId ?? '', episode.season_number, episode.episode_number);
		}

		openPlay();
	}

	async function fetchStreams(urlOrSid: string, sn?: number, en?: number) {
		isLoadingStreams = true;
		try {
			const client = new BackendClient();
			let streamList: any = [];

			if (urlOrSid.startsWith('http')) {
				streamList = await client.getStreams(urlOrSid);
			} else if (sn && en) {
				streamList = await client.getSeriesStreams(urlOrSid, sn, en);
			}

			if (streamList && !Array.isArray(streamList) && streamList.streams) {
				streams = streamList;
				const priorities = ['4k', '1080p', '720p', 'other'];
				for (const q of priorities) {
					if (streamList.streams[q]?.length > 0) {
						activeStream = streamList.streams[q][0];
						currentPlayQuality = q;
						break;
					}
				}
				const qualities = Object.keys(streamList.streams);
				if (!activeStream && qualities.length > 0) {
					activeStream = streamList.streams[qualities[0]][0];
					currentPlayQuality = qualities[0];
				}
				return;
			}

			const grouped: Record<string, any[]> = {};
			['4k', '1080p', '720p', 'other'].forEach((q) => (grouped[q] = []));

			if (Array.isArray(streamList)) {
				for (const s of streamList) {
					let quality = s.quality?.toLowerCase() || 'other';
					if (['4k', '2160p', 'uhl'].includes(quality)) quality = '4k';
					else if (['1080p', 'fhd'].includes(quality)) quality = '1080p';
					else if (['720p', 'hd'].includes(quality)) quality = '720p';
					else quality = 'other';

					grouped[quality].push({ ...s, quality });
				}
			}
			streams = { streams: grouped };

			const priorities = ['4k', '1080p', '720p', 'other'];
			for (const q of priorities) {
				if (grouped[q]?.length > 0) {
					activeStream = grouped[q][0];
					currentPlayQuality = q;
					break;
				}
			}
		} catch (e) {
			console.error('Failed to fetch streams:', e);
		} finally {
			isLoadingStreams = false;
		}
	}

	async function openPlay() {
		if (isResolving) return;

		if (!activeStream && streams) {
			isStreamModalOpen = true;
			return;
		}

		if (activeStream) {
			isResolving = true;
			try {
				const client = new BackendClient();
				const data = await client.resolveStream(activeStream.url);

				if (data && data.audios) {
					let pickedKey = Object.keys(data.audios)[0];
					const downloader = data.downloader || data.streamlink?.downloader;

					if (downloader === 'realdebrid') {
						const mpdKey = Object.keys(data.audios).find((k) =>
							data.audios[k].url.includes('.mpd')
						);
						if (mpdKey) pickedKey = mpdKey;
					}

					if (pickedKey) {
						const audioData = data.audios[pickedKey];
						currentVideoUrl = audioData.url;
						currentDownloader = downloader;
						currentAudioTracks = data.audios;
						currentDuration = data.duration || 0;
						isVideoOpen = true;
					}
				} else if (data && data.original) {
					currentVideoUrl = data.original;
					currentDownloader = data.downloader || data.streamlink?.downloader;
					currentDuration = data.duration || 0;
					isVideoOpen = true;
				}
			} catch (e) {
				console.error('Failed to resolve stream:', e);
				currentVideoUrl = activeStream.url;
				isVideoOpen = true;
			} finally {
				isResolving = false;
			}
		}
	}

	function closeVideo() {
		isVideoOpen = false;
		currentVideoUrl = undefined;
	}

	function handleStreamSelect(stream: any) {
		activeStream = stream;
		currentPlayQuality = stream.quality;
		isStreamModalOpen = false;
		openPlay();
	}

	async function handleHeroPlay() {
		// Streams already fetched when episode was selected
		// Just open the player
		openPlay();
	}
</script>

<svelte:head>
	<title>MEDIAHUB // {series ? series.title.toUpperCase() : 'LOADING...'}</title>
</svelte:head>

<VideoPlayer
	isOpen={isVideoOpen}
	streamUrl={currentVideoUrl}
	audios={currentAudioTracks}
	downloader={currentDownloader}
	mediaId={series?.id}
	mediaType="series"
	season={playingEpisode?.season_number}
	episode={playingEpisode?.episode_number}
	startTime={playingEpisode?.watched_duration || 0}
	streamDuration={currentDuration}
	onClose={closeVideo}
	youtubeId={trailer}
/>

<StreamModal
	isOpen={isStreamModalOpen}
	{streams}
	selectedUrl={activeStream?.url}
	onSelect={handleStreamSelect}
	onClose={() => (isStreamModalOpen = false)}
/>

{#if isLoading}
	<div class="animate-pulse">
		<div class="bg-muted/10 h-[60vh] w-full md:h-[70vh]"></div>
		<div class="mx-auto mt-8 flex max-w-7xl flex-col gap-12 px-6 md:px-12">
			<div class="space-y-4">
				<Skeleton class="h-10 w-48" />
				<div class="space-y-2">
					<Skeleton class="h-4 w-full max-w-2xl" />
					<Skeleton class="h-4 w-full max-w-xl" />
					<Skeleton class="h-4 w-full max-w-lg" />
				</div>
			</div>
		</div>
	</div>
{:else if error}
	<div class="text-destructive flex h-screen w-full items-center justify-center font-mono">
		{error}
	</div>
{:else if series}
	<!-- Hero Section -->
	<div
		class="relative flex min-h-[60vh] w-full flex-col justify-end overflow-hidden md:h-[80vh] md:min-h-0 md:justify-end"
	>
		{#if series.backdrop_path}
			<img
				src={series.backdrop_path}
				alt={series.title}
				class="absolute inset-0 h-full w-full object-cover opacity-60"
			/>
		{/if}
		<div
			class="from-background via-background/50 absolute inset-0 bg-gradient-to-t to-transparent opacity-90"
		></div>

		<div class="relative z-20 w-full p-6 pt-24 md:p-12">
			<div class="mx-auto w-full max-w-7xl">
				<h1
					class="text-foreground mb-4 max-w-4xl text-3xl leading-tight font-extrabold tracking-tight drop-shadow-xl sm:text-4xl md:text-7xl"
				>
					{series.title}
				</h1>

				<div class="text-muted-foreground mb-6 flex items-center gap-3 text-sm font-medium">
					<span>{series.release_date.split('-')[0]}</span>
					<span class="text-muted-foreground/30">•</span>
					<Badge variant="secondary" class="font-bold tracking-wide">
						★ {series.vote_average.toFixed(1)}
					</Badge>

					<!-- Add to Library Button -->
					<Button
						variant="ghost"
						size="sm"
						onclick={toggleWatchlist}
						class="hover:text-primary gap-2 rounded-none border-l border-white/20 pl-3 hover:bg-transparent"
					>
						<div
							class="group-hover:bg-primary flex h-6 w-6 items-center justify-center rounded-full bg-white/10 transition-colors group-hover:text-black"
						>
							{#if inWatchlist}
								<Check class="h-3 w-3" />
							{:else}
								<Plus class="h-3 w-3" />
							{/if}
						</div>
						<span class="text-xs tracking-wider uppercase opacity-80 group-hover:opacity-100">
							{inWatchlist ? 'In Library' : 'Add to Library'}
						</span>
					</Button>
				</div>

				{#if cast && cast.length > 0}
					<div class="mb-8 flex flex-wrap items-center gap-4">
						<span class="text-muted-foreground/50 text-xs font-bold tracking-widest uppercase"
							>Starring</span
						>
						<div class="flex items-center -space-x-4 pl-2">
							{#each cast.slice(0, 7) as person}
								<div
									class="ring-background relative z-0 h-10 w-10 overflow-hidden rounded-full ring-2 transition-transform duration-300 hover:z-10 hover:scale-110 sm:h-12 sm:w-12"
									title={person.name}
								>
									{#if person.profile_path}
										<img
											src={person.profile_path}
											alt={person.name}
											class="h-full w-full object-cover"
										/>
									{:else}
										<div class="bg-muted flex h-full w-full items-center justify-center">
											<span class="text-muted-foreground text-[8px] uppercase"
												>{person.name.charAt(0)}</span
											>
										</div>
									{/if}
								</div>
							{/each}
						</div>
					</div>
				{/if}

				<div class="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:gap-4">
					<!-- Play Button with Quality Badge -->
					{#if isLoadingStreams}
						<!-- Loading State -->
						<div class="flex flex-col gap-1">
							<Button
								disabled
								class="flex h-14 min-w-[260px] items-center justify-center gap-3 rounded-lg px-6 text-base font-semibold uppercase opacity-70"
							>
								<Loader2 class="h-5 w-5 animate-spin" />
								<span class="text-xl font-semibold tracking-widest uppercase"
									>Loading Streams...</span
								>
							</Button>
						</div>
					{:else if streams && currentPlayQuality}
						<div class="flex flex-col gap-1">
							<Button
								onclick={() => handleHeroPlay()}
								disabled={isResolving}
								class="bg-primary hover:bg-primary/90 group relative flex h-14 min-w-[260px] items-center justify-between gap-6 rounded-lg px-6 text-black hover:shadow-[0_0_20px_rgba(250,204,21,0.4)]"
							>
								<!-- Left: Icon -->
								{#if isResolving}
									<Loader2 class="h-5 w-5 animate-spin text-black" />
								{:else}
									<Play class="h-5 w-5 fill-current text-black" />
								{/if}

								<!-- Center: Play Text -->
								<span class="text-xl font-semibold tracking-widest text-black uppercase">
									{isResolving
										? 'WAIT'
										: `Play S${selectedSeason} E${selectedEpisode?.episode_number || 1}`}
								</span>

								<!-- Divider -->
								<div class="h-8 w-px bg-black/30"></div>

								<!-- Right: Quality -->
								<span class="text-base font-semibold tracking-widest text-black uppercase">
									{currentPlayQuality || '4K'}
								</span>
							</Button>

							<!-- Change Source Link (Below Button) -->
							<Button
								variant="link"
								onclick={() => {
									isStreamModalOpen = true;
								}}
								class="h-auto p-0 text-[10px] font-medium tracking-[0.2em] text-white/50 uppercase hover:text-white"
							>
								CHANGE SOURCE
							</Button>
						</div>
					{:else}
						<!-- Play Button (No Streams Loaded) -->
						<Button
							onclick={() => handleHeroPlay()}
							size="lg"
							class="gap-2 rounded-lg px-8 text-base font-semibold uppercase"
						>
							<Play class="h-5 w-5 fill-current" />
							Play S{selectedSeason} E{selectedEpisode?.episode_number || 1}
						</Button>
					{/if}
				</div>
			</div>
		</div>
	</div>

	<!-- Content Grid -->
	<div class="mt-8 flex w-full flex-col gap-20 px-6 md:px-12">
		<div class="mx-auto flex w-full max-w-7xl flex-col gap-16">
			<!-- Episodes Section -->
			{#if series.seasons && series.seasons.length > 0}
				<section>
					<!-- Season Tabs -->
					<div class="border-border mb-8 flex w-full items-center gap-2 border-b">
						<button
							aria-label="Scroll seasons left"
							onclick={() => scrollContainer('season-list', 'left')}
							class="text-muted-foreground hover:text-primary hidden h-full px-2 transition-colors md:block"
						>
							<ChevronLeft class="h-5 w-5" />
						</button>
						<div
							id="season-list"
							class="scrollbar-hide flex flex-grow gap-8 overflow-x-auto scroll-smooth px-2"
						>
							{#each series.seasons as season}
								<button
									onclick={() => changeSeason(season.season_number)}
									class="group relative flex-none py-4 text-sm font-bold tracking-widest uppercase transition-colors
									{selectedSeason === season.season_number
										? 'text-primary'
										: 'text-muted-foreground hover:text-foreground'}"
								>
									{season.name}
									{#if selectedSeason === season.season_number}
										<span
											class="bg-primary absolute bottom-0 left-0 h-0.5 w-full shadow-[0_0_10px_rgba(250,204,21,0.5)]"
										></span>
									{/if}
								</button>
							{/each}
						</div>
						<button
							aria-label="Scroll seasons right"
							onclick={() => scrollContainer('season-list', 'right')}
							class="text-muted-foreground hover:text-primary hidden h-full px-2 transition-colors md:block"
						>
							<ChevronRight class="h-5 w-5" />
						</button>
					</div>

					<div class="group relative">
						<!-- Left Scroll Button -->
						{#if canScrollLeft}
							<button
								aria-label="Scroll episodes left"
								onclick={() => scrollContainer('episode-list', 'left')}
								class="bg-background/80 text-foreground hover:bg-primary absolute top-1/2 left-0 z-10 -ml-6 hidden h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full opacity-0 backdrop-blur-sm transition-all group-hover:opacity-100 hover:text-black md:flex"
							>
								<ChevronLeft class="h-6 w-6" />
							</button>
						{/if}

						<div
							id="episode-list"
							class="scrollbar-hide flex gap-4 overflow-x-auto pt-4 pb-4 pl-1"
							onscroll={() => checkScroll('episode-list')}
						>
							{#if isLoadingEpisodes}
								<div
									class="text-muted-foreground flex w-full animate-pulse justify-center py-12 text-center font-mono"
								>
									<Loader2 class="mr-2 h-4 w-4 animate-spin" /> Loading Episodes...
								</div>
							{:else}
								{#each episodes as episode}
									<div class="w-[300px] flex-none transition-all duration-300 hover:scale-[1.02]">
										<Card.Root
											class="bg-card/50 hover:bg-muted/50 h-full cursor-pointer transition-colors {selectedEpisode?.episode_number ===
											episode.episode_number
												? 'ring-primary ring-2'
												: 'border-0'}"
											onclick={async () => {
												selectedEpisode = episode;
												playingEpisode = episode;
												streams = null;
												activeStream = undefined;
												currentVideoUrl = undefined;

												if (episode.streams_url) {
													await fetchStreams(episode.streams_url);
												} else {
													await fetchStreams(
														seriesId ?? '',
														episode.season_number,
														episode.episode_number
													);
												}
											}}
										>
											<Card.Content class="flex flex-col gap-4 p-4 text-left">
												<!-- Still Image -->
												<div class="bg-muted relative h-40 w-full overflow-hidden rounded-md">
													{#if episode.still_path}
														<img
															src={episode.still_path}
															alt={episode.name}
															class="absolute inset-0 h-full w-full object-cover transition-transform group-hover:scale-110 {isEpisodeWatched(
																episode
															)
																? 'opacity-60'
																: ''}"
														/>
													{:else}
														<div class="flex h-full w-full items-center justify-center">
															<span class="text-muted-foreground/50 font-mono text-xs"
																>NO IMAGE</span
															>
														</div>
													{/if}

													<!-- Watched Indicator -->
													{#if isEpisodeWatched(episode)}
														<div
															class="absolute inset-0 flex items-center justify-center bg-black/60"
														>
															<div class="flex flex-col items-center gap-2">
																<div
																	class="bg-primary flex h-12 w-12 items-center justify-center rounded-full"
																>
																	<Check class="h-6 w-6 text-black" />
																</div>
																<span
																	class="text-primary text-xs font-bold tracking-wider uppercase"
																	>Watched</span
																>
															</div>
														</div>
													{/if}

													<!-- Play Overlay -->
													<div
														class="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100"
													>
														<Play class="text-primary h-10 w-10 fill-current" />
													</div>

													<div
														class="bg-primary absolute bottom-2 left-2 rounded-sm px-1.5 py-0.5 font-mono text-[10px] font-bold text-black"
													>
														EP {episode.episode_number}
													</div>
												</div>

												<!-- Info -->
												<div class="flex flex-grow flex-col gap-1">
													<div class="flex items-start justify-between gap-2">
														<h3
															class="text-foreground line-clamp-1 text-sm font-bold tracking-wide uppercase"
														>
															{episode.name}
														</h3>
														<span class="text-muted-foreground shrink-0 font-mono text-[10px]">
															{episode.air_date}
														</span>
													</div>
													<p class="text-muted-foreground line-clamp-3 text-xs leading-relaxed">
														{episode.overview}
													</p>
												</div>
											</Card.Content>
										</Card.Root>
									</div>
								{/each}
							{/if}
						</div>

						<!-- Right Scroll Button -->
						<button
							aria-label="Scroll episodes right"
							onclick={() => scrollContainer('episode-list', 'right')}
							class="bg-background/80 text-foreground hover:bg-primary absolute top-1/2 right-0 z-10 -mr-6 hidden h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full opacity-0 backdrop-blur-sm transition-all group-hover:opacity-100 hover:text-black md:flex"
						>
							<ChevronRight class="h-6 w-6" />
						</button>
					</div>
				</section>
			{/if}

			<!-- Overview -->
			<section class="grid grid-cols-1 gap-12 lg:grid-cols-3">
				<div class="lg:col-span-2">
					<div class="border-border mb-4 border-b pb-2">
						<h2 class="text-foreground text-2xl font-bold tracking-tight uppercase">Description</h2>
					</div>
					<p class="text-muted-foreground text-lg leading-relaxed">
						{series.overview}
					</p>
				</div>

				<!-- Extended Details Table -->
				<div class="border-border bg-card/50 rounded-lg border p-6 backdrop-blur-sm">
					<h3 class="text-foreground mb-6 text-2xl font-bold tracking-tight uppercase">Details</h3>
					<div class="grid grid-cols-1 gap-4">
						{#if series.status}
							<div class="border-border flex justify-between border-b pb-2">
								<span class="text-muted-foreground text-sm font-medium">Status</span>
								<span class="text-foreground text-sm font-medium">{series.status}</span>
							</div>
						{/if}
						{#if series.runtime}
							<div class="border-border flex justify-between border-b pb-2">
								<span class="text-muted-foreground text-sm font-medium">Episode Runtime</span>
								<span class="text-foreground text-sm font-medium">{series.runtime} min</span>
							</div>
						{/if}
						<div class="border-border flex justify-between border-b pb-2">
							<span class="text-muted-foreground text-sm font-medium">Seasons</span>
							<span class="text-foreground text-sm font-medium">{series.seasons?.length || 0}</span>
						</div>
						{#if series.networks && series.networks.length > 0}
							<div class="border-border flex justify-between border-b pb-2">
								<span class="text-muted-foreground text-sm font-medium">Network</span>
								<span class="text-foreground text-sm font-medium">{series.networks[0].name}</span>
							</div>
						{/if}
					</div>
				</div>
			</section>

			<!-- Recommendations -->
			<section>
				<h2 class="text-foreground mb-6 text-2xl font-bold">You Might Also Like</h2>
				<div id="recommendations-list" class="scrollbar-hide flex gap-4 overflow-x-auto pb-4">
					{#each recommendations as rec}
						<div class="w-[140px] flex-none transition-transform hover:scale-105">
							<MovieCard movie={rec} />
						</div>
					{/each}
				</div>
			</section>
		</div>
	</div>
{/if}

<style>
	.scrollbar-hide::-webkit-scrollbar {
		display: none;
	}
	.scrollbar-hide {
		-ms-overflow-style: none;
		scrollbar-width: none;
	}
</style>
