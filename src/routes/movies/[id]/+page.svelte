<script lang="ts">
	import MovieCard from '$lib/components/ui/MovieCard.svelte';
	import VideoPlayer from '$lib/components/ui/VideoPlayer.svelte';
	import StreamModal from '$lib/components/ui/StreamModal.svelte';
	import { Skeleton } from '$lib/components/ui/skeleton';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { BackendClient } from '$lib/backend';
	import { page } from '$app/stores';
	import { Play, Check, Plus, Loader2 } from 'lucide-svelte';

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

			// Extract trailer
			if (details.videos?.results) {
				const trailer = details.videos.results.find(
					(v: any) => v.type === 'Trailer' && v.site === 'YouTube'
				);
				if (trailer) {
					currentTrailerId = trailer.key;
				}
			}

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

			// Check if response is already grouped
			if (streamList && !Array.isArray(streamList) && streamList.streams) {
				streams = streamList;
				const qualities = Object.keys(streamList.streams);
				const priorities = ['4k', '1080p', '720p', 'other'];
				for (const q of priorities) {
					if (streamList.streams[q]?.length > 0) {
						activeStream = streamList.streams[q][0];
						currentPlayQuality = q;
						break;
					}
				}
				if (!activeStream && qualities.length > 0) {
					activeStream = streamList.streams[qualities[0]][0];
					currentPlayQuality = qualities[0];
				}
				return;
			}

			// Legacy array handling
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
		}
	}

	// Player Logic
	async function openPlay() {
		if (activeStream) {
			isResolving = true;
			try {
				const client = new BackendClient();
				const data = await client.resolveStream(activeStream.url);
				const downloader = data.downloader || data.streamlink?.downloader;
				let finalUrl = data.original;
				let audios = data.audios;

				if (audios) {
					let pickedKey = Object.keys(audios)[0];
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
				currentVideoUrl = activeStream.url;
				isVideoOpen = true;
			} finally {
				isResolving = false;
			}
		} else {
			openStreams();
		}
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

	async function openTrailer() {
		// Try to find trailer if not already set
		if (!currentTrailerId && movie?.videos?.results) {
			const trailer = movie.videos.results.find(
				(v: any) => v.type === 'Trailer' && v.site === 'YouTube'
			);
			if (trailer) {
				currentTrailerId = trailer.key;
			}
		}

		// If still no trailer, try fetching from TMDB directly
		if (!currentTrailerId && movie?.id) {
			try {
				const response = await fetch(
					`https://api.themoviedb.org/3/movie/${movie.id}/videos?api_key=81b92cp786c59e4229e5e851642db0ec`
				);
				const data = await response.json();
				if (data.results) {
					const trailer = data.results.find(
						(v: any) => v.type === 'Trailer' && v.site === 'YouTube'
					);
					if (trailer) {
						currentTrailerId = trailer.key;
					}
				}
			} catch (e) {
				console.error('[openTrailer] Failed to fetch trailer:', e);
			}
		}

		// Open player with trailer (if found) or show empty player
		currentVideoUrl = undefined;
		isVideoOpen = true;
		console.log('[openTrailer] Opening trailer:', currentTrailerId || 'No trailer available');
	}
</script>

<svelte:head>
	<title>MediaHub // {movie ? movie.title : 'Details'}</title>
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
	<div class="text-destructive flex h-screen w-full items-center justify-center">
		{error}
	</div>
{:else if movie}
	<!-- Hero Section -->
	<div
		class="relative flex min-h-[60vh] w-full flex-col justify-end overflow-hidden md:h-[80vh] md:min-h-0 md:justify-end"
	>
		{#if movie.backdrop_path}
			<img
				src={movie.backdrop_path}
				alt={movie.title}
				class="absolute inset-0 h-full w-full object-cover object-center opacity-60"
			/>
		{/if}
		<div
			class="from-background via-background/50 absolute inset-0 bg-gradient-to-t to-transparent opacity-90"
		></div>

		<div class="relative z-20 w-full p-6 pb-16 md:p-12 md:pb-24">
			<div class="mx-auto w-full max-w-7xl">
				<h1
					class="text-foreground mb-4 max-w-4xl text-3xl leading-tight font-extrabold tracking-tight drop-shadow-xl sm:text-5xl md:text-7xl"
				>
					{movie.title}
				</h1>

				<!-- Metadata & Actions Row -->
				<div class="mb-8 flex flex-wrap items-center gap-6">
					<!-- Metadata Group -->
					<div class="text-muted-foreground flex items-center gap-3 text-sm font-medium">
						<span>{movie.release_date.split('-')[0]}</span>
						<span class="text-muted-foreground/30">•</span>
						{#if movie.runtime}
							<span>{Math.floor(movie.runtime / 60)}h {movie.runtime % 60}m</span>
							<span class="text-muted-foreground/30">•</span>
						{/if}
						<Badge variant="secondary" class="font-bold tracking-wide">
							★ {movie.vote_average.toFixed(1)}
						</Badge>
					</div>

					<!-- Add to List Action -->
					<Button
						variant="ghost"
						onclick={toggleWatchlist}
						class="text-foreground hover:text-primary gap-2 rounded-none border-l border-white/20 pl-6 hover:bg-transparent"
					>
						<div
							class="group-hover:bg-primary flex h-8 w-8 items-center justify-center rounded-full bg-white/10 transition-colors group-hover:text-black"
						>
							{#if inWatchlist}
								<Check class="h-4 w-4" />
							{:else}
								<Plus class="h-4 w-4" />
							{/if}
						</div>
						<span class="tracking-wider uppercase opacity-80 group-hover:opacity-100"
							>{inWatchlist ? 'In Library' : 'Add to Library'}</span
						>
					</Button>
				</div>

				{#if cast && cast.length > 0}
					<div class="mb-8 flex flex-wrap items-center gap-4">
						<span class="text-muted-foreground/50 text-xs font-bold tracking-widest uppercase"
							>Starring</span
						>
						<div class="flex items-center -space-x-4 pl-1">
							{#each cast.slice(0, 7) as person}
								<div
									class="ring-background relative z-0 h-10 w-10 overflow-hidden rounded-full ring-2 transition-transform duration-300 hover:z-10 hover:scale-110"
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
					<div class="mb-6 flex w-full max-w-md flex-col gap-2">
						<div class="flex items-center justify-between text-xs font-bold tracking-wide">
							<span class="text-white/80">Resume Playback</span>
							<span class="text-white/50">{remainingMinutes}m remaining</span>
						</div>
						<div class="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
							<div
								class="bg-primary h-full transition-all duration-300"
								style="width: {percentage}%"
							></div>
						</div>
					</div>
				{/if}

				<div class="flex flex-wrap items-start justify-center gap-6 sm:justify-start">
					<!-- Play Action Group -->
					{#if activeStream}
						<div class="flex flex-col items-center gap-4">
							<!-- Play Button -->
							<Button
								onclick={openPlay}
								disabled={!activeStream}
								class="group bg-primary hover:bg-primary/90 relative flex h-14 min-w-[260px] items-center justify-between gap-6 rounded-lg px-6 text-black hover:shadow-[0_0_20px_rgba(250,204,21,0.4)]"
							>
								<!-- Left: Icon -->
								{#if isResolving}
									<Loader2 class="h-5 w-5 animate-spin text-black" />
								{:else}
									<Play class="h-5 w-5 fill-current text-black" />
								{/if}

								<!-- Center: Play Text -->
								<span class="text-xl font-semibold tracking-widest text-black uppercase">
									{isResolving ? 'WAIT' : 'PLAY'}
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
								onclick={openStreams}
								class="h-auto p-0 text-[10px] font-medium tracking-[0.2em] text-white/50 uppercase hover:text-white"
							>
								CHANGE SOURCE
							</Button>
						</div>
					{/if}

					<!-- Watch Trailer Button -->
					<Button
						variant="outline"
						onclick={openTrailer}
						class="flex h-14 min-w-[240px] items-center justify-center rounded-lg border border-white bg-transparent px-8 transition-all duration-300 hover:bg-white/5 hover:text-white"
					>
						<span class="text-base font-semibold tracking-widest text-white"> Watch Trailer </span>
					</Button>
				</div>
			</div>
		</div>
	</div>

	<!-- Content Grid -->
	<div class="mt-8 flex w-full flex-col gap-16 px-6 pb-24 md:px-12">
		<div class="mx-auto flex w-full max-w-7xl flex-col gap-16">
			<!-- Overview & Details -->
			<section class="grid grid-cols-1 gap-12 lg:grid-cols-3">
				<div class="lg:col-span-2">
					<div class="border-border mb-4 border-b pb-2">
						<h2 class="text-foreground text-2xl font-bold tracking-tight uppercase">
							Plot Summary
						</h2>
					</div>
					<p class="text-muted-foreground text-lg leading-relaxed">
						{movie.overview}
					</p>
				</div>

				<!-- Details Column -->
				<div class="border-border bg-card/50 rounded-lg border p-6 backdrop-blur-sm">
					<h3 class="text-foreground mb-6 text-2xl font-bold tracking-tight uppercase">Details</h3>
					<div class="flex flex-col gap-4">
						{#if movie.genres && movie.genres.length > 0}
							<div class="border-border flex justify-between border-b pb-2 last:border-0">
								<span class="text-muted-foreground text-sm font-medium">Genres</span>
								<span class="text-foreground text-right text-sm font-medium">
									{movie.genres.map((g: any) => g.name).join(', ')}
								</span>
							</div>
						{/if}
						{#if movie.status}
							<div class="border-border flex justify-between border-b pb-2 last:border-0">
								<span class="text-muted-foreground text-sm font-medium">Status</span>
								<span class="text-foreground text-right text-sm font-medium">{movie.status}</span>
							</div>
						{/if}
						{#if movie.runtime}
							<div class="border-border flex justify-between border-b pb-2 last:border-0">
								<span class="text-muted-foreground text-sm font-medium">Runtime</span>
								<span class="text-foreground text-right text-sm font-medium"
									>{movie.runtime} min</span
								>
							</div>
						{/if}
						{#if movie.production_companies && movie.production_companies.length > 0}
							<div class="border-border flex justify-between border-b pb-2 last:border-0">
								<span class="text-muted-foreground text-sm font-medium">Studio</span>
								<span class="text-foreground text-right text-sm font-medium">
									{movie.production_companies[0].name}
								</span>
							</div>
						{/if}
					</div>
				</div>
			</section>

			<!-- Recommendations -->
			{#if recommendations.length > 0}
				<section>
					<h2 class="text-foreground mb-6 text-2xl font-bold">You Might Also Like</h2>
					<div class="scrollbar-hide flex gap-4 overflow-x-auto pb-4">
						{#each recommendations as rec}
							<div class="w-[160px] flex-none transition-transform hover:scale-105">
								<MovieCard movie={rec} />
							</div>
						{/each}
					</div>
				</section>
			{/if}
		</div>
	</div>
{/if}
