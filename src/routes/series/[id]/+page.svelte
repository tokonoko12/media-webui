<script lang="ts">
	import MovieCard from '$lib/components/ui/MovieCard.svelte';
	import VideoPlayer from '$lib/components/ui/VideoPlayer.svelte';

	let { data } = $props();

	let series = $derived(data.series);
	let cast = $derived(data.cast);
	let recommendations = $derived(data.recommendations);
	let trailer = $derived(data.trailer);

	let isVideoOpen = $state(false);

	function openVideo() {
		isVideoOpen = true;
	}

	function closeVideo() {
		isVideoOpen = false;
	}
</script>

<svelte:head>
	<title>MEDIAHUB // {series.title.toUpperCase()}</title>
</svelte:head>

<VideoPlayer isOpen={isVideoOpen} youtubeId={trailer} onClose={closeVideo} />

<!-- Hero Section -->
<div class="relative h-[60vh] w-full overflow-hidden md:h-[70vh]">
	{#if series.backdrop_path}
		<img
			src={series.backdrop_path}
			alt={series.title}
			class="absolute inset-0 h-full w-full object-cover opacity-60"
		/>
	{/if}
	<div class="from-dash-bg absolute inset-0 bg-gradient-to-t via-black/50 to-transparent"></div>
	<div
		class="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20"
	></div>

	<div class="absolute bottom-0 left-0 flex w-full flex-col justify-end p-6 md:p-12">
		<div class="mx-auto w-full max-w-7xl">
			<span
				class="bg-dash-amber mb-4 inline-block px-2 py-0.5 text-xs font-bold text-black uppercase"
			>
				SERIES_DATABASE
			</span>
			<h1
				class="font-retro text-dash-text-light mb-4 max-w-4xl text-2xl leading-none tracking-tight sm:text-4xl md:text-7xl"
			>
				{series.title.toUpperCase()}
			</h1>

			<div
				class="text-dash-text mb-8 flex items-center gap-4 font-mono text-xs tracking-widest uppercase"
			>
				<span class="border-dash-text/30 border px-2 py-1">{series.release_date.split('-')[0]}</span
				>
				<span class="border-dash-text/30 border px-2 py-1"
					>RATING: {series.vote_average.toFixed(1)}</span
				>
				{#if series.genres}
					<span class="text-dash-amber">
						{series.genres.join(' / ')}
					</span>
				{/if}
			</div>

			<div class="flex flex-col gap-3 sm:flex-row sm:gap-4">
				<button
					onclick={openVideo}
					class="bg-dash-border hover:bg-dash-amber text-dash-text-light group flex items-center justify-center gap-2 border border-transparent px-6 py-3 text-sm font-bold tracking-widest uppercase transition-all hover:border-black hover:text-black sm:px-8 sm:text-base"
				>
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
					{trailer ? 'INITIATE_PLAYBACK' : 'OFFLINE'}
				</button>
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
			</div>
		</div>
	</div>
</div>

<!-- Content Grid -->
<div class="mx-auto grid max-w-7xl grid-cols-1 gap-12 p-6 md:grid-cols-3 md:p-12">
	<!-- Left Col: Overview & Cast -->
	<div class="flex flex-col gap-12 md:col-span-2">
		<section>
			<h2
				class="text-dash-amber border-dash-border/30 mb-4 border-b pb-2 text-sm font-bold tracking-widest uppercase"
			>
				SYNOPSIS.TXT
			</h2>
			<p class="text-dash-text font-mono text-sm leading-relaxed md:text-base">
				{series.overview}
			</p>
		</section>

		<section>
			<h2
				class="text-dash-text-light border-dash-border/30 mb-6 border-b pb-2 text-sm font-bold tracking-widest uppercase"
			>
				CAST_AND_CREW
			</h2>
			<div class="scrollbar-hide flex space-x-6 overflow-x-auto pb-4">
				{#each cast as person}
					<div class="flex flex-none flex-col items-center gap-3 text-center">
						<div
							class="ring-dash-border/30 hover:ring-dash-amber relative h-24 w-24 overflow-hidden rounded-full ring-2 transition-all hover:scale-105 hover:ring-4"
						>
							{#if person.profile_path}
								<img
									src={person.profile_path}
									alt={person.name}
									class="h-full w-full object-cover transition-opacity"
								/>
							{:else}
								<div class="bg-dash-border/10 flex h-full w-full items-center justify-center">
									<svg
										xmlns="http://www.w3.org/2000/svg"
										fill="none"
										viewBox="0 0 24 24"
										stroke-width="1.5"
										stroke="currentColor"
										class="text-dash-text/20 h-8 w-8"
									>
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
										/>
									</svg>
								</div>
							{/if}
						</div>

						<div class="flex max-w-[100px] flex-col gap-0.5">
							<div class="text-dash-text-light truncate text-xs font-bold uppercase">
								{person.name}
							</div>
							<div class="text-dash-text/60 truncate text-[10px] uppercase">
								{person.character}
							</div>
						</div>
					</div>
				{/each}
			</div>
		</section>
	</div>

	<!-- Right Col: Recommendations -->
	<div class="md:col-span-1">
		<h2
			class="text-dash-text-light border-dash-border/30 mb-6 border-b pb-2 text-sm font-bold tracking-widest uppercase"
		>
			REL_DATA_PACKETS
		</h2>
		<div class="flex flex-col gap-4">
			{#each recommendations as rec}
				<MovieCard movie={rec} />
			{/each}
		</div>
	</div>
</div>
