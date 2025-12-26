<script lang="ts">
	import { page } from '$app/stores';
	import VideoPlayer from '$lib/components/ui/VideoPlayer.svelte';
	import StreamModal from '$lib/components/ui/StreamModal.svelte';

	let { data } = $props();
	let { series, episode } = $derived(data);
	let streams = $state<any>(null);
	let isLoadingStreams = $state(false);

	let isVideoOpen = $state(false);
	let isStreamModalOpen = $state(false);
	let currentVideoUrl = $state<string | undefined>(undefined);
	let currentDownloader = $state<string | undefined>(undefined);
	let currentAudioTracks = $state<any>(undefined);
	let currentPlayQuality = $state<string | undefined>(undefined);
	let activeStream = $state<any>(undefined);

	// Fetch streams on mount
	$effect(() => {
		if (series && series.id && data.seasonNumber && data.episodeNumber) {
			streams = null;
			activeStream = undefined;
			currentPlayQuality = undefined;
			fetchStreams(series.id, data.seasonNumber, data.episodeNumber);
		}
	});

	// Initial setup to have a default active stream if available
	$effect(() => {
		if (streams && streams.streams && !activeStream) {
			// Priority order for auto-selection
			const priorities = ['4k', '1080p', '720p', 'other'];
			for (const quality of priorities) {
				if (streams.streams[quality] && streams.streams[quality].length > 0) {
					const best = streams.streams[quality][0];
					activeStream = { ...best, quality };
					currentPlayQuality = quality;
					break;
				}
			}
		}
	});

	async function fetchStreams(id: number, season: number, episode: number) {
		isLoadingStreams = true;
		try {
			const res = await fetch(`/api/streams/series/${id}/${season}/${episode}`);
			if (res.ok) {
				streams = await res.json();
			}
		} catch (e) {
			console.error('Failed to fetch streams:', e);
		} finally {
			isLoadingStreams = false;
		}
	}

	let isResolving = $state(false);

	async function openPlay() {
		if (isResolving) return;

		if (!activeStream && streams) {
			// Fallback selection if still empty
			if (streams.original) activeStream = { quality: 'Original', url: streams.original };
		}

		if (activeStream) {
			isResolving = true;
			try {
				// Fetch the stream URL to get playback details
				console.log('[EpisodePage] resolving stream:', activeStream.url);
				const res = await fetch(activeStream.url);
				const data = await res.json();
				console.log('[EpisodePage] resolved data:', data);

				if (data && data.audios) {
					// Pick first audio
					const firstKey = Object.keys(data.audios)[0];
					if (firstKey) {
						const audioData = data.audios[firstKey];
						currentVideoUrl = audioData.url;
						// Use downloader from response
						currentDownloader = data.downloader;
						currentAudioTracks = data.audios;
						isVideoOpen = true;
					} else {
						console.error('No audio tracks found in resolved stream');
					}
				} else if (data && data.original) {
					// Fallback to original if no audios? Or just fail?
					currentVideoUrl = data.original;
					currentDownloader = data.downloader;
					isVideoOpen = true;
				}
			} catch (e) {
				console.error('Failed to resolve stream:', e);
			} finally {
				isResolving = false;
			}
		} else {
			// No active stream, open modal
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
		// Optionally auto-play after selection? User usually expects that.
		// Let's NOT auto-play based on "Choose Stream" button context, but usually selection implies intent.
		// In Movie page: `handleStreamSelect` just sets state. Then user clicks Play?
		// Checking Movie page... `handleStreamSelect` sets state.
		// Let's just set state and let user click Play Now which will now use the new stream.
	}

	function closeVideo() {
		isVideoOpen = false;
	}
</script>

<svelte:head>
	<title>{series?.title} // S{data.seasonNumber} E{data.episodeNumber}</title>
</svelte:head>

<VideoPlayer
	isOpen={isVideoOpen}
	streamUrl={currentVideoUrl}
	audios={currentAudioTracks}
	downloader={currentDownloader}
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

<div class="bg-dash-bg text-dash-text relative h-full w-full font-sans">
	<!-- Backdrop with Overlay -->
	<div class="fixed inset-0 h-full w-full">
		{#if episode?.still_path || (series && series.backdrop_path)}
			<img
				src={episode?.still_path || series.backdrop_path}
				alt={series.title}
				class="h-full w-full object-cover opacity-30"
			/>
		{/if}
		<div class="from-dash-bg via-dash-bg/80 to-dash-bg/90 absolute inset-0 bg-gradient-to-t"></div>
		<div
			class="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20"
		></div>
	</div>

	<div class="relative z-10 flex h-full flex-col items-center justify-center p-6 text-center">
		<!-- Breadcrumbs / Nav -->
		{#if series}
			<a
				href="/series/{series.id}"
				class="hover:text-dash-amber text-dash-text-light/50 mb-8 font-mono text-xs tracking-widest uppercase transition-colors"
			>
				&larr; RETURN_TO_SERIES_DATABASE
			</a>
		{/if}

		{#if episode}
			<h2 class="text-dash-amber mb-2 font-mono text-sm font-bold tracking-widest uppercase">
				SEASON_{data.seasonNumber} // EPISODE_{data.episodeNumber}
			</h2>
			<h1 class="font-retro text-dash-text-light mb-6 text-3xl tracking-wide uppercase md:text-5xl">
				{episode.name}
			</h1>
			<p class="text-dash-text/80 max-w-2xl text-sm leading-relaxed md:text-base">
				{episode.overview}
			</p>

			<div class="mt-10 flex flex-col items-center gap-4 sm:flex-row">
				<button
					onclick={openPlay}
					disabled={isResolving || isLoadingStreams}
					class="bg-dash-amber border-dash-amber group flex min-w-[200px] items-center justify-center gap-3 border px-8 py-4 font-bold tracking-widest text-black uppercase transition-all hover:bg-black hover:text-[#DCA54C] disabled:cursor-wait"
				>
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
						RESOLVING...
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
						PLAY_NOW
					{/if}
				</button>

				<button
					onclick={openStreams}
					class="border-dash-border hover:border-dash-text-light text-dash-text hover:text-dash-text-light flex min-w-[200px] items-center justify-center gap-2 border px-6 py-4 font-bold tracking-widest uppercase transition-all"
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
					{currentPlayQuality ? `SRC: ${currentPlayQuality}` : 'CHOOSE_SOURCE'}
				</button>
			</div>
		{:else}
			<div class="text-xl text-red-500">EPISODE_DATA_CORRUPTED</div>
		{/if}
	</div>
</div>
