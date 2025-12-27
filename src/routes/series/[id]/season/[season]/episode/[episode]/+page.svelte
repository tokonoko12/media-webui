<script lang="ts">
	import { page } from '$app/stores';
	import VideoPlayer from '$lib/components/ui/VideoPlayer.svelte';
	import StreamModal from '$lib/components/ui/StreamModal.svelte';
	import { BackendClient } from '$lib/backend';
	import { onMount } from 'svelte';

	// No props from server
	// let { data } = $props();

	const seriesId = $derived($page.params.id);
	const seasonNumber = $derived(Number($page.params.season));
	const episodeNumber = $derived(Number($page.params.episode));

	let series = $state<any>(null);
	let episode = $state<any>(null);
	let isLoading = $state(true);
	let error = $state<string | null>(null);

	let streams = $state<any>(null);
	let isLoadingStreams = $state(false);

	let isVideoOpen = $state(false);
	let isStreamModalOpen = $state(false);
	let currentVideoUrl = $state<string | undefined>(undefined);
	let currentDownloader = $state<string | undefined>(undefined);
	let currentAudioTracks = $state<any>(undefined);
	let currentPlayQuality = $state<string | undefined>(undefined);
	let activeStream = $state<any>(undefined);

	// Fetch data when params change
	$effect(() => {
		if (seriesId && seasonNumber && episodeNumber) {
			// Reset
			series = null;
			episode = null;
			streams = null;
			activeStream = undefined;
			currentVideoUrl = undefined;
			loadEpisodeData(seriesId, seasonNumber, episodeNumber);
		}
	});

	async function loadEpisodeData(sid: string, sn: number, en: number) {
		isLoading = true;
		error = null;
		try {
			const client = new BackendClient();

			// 1. Get Series Info for header/backdrop
			const sDetails = await client.getSeriesDetails(sid);
			series = sDetails;

			// 2. Get Season Details to find Episode
			const seasonData = await client.getSeasonDetails(sid, sn);
			const foundEp = seasonData.episodes?.find((e: any) => e.episode_number === en);

			if (foundEp) {
				episode = foundEp;
				// 3. Fetch Streams
				if (foundEp.streams_url) {
					fetchStreams(foundEp.streams_url);
				} else {
					console.warn('No streams_url found for episode');
					// Fallback to manual construction potentially? Or just fail gracefully
					fetchStreams(sid, sn, en);
				}
			} else {
				error = 'Episode not found';
			}
		} catch (e: any) {
			console.error(e);
			error = 'Failed to load episode data';
		} finally {
			isLoading = false;
		}
	}

	async function fetchStreams(urlOrSid: string, sn?: number, en?: number) {
		isLoadingStreams = true;
		try {
			const client = new BackendClient();
			let streamList: any = [];

			if (urlOrSid.startsWith('http')) {
				streamList = await client.getStreams(urlOrSid);
			} else if (sn && en) {
				// Fallback to manual ID
				streamList = await client.getSeriesStreams(urlOrSid, sn, en);
			}

			// Check if response is already grouped
			if (streamList && !Array.isArray(streamList) && streamList.streams) {
				streams = streamList;
				// Auto-select
				const priorities = ['4k', '1080p', '720p', 'other'];
				for (const q of priorities) {
					if (streamList.streams[q]?.length > 0) {
						activeStream = streamList.streams[q][0];
						currentPlayQuality = q;
						break;
					}
				}
				// Fallback
				const qualities = Object.keys(streamList.streams);
				if (!activeStream && qualities.length > 0) {
					activeStream = streamList.streams[qualities[0]][0];
					currentPlayQuality = qualities[0];
				}
				return;
			}

			// Legacy array handling
			// Group streams
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
			console.error('Failed to fetch streams:', e);
		} finally {
			isLoadingStreams = false;
		}
	}

	let isResolving = $state(false);
	let currentDuration = $state(0);

	async function openPlay() {
		if (isResolving) return;

		if (!activeStream && streams) {
			// No fallback since we structure differently now, needs activeStream
			openStreams();
			return;
		}

		if (activeStream) {
			isResolving = true;
			try {
				console.log('[EpisodePage] resolving stream:', activeStream.url);
				const client = new BackendClient();
				const data = await client.resolveStream(activeStream.url);
				console.log('[EpisodePage] resolved data:', data);

				if (data && data.audios) {
					let pickedKey = Object.keys(data.audios)[0];
					const downloader = data.downloader || data.streamlink?.downloader;

					// Smart selection: specific downloaders prefer MPD (DASH)
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
				// Fallback attempt?
				currentVideoUrl = activeStream.url;
				isVideoOpen = true;
			} finally {
				isResolving = false;
			}
		} else {
			isStreamModalOpen = true;
		}
	}

	function openStreams() {
		isStreamModalOpen = true;
	}

	function handleStreamSelect(stream: any) {
		activeStream = stream;
		currentPlayQuality = stream.quality;
		isStreamModalOpen = false;
	}

	function closeVideo() {
		isVideoOpen = false;
	}
</script>

<svelte:head>
	<title>{series ? series.title : 'LOADING..'} // S{seasonNumber} E{episodeNumber}</title>
</svelte:head>

<VideoPlayer
	isOpen={isVideoOpen}
	streamUrl={currentVideoUrl}
	audios={currentAudioTracks}
	downloader={currentDownloader}
	mediaId={series?.id}
	mediaType="series"
	season={seasonNumber}
	episode={episodeNumber}
	startTime={episode?.watched_duration || 0}
	streamDuration={currentDuration}
	onClose={closeVideo}
	youtubeId={undefined}
/>

<StreamModal
	isOpen={isStreamModalOpen}
	{streams}
	selectedUrl={activeStream?.url}
	onSelect={handleStreamSelect}
	onClose={() => (isStreamModalOpen = false)}
/>

{#if isLoading}
	<div
		class="text-dash-amber flex h-screen w-full animate-pulse items-center justify-center font-mono"
	>
		INITIALIZING SEQUENCE...
	</div>
{:else if error}
	<div class="flex h-screen w-full items-center justify-center font-mono text-red-500">
		{error}
	</div>
{:else if episode}
	<div class="relative min-h-[calc(100vh-6rem)] w-full overflow-hidden font-sans">
		<!-- Backdrop with Overlay -->
		<div class="fixed inset-0 h-full w-full">
			{#if episode.still_path || (series && series.backdrop_path)}
				<img
					src={episode.still_path || series.backdrop_path}
					alt={series?.title ?? 'Series Background'}
					class="h-full w-full object-cover opacity-60 transition-opacity duration-1000"
				/>
			{/if}
			<!-- Radial gradient for center focus -->
			<div
				class="absolute inset-0 bg-[radial-gradient(circle_at_center,_transparent_0%,_#0a0a0a_100%)] opacity-80"
			></div>
			<!-- Grain overlay -->
			<div
				class="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-30 mix-blend-overlay"
			></div>
		</div>

		<div
			class="relative z-10 flex min-h-[calc(100vh-6rem)] flex-col items-center justify-center p-4 md:p-8"
		>
			<!-- Content Card -->
			<div
				class="w-full max-w-5xl overflow-hidden rounded-3xl border border-white/10 bg-black/40 p-8 text-center shadow-2xl backdrop-blur-xl md:p-16"
			>
				<!-- Header Meta -->
				<div class="mb-8 flex flex-col items-center gap-4">
					{#if series}
						<a
							href="/series/{series.id}"
							class="group flex items-center gap-2 rounded-full border border-white/5 bg-white/5 px-4 py-1.5 text-[10px] font-bold tracking-widest text-white/60 uppercase transition-all hover:bg-white/10 hover:text-white"
						>
							<svg
								xmlns="http://www.w3.org/2000/svg"
								fill="none"
								viewBox="0 0 24 24"
								stroke-width="2"
								stroke="currentColor"
								class="h-3 w-3 transition-transform group-hover:-translate-x-1"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18"
								/>
							</svg>
							Back to Series
						</a>
					{/if}

					<h2
						class="text-dash-amber font-mono text-xs font-bold tracking-[0.3em] uppercase drop-shadow-md"
					>
						Season {seasonNumber} <span class="px-2 text-white/30">//</span> Episode {episodeNumber}
					</h2>
				</div>

				<!-- Title -->
				<h1
					class="font-retro mx-auto mb-8 max-w-4xl bg-gradient-to-b from-white to-white/60 bg-clip-text text-4xl leading-tight tracking-wide text-transparent uppercase drop-shadow-2xl md:text-6xl lg:text-7xl"
				>
					{episode.name}
				</h1>

				<!-- Overview -->
				<p
					class="mx-auto mb-12 max-w-3xl text-sm leading-relaxed font-light text-white/80 md:text-lg"
				>
					{episode.overview}
				</p>

				<!-- Actions -->
				{#if episode.watched_duration > 0}
					{@const runtime = episode.runtime || series.runtime || 0}
					<!-- Only show if we have a runtime to calc percentage, or just show saved progress if no runtime? -->
					<!-- Assuming runtime is available usually. If not, maybe just 'Resume' without bar? -->
					{#if runtime > 0}
						{@const totalSeconds = runtime * 60}
						{@const percentage = Math.min(
							100,
							Math.max(0, (episode.watched_duration / totalSeconds) * 100)
						)}
						{@const remainingMinutes = Math.max(
							0,
							Math.floor((totalSeconds - episode.watched_duration) / 60)
						)}
						<div class="mx-auto mb-6 flex w-full max-w-md flex-col gap-2">
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
				{/if}

				<div class="flex flex-col items-center justify-center gap-4 sm:flex-row">
					<button
						onclick={openPlay}
						disabled={isResolving || isLoadingStreams}
						class="group bg-dash-amber relative flex min-w-[200px] items-center justify-center gap-3 overflow-hidden rounded-sm px-8 py-4 font-bold tracking-widest text-black uppercase shadow-[0_0_20px_rgba(220,165,76,0.3)] transition-all hover:scale-105 hover:shadow-[0_0_40px_rgba(220,165,76,0.6)] disabled:cursor-wait disabled:opacity-70"
					>
						<div
							class="absolute inset-0 translate-y-full bg-white/20 transition-transform duration-300 group-hover:translate-y-0"
						></div>
						{#if isResolving || isLoadingStreams}
							<svg
								class="h-5 w-5 animate-spin"
								xmlns="http://www.w3.org/2000/svg"
								fill="none"
								viewBox="0 0 24 24"
							>
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
							<span>Resolving...</span>
						{:else}
							<svg
								xmlns="http://www.w3.org/2000/svg"
								viewBox="0 0 24 24"
								fill="currentColor"
								class="h-6 w-6"
							>
								<path
									fill-rule="evenodd"
									d="M4.5 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.348c1.295.712 1.295 2.573 0 3.285L7.28 19.991c-1.25.687-2.779-.217-2.779-1.643V5.653z"
									clip-rule="evenodd"
								/>
							</svg>
							<span>Play Now</span>
						{/if}
					</button>

					<button
						onclick={openStreams}
						disabled={!streams || !streams.streams || Object.keys(streams.streams).length === 0}
						class="group hover:text-dash-amber flex min-w-[200px] items-center justify-center gap-2 rounded-sm border border-white/20 bg-white/5 px-6 py-4 font-bold tracking-widest text-white uppercase backdrop-blur-sm transition-all hover:border-white/40 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-white/20 disabled:hover:bg-white/5 disabled:hover:text-white"
					>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							fill="none"
							viewBox="0 0 24 24"
							stroke-width="1.5"
							stroke="currentColor"
							class="h-6 w-6"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								d="M6 13.5V3.75m0 9.75a1.5 1.5 0 010 3m0-3a1.5 1.5 0 000 3m0 3.75V16.5m12-3V3.75m0 9.75a1.5 1.5 0 010 3m0-3a1.5 1.5 0 000 3m0 3.75V16.5m-6-9V3.75m0 3.75a1.5 1.5 0 010 3m0-3a1.5 1.5 0 000 3m0 9.75V10.5"
							/>
						</svg>
						<span>{currentPlayQuality ? `Source: ${currentPlayQuality}` : 'Source: Auto'}</span>
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}
