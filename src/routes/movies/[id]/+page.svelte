<script lang="ts">
	import MovieCard from '$lib/components/ui/MovieCard.svelte';
	import VideoPlayer from '$lib/components/ui/VideoPlayer.svelte';
	import StreamModal from '$lib/components/ui/StreamModal.svelte';

	let { data } = $props();
	// Use derived to keep reactivity when data changes (navigation between movies)
	let movie = $derived(data.movie);
	let cast = $derived(data.cast);
	let recommendations = $derived(data.recommendations);
	let trailer = $derived(data.trailer);
	let streams = $derived(data.streams);

	let isVideoOpen = $state(false);
	let isStreamModalOpen = $state(false);
	let currentVideoUrl = $state<string | undefined>(undefined);
	let currentTrailerId = $state<string | undefined>(undefined);
	let currentAudioTracks = $state<any>(undefined);
	let activeStream = $state<any>(undefined);
	let currentPlayQuality = $state<string | undefined>(undefined);
	let currentDownloader = $state<string | undefined>(undefined);
	let isResolving = $state(false);

	// Auto-select best stream on mount or navigation
	let lastMovieId = $state<number | undefined>(undefined);

	$effect(() => {
		// Detect navigation/movie change
		if (movie.id !== lastMovieId) {
			lastMovieId = movie.id;

			// Reset state
			activeStream = undefined;
			currentPlayQuality = undefined;
			currentVideoUrl = undefined;
			currentTrailerId = undefined;
			currentDownloader = undefined;
			isVideoOpen = false;
			isResolving = false;

			// Select best stream
			if (streams?.streams) {
				const priorities = ['4k', '1080p', '720p', 'other'];
				for (const quality of priorities) {
					if (streams.streams[quality]?.length > 0) {
						activeStream = streams.streams[quality][0];
						currentPlayQuality = quality;
						break;
					}
				}
			}
		}
	});

	async function openPlay() {
		if (activeStream) {
			isResolving = true;
			try {
				const res = await fetch(activeStream.url);
				if (!res.ok) throw new Error('Failed to resolve stream');

				const data = await res.json();
				console.log('[StreamResolve] Full Data:', JSON.stringify(data, null, 2));

				const downloader = data.downloader || data.streamlink?.downloader;
				console.log(`[StreamResolve] Downloader: ${downloader}`);

				// Pick first audio's url
				let finalUrl = data.original;
				let audios = data.audios;

				if (audios) {
					const firstKey = Object.keys(audios)[0];
					if (firstKey && audios[firstKey]['url']) {
						finalUrl = audios[firstKey]['url'];
					}
				}

				currentVideoUrl = finalUrl;
				currentAudioTracks = audios;
				currentTrailerId = undefined;
				currentDownloader = downloader;
				isVideoOpen = true;
			} catch (e) {
				console.error('Stream resolution failed:', e);
				// TODO: Show toast or error?
				// Fallback or just do nothing for now
			} finally {
				isResolving = false;
			}
		} else {
			openStreams();
		}
	}

	function openTrailer() {
		currentVideoUrl = undefined;
		currentTrailerId = trailer;
		currentAudioTracks = undefined;
		currentDownloader = undefined;
		isVideoOpen = true;
	}

	function closePlayer() {
		isVideoOpen = false;
		currentVideoUrl = undefined;
		currentTrailerId = undefined;
		currentAudioTracks = undefined;
		currentDownloader = undefined;
	}

	function closeStreams() {
		isStreamModalOpen = false;
	}

	function openStreams() {
		isStreamModalOpen = true;
	}

	function handleStreamSelect(stream: any) {
		activeStream = stream;
		if (stream.quality) currentPlayQuality = stream.quality;
	}
</script>

<svelte:head>
	<title>MEDIAHUB // {movie.title.toUpperCase()}</title>
</svelte:head>

<VideoPlayer
	isOpen={isVideoOpen}
	youtubeId={currentTrailerId}
	streamUrl={currentVideoUrl}
	audios={currentAudioTracks}
	downloader={currentDownloader}
	onClose={closePlayer}
/>
<StreamModal
	isOpen={isStreamModalOpen}
	{streams}
	onClose={closeStreams}
	onSelect={handleStreamSelect}
	selectedUrl={activeStream?.url}
/>

<!-- Hero Section -->
<div class="relative h-[60vh] w-full overflow-hidden md:h-[70vh]">
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

	<div class="absolute bottom-0 left-0 flex w-full flex-col justify-end p-6 md:p-12">
		<div class="mx-auto w-full max-w-7xl">
			<h1
				class="font-retro text-dash-text-light mb-4 max-w-4xl text-2xl leading-none tracking-tight sm:text-4xl md:text-7xl"
			>
				{movie.title.toUpperCase()}
			</h1>

			<div
				class="text-dash-text mb-6 flex items-center gap-4 font-mono text-xs tracking-widest uppercase"
			>
				<span class="border-dash-text/30 border px-2 py-1">{movie.release_date.split('-')[0]}</span>
				<span class="border-dash-text/30 border px-2 py-1"
					>RATING: {movie.vote_average.toFixed(1)}</span
				>
				{#if movie.genres}
					<span class="text-dash-amber">
						{movie.genres.join(' / ')}
					</span>
				{/if}
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
						<svg
							class="mr-2 -ml-1 h-4 w-4 animate-spin text-black"
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
							class="h-4 w-4 sm:h-5 sm:w-5"
						>
							<path
								fill-rule="evenodd"
								d="M4.5 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.348c1.295.712 1.295 2.573 0 3.285L7.28 19.991c-1.25.687-2.779-.217-2.779-1.643V5.653z"
								clip-rule="evenodd"
							/>
						</svg>
						{activeStream ? 'PLAY_STREAM' : 'OFFLINE'}
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
					onclick={openTrailer}
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
