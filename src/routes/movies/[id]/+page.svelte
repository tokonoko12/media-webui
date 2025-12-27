<script lang="ts">
	import MovieCard from '$lib/components/ui/MovieCard.svelte';
	import VideoPlayer from '$lib/components/ui/VideoPlayer.svelte';
	import StreamModal from '$lib/components/ui/StreamModal.svelte';
	import Skeleton from '$lib/components/ui/Skeleton.svelte';
	import { BackendClient } from '$lib/backend';
	import { page } from '$app/stores';
	import { onMount } from 'svelte';

	// No props from server
	// let { data } = $props();

	const movieId = $derived($page.params.id);

	let movie = $state<any>(null);
	let cast = $state<any[]>([]);
	let recommendations = $state<any[]>([]);
	let inWatchlist = $state(false);
	let isLoading = $state(true);
	let error = $state<string | null>(null);

	// Streams state
	let streams = $state<any>(null);
	let isLoadingStreams = $state(false);
	let activeStream = $state<any>(undefined);
	let currentPlayQuality = $state<string | undefined>(undefined);

	// Player state
	let isVideoOpen = $state(false);
	let isStreamModalOpen = $state(false);
	let currentVideoUrl = $state<string | undefined>(undefined);
	let currentTrailerId = $state<string | undefined>(undefined);
	let currentAudioTracks = $state<any>(undefined);
	let currentDownloader = $state<string | undefined>(undefined);
	let currentDuration = $state(0);
	let isResolving = $state(false);

	async function loadMovieData(id: string) {
		isLoading = true;
		error = null;
		try {
			const client = new BackendClient();
			// 1. Fetch Details
			const details = await client.getMovieDetails(id);
			movie = details;
			cast = details.credits?.cast || [];
			recommendations = details.recommendations || [];

			// 2. Fetch Watchlist Status (if logged in logic handled by client internally?
			// relying on cookie auto-read).
			// If checking fails (e.g. 401), just assume false.
			// 2. Fetch Watchlist Status
			if (typeof details.in_watchlist === 'boolean') {
				inWatchlist = details.in_watchlist;
			} else {
				try {
					const { watchlist } = await client.getWatchlist();
					inWatchlist = watchlist.some(
						(item: any) =>
							(item.tmdb_id && item.tmdb_id.toString() === id) ||
							(item.id && item.id === id && item.media_type === 'movie')
					);
				} catch (ignore) {}
			}

			// 3. Fetch Streams automatically
			if (details.streams_url) {
				fetchStreams(details.streams_url);
			} else {
				fetchStreams(id);
			}
		} catch (e: any) {
			console.error(e);
			error = 'Failed to load movie details';
		} finally {
			isLoading = false;
		}
	}

	$effect(() => {
		if (movieId) {
			// Reset state
			movie = null;
			streams = null;
			activeStream = undefined;
			loadMovieData(movieId);
		}
	});

	async function fetchStreams(urlOrId: string) {
		isLoadingStreams = true;
		try {
			const client = new BackendClient();
			let streamList: any = [];

			if (urlOrId.startsWith('http')) {
				streamList = await client.getStreams(urlOrId);
			} else {
				streamList = await client.getMovieStreams(urlOrId);
			}

			// Check if response is already grouped (new backend format)
			if (streamList && !Array.isArray(streamList) && streamList.streams) {
				streams = streamList;
				// Extract qualities from keys
				const qualities = Object.keys(streamList.streams);
				// Auto-select based on priorities
				const priorities = ['4k', '1080p', '720p', 'other'];
				for (const q of priorities) {
					if (streamList.streams[q]?.length > 0) {
						activeStream = streamList.streams[q][0];
						currentPlayQuality = q;
						break;
					}
				}
				// If no priority match, pick first available
				if (!activeStream && qualities.length > 0) {
					activeStream = streamList.streams[qualities[0]][0];
					currentPlayQuality = qualities[0];
				}
				return;
			}

			// Legacy array handling
			// Transform streams to match UI expectation (grouped by quality)
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

			// Auto-select
			const priorities = ['4k', '1080p', '720p', 'other'];
			for (const q of priorities) {
				if (grouped[q]?.length > 0) {
					activeStream = grouped[q][0];
					currentPlayQuality = q;
					break;
				}
			}
		} catch (e) {
			console.error('Failed to fetch streams', e);
		} finally {
			isLoadingStreams = false;
		}
	}

	async function toggleWatchlist() {
		if (!movie) return;
		try {
			const client = new BackendClient();
			if (inWatchlist) {
				await client.removeFromWatchlist(movie.id.toString());
				inWatchlist = false;
			} else {
				await client.addToWatchlist({ media_id: movie.id.toString(), media_type: 'movie' });
				inWatchlist = true;
			}
		} catch (e) {
			console.error('Watchlist toggle failed', e);
			// Maybe show toast
		}
	}

	// Player Logic
	async function openPlay() {
		if (activeStream) {
			isResolving = true;
			try {
				// If the URL acts as a resolver (returns JSON), we fetch it using the client to ensure auth.
				const client = new BackendClient();
				const data = await client.resolveStream(activeStream.url);
				// Apply same logic as before
				const downloader = data.downloader || data.streamlink?.downloader;
				let finalUrl = data.original;
				let audios = data.audios;

				// Smart selection: specific downloaders prefer MPD (DASH)
				if (audios) {
					let pickedKey = Object.keys(audios)[0];
					// If RealDebrid, prefer MPD if available
					if (downloader === 'realdebrid') {
						const mpdKey = Object.keys(audios).find((k) => audios[k].url.includes('.mpd'));
						if (mpdKey) pickedKey = mpdKey;
					}

					if (pickedKey && audios[pickedKey]['url']) {
						finalUrl = audios[pickedKey]['url'];
					}
				}

				currentVideoUrl = finalUrl;
				currentAudioTracks = audios;
				currentDownloader = downloader;
				currentDuration = data.duration || 0;

				currentTrailerId = undefined;
				isVideoOpen = true;
			} catch (e) {
				console.error('Stream resolution failed', e);
				// Fallback
				currentVideoUrl = activeStream.url;
				isVideoOpen = true;
			} finally {
				isResolving = false;
			}
		} else {
			openStreams();
		}
	}

	function openTrailer() {
		// Trailer logic? Details doesn't provide it currently.
		// We'll leave it empty or mock.
		console.warn('Trailer not available');
	}

	function closePlayer() {
		isVideoOpen = false;
		currentVideoUrl = undefined;
		currentTrailerId = undefined;
		currentAudioTracks = undefined;
		currentDownloader = undefined;
	}

	function openStreams() {
		isStreamModalOpen = true;
	}

	function closeStreams() {
		isStreamModalOpen = false;
	}

	function handleStreamSelect(stream: any) {
		activeStream = stream;
		if (stream.quality) currentPlayQuality = stream.quality;
	}
</script>

<svelte:head>
	<title>MEDIAHUB // {movie ? movie.title.toUpperCase() : 'LOADING...'}</title>
</svelte:head>

<VideoPlayer
	isOpen={isVideoOpen}
	youtubeId={currentTrailerId}
	streamUrl={currentVideoUrl}
	audios={currentAudioTracks}
	downloader={currentDownloader}
	mediaId={movie?.id}
	mediaType="movie"
	startTime={movie?.watched_duration || 0}
	streamDuration={currentDuration}
	onClose={closePlayer}
/>

<StreamModal
	isOpen={isStreamModalOpen}
	{streams}
	onClose={closeStreams}
	onSelect={handleStreamSelect}
	selectedUrl={activeStream?.url}
/>

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
{:else if movie}
	<!-- Hero Section -->
	<div
		class="relative flex min-h-[60vh] w-full flex-col justify-end overflow-hidden md:h-[70vh] md:min-h-0 md:justify-end"
	>
		{#if movie.backdrop_path}
			<img
				src={movie.backdrop_path}
				alt={movie.title}
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
					{movie.title.toUpperCase()}
				</h1>

				<div
					class="text-dash-text mb-6 flex items-center gap-4 font-mono text-xs tracking-widest uppercase"
				>
					<span class="border-dash-text/30 border px-2 py-1"
						>{movie.release_date.split('-')[0]}</span
					>
					<span class="border-dash-text/30 border px-2 py-1"
						>RATING: {movie.vote_average.toFixed(1)}</span
					>
				</div>

				{#if cast && cast.length > 0}
					<div class="mb-6 flex flex-wrap items-center gap-4">
						<span class="text-dash-amber font-mono text-xs font-bold tracking-widest uppercase"
							>STARRING:</span
						>
						<div class="flex items-center -space-x-4 pl-1">
							{#each cast.slice(0, 7) as person}
								<div
									class="ring-dash-bg relative z-0 h-12 w-12 overflow-hidden rounded-full ring-2 transition-transform duration-300 hover:z-10 hover:scale-110"
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

				{#if movie.watched_duration > 0 && movie.runtime > 0}
					{@const totalSeconds = movie.runtime * 60}
					{@const percentage = Math.min(
						100,
						Math.max(0, (movie.watched_duration / totalSeconds) * 100)
					)}
					{@const remainingMinutes = Math.max(
						0,
						Math.floor((totalSeconds - movie.watched_duration) / 60)
					)}
					<div class="mb-4 flex w-full max-w-md flex-col gap-2">
						<div
							class="flex items-center justify-between text-[10px] font-bold tracking-widest uppercase"
						>
							<span class="text-dash-amber">Resume Playback</span>
							<span class="text-white/60">{remainingMinutes}m remaining</span>
						</div>
						<div class="h-1 w-full rounded-full bg-white/10">
							<div
								class="bg-dash-amber h-full rounded-full shadow-[0_0_10px_rgba(255,165,0,0.5)]"
								style="width: {percentage}%"
							></div>
						</div>
					</div>
				{/if}

				<div class="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:gap-4">
					<button
						onclick={openPlay}
						disabled={!activeStream}
						class="group flex items-center justify-center gap-2 border px-6 py-3 text-sm font-bold tracking-widest uppercase transition-all sm:px-8 sm:text-base
                        {activeStream
							? 'bg-dash-amber border-dash-amber hover:text-dash-amber text-black hover:bg-black'
							: 'cursor-not-allowed border-transparent bg-stone-800 text-stone-500'}"
					>
						{#if isResolving}
							<svg class="mr-2 -ml-1 h-4 w-4 animate-spin text-black" viewBox="0 0 24 24">
								<circle
									class="opacity-25"
									cx="12"
									cy="12"
									r="10"
									stroke="currentColor"
									stroke-width="4"
								></circle>
								<path
									class="opacity-75"
									fill="currentColor"
									d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
								></path>
							</svg>
							RESOLVING...
						{:else}
							<svg
								xmlns="http://www.w3.org/2000/svg"
								viewBox="0 0 24 24"
								fill="currentColor"
								class="h-4 w-4 sm:h-5 sm:w-5"
							>
								<path
									fill-rule="evenodd"
									d="M4.5 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.348c1.295.712 1.295 2.573 0 3.285L7.28 19.991c-1.25.687-2.779-.217-2.779-1.643V5.653z"
									clip-rule="evenodd"
								/>
							</svg>
							{#if isLoadingStreams}
								LOADING...
							{:else}
								{activeStream ? 'PLAY_STREAM' : 'OFFLINE'}
							{/if}
						{/if}
					</button>
					<button
						onclick={openStreams}
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
								d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
							/>
						</svg>
						CHOOSE_STREAM {currentPlayQuality ? `[${currentPlayQuality}]` : ''}
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
	<div class="mt-8 flex w-full flex-col gap-12 px-6 md:px-12">
		<div class="mx-auto flex w-full max-w-7xl flex-col gap-12">
			<!-- Overview & Cast -->
			<section>
				<div class="border-dash-border/30 mb-4 flex items-center border-b pb-2">
					<div class="flex items-center gap-3">
						<div class="bg-dash-amber h-6 w-1"></div>
						<h2 class="font-retro text-dash-amber text-2xl tracking-wide uppercase">Description</h2>
					</div>
				</div>
				<p class="text-dash-text max-w-4xl font-mono text-sm leading-relaxed md:text-base">
					{movie.overview}
				</p>

				<!-- Extended Details Table -->
				{#if movie.status || movie.runtime || movie.budget}
					<div class="mt-8 border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
						<h3 class="text-dash-amber font-retro mb-4 tracking-widest uppercase">FILE_METADATA</h3>
						<div class="grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2 md:grid-cols-3">
							{#if movie.genres && movie.genres.length > 0}
								<div class="flex flex-col gap-1 sm:col-span-2 md:col-span-1">
									<span class="text-[10px] font-bold tracking-widest text-white/40 uppercase"
										>GENRES</span
									>
									<span class="text-dash-amber font-mono text-sm">
										{movie.genres.map((g: any) => g.name).join(' / ')}
									</span>
								</div>
							{/if}
							{#if movie.status}
								<div class="flex flex-col gap-1">
									<span class="text-[10px] font-bold tracking-widest text-white/40 uppercase"
										>STATUS</span
									>
									<span class="font-mono text-sm text-white/90">{movie.status}</span>
								</div>
							{/if}
							{#if movie.runtime}
								<div class="flex flex-col gap-1">
									<span class="text-[10px] font-bold tracking-widest text-white/40 uppercase"
										>RUNTIME</span
									>
									<span class="font-mono text-sm text-white/90">{movie.runtime} MIN</span>
								</div>
							{/if}
							{#if movie.budget && movie.budget > 0}
								<div class="flex flex-col gap-1">
									<span class="text-[10px] font-bold tracking-widest text-white/40 uppercase"
										>BUDGET</span
									>
									<span class="font-mono text-sm text-white/90"
										>${(movie.budget / 1000000).toFixed(1)}M</span
									>
								</div>
							{/if}
							{#if movie.revenue && movie.revenue > 0}
								<div class="flex flex-col gap-1">
									<span class="text-[10px] font-bold tracking-widest text-white/40 uppercase"
										>REVENUE</span
									>
									<span class="font-mono text-sm text-white/90"
										>${(movie.revenue / 1000000).toFixed(1)}M</span
									>
								</div>
							{/if}
							{#if movie.production_companies && movie.production_companies.length > 0}
								<div class="flex flex-col gap-1 sm:col-span-2 md:col-span-1">
									<span class="text-[10px] font-bold tracking-widest text-white/40 uppercase"
										>STUDIO</span
									>
									<span class="font-mono text-sm text-white/90"
										>{movie.production_companies[0].name}</span
									>
								</div>
							{/if}
						</div>
					</div>
				{/if}
			</section>

			<!-- Recommendations -->
			<section>
				<div class="border-dash-border/30 mb-6 flex items-center border-b pb-2">
					<div class="flex items-center gap-3">
						<div class="bg-dash-text-light h-6 w-1"></div>
						<h2 class="font-retro text-dash-text-light text-2xl tracking-wide uppercase">
							Recommendations
						</h2>
					</div>
				</div>
				<div class="scrollbar-hide flex gap-4 overflow-x-auto pt-4 pb-4 pl-1">
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
