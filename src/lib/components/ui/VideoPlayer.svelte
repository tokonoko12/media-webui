<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { fade, scale } from 'svelte/transition';
	import Hls from 'hls.js';

	let { isOpen, youtubeId, streamUrl = undefined, audios = undefined, onClose } = $props();

	let videoElement: HTMLVideoElement;
	let containerElement: HTMLDivElement;
	let hls: Hls | null = null;

	let isPlaying = $state(false);
	let isBuffering = $state(false);
	let showControls = $state(true);
	let hideControlsTimeout: NodeJS.Timeout;
	let audioTracks = $derived(audios ? Object.entries(audios) : []);
	let showAudioMenu = $state(false);

	// Timeline & Audio State
	let currentTime = $state(0);
	let duration = $state(0);
	let selectedAudioUrl = $state<string | undefined>(undefined);

	// Set initial selected audio (default to streamUrl or first track)
	$effect(() => {
		if (isOpen && streamUrl && !selectedAudioUrl) {
			selectedAudioUrl = streamUrl;
		}
	});

	// Reset state when opening/closing
	$effect(() => {
		if (!isOpen) {
			if (hls) {
				hls.destroy();
				hls = null;
			}
			isPlaying = false;
			isBuffering = false;
			showControls = true;
			currentTime = 0;
			duration = 0;
			selectedAudioUrl = undefined;
		}
	});

	// Initialize HLS or Native Video
	$effect(() => {
		if (isOpen && streamUrl && videoElement) {
			isBuffering = true;
			if (Hls.isSupported()) {
				if (hls) hls.destroy();
				hls = new Hls({
					enableWorker: true,
					lowLatencyMode: true
				});
				hls.loadSource(streamUrl);
				hls.attachMedia(videoElement);
				hls.on(Hls.Events.MANIFEST_PARSED, () => {
					videoElement.play().catch(() => console.log('Autoplay blocked'));
					isPlaying = true;
				});
			} else if (videoElement.canPlayType('application/vnd.apple.mpegurl')) {
				// iOS Safari
				videoElement.src = streamUrl;
				videoElement.addEventListener('loadedmetadata', () => {
					videoElement.play();
					isPlaying = true;
				});
			} else {
				// Direct file play (mp4/mkv) if browser supports
				videoElement.src = streamUrl;
				videoElement.play();
				isPlaying = true;
			}
		}
	});

	function handleKeydown(e: KeyboardEvent) {
		if (!isOpen) return;
		if (e.key === 'Escape') onClose();
		if (streamUrl) {
			if (e.key === ' ' || e.code === 'Space') {
				e.preventDefault();
				togglePlay();
			}
			if (e.key === 'ArrowRight') seekRelative(15);
			if (e.key === 'ArrowLeft') seekRelative(-15);
			if (e.key === 'f') toggleFullscreen();
		}
	}

	function togglePlay() {
		if (videoElement) {
			if (videoElement.paused) {
				videoElement.play();
				isPlaying = true;
			} else {
				videoElement.pause();
				isPlaying = false;
			}
			resetControlsTimer();
		}
	}

	function seekRelative(seconds: number) {
		if (videoElement) {
			videoElement.currentTime += seconds;
			resetControlsTimer();
		}
	}

	function handleTimelineChange(e: Event) {
		const target = e.target as HTMLInputElement;
		const time = parseFloat(target.value);
		if (videoElement) {
			videoElement.currentTime = time;
			currentTime = time;
		}
		resetControlsTimer();
	}

	function toggleFullscreen() {
		if (!document.fullscreenElement) {
			containerElement?.requestFullscreen();
		} else {
			document.exitFullscreen();
		}
	}

	function changeAudio(url: string) {
		selectedAudioUrl = url;
		isBuffering = true;
		if (hls) {
			const currentTimeSaver = videoElement.currentTime;
			const wasPlaying = !videoElement.paused;

			hls.loadSource(url);

			// Try to restore position and play state after clear
			hls.once(Hls.Events.MANIFEST_PARSED, () => {
				videoElement.currentTime = currentTimeSaver;
				if (wasPlaying) videoElement.play();
			});

			showAudioMenu = false;
		} else if (videoElement) {
			const currentTimeSaver = videoElement.currentTime;
			videoElement.src = url;
			videoElement.currentTime = currentTimeSaver;
			videoElement.play();
			showAudioMenu = false;
		}
	}

	function resetControlsTimer() {
		showControls = true;
		clearTimeout(hideControlsTimeout);
		if (isPlaying && !showAudioMenu) {
			// Don't hide if menu is open
			hideControlsTimeout = setTimeout(() => {
				showControls = false;
				showAudioMenu = false;
			}, 3000);
		}
	}

	function onMouseMove() {
		resetControlsTimer();
	}

	function formatTime(seconds: number): string {
		if (!seconds || isNaN(seconds)) return '00:00';
		const h = Math.floor(seconds / 3600);
		const m = Math.floor((seconds % 3600) / 60);
		const s = Math.floor(seconds % 60);
		if (h > 0) {
			return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
		}
		return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
	}
</script>

<svelte:window onkeydown={handleKeydown} />

{#if isOpen}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black"
		transition:fade={{ duration: 200 }}
	>
		{#if streamUrl}
			<!-- Custom HLS/Video Player -->
			<div
				bind:this={containerElement}
				class="relative h-full w-full overflow-hidden bg-black"
				onmousemove={onMouseMove}
				role="region"
				aria-label="Video Player"
			>
				<!-- svelte-ignore a11y_media_has_caption -->
				<video
					bind:this={videoElement}
					class="h-full w-full object-contain"
					crossorigin="anonymous"
					playsinline
					onclick={togglePlay}
					onplay={() => {
						isPlaying = true;
						isBuffering = false;
					}}
					onpause={() => (isPlaying = false)}
					onwaiting={() => (isBuffering = true)}
					onplaying={() => (isBuffering = false)}
					ontimeupdate={() => (currentTime = videoElement?.currentTime || 0)}
					ondurationchange={() => (duration = videoElement?.duration || 0)}
				></video>

				<!-- Buffering Indicator -->
				{#if isBuffering}
					<div class="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
						<svg
							class="text-dash-amber h-16 w-16 animate-spin opacity-75"
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
					</div>
				{/if}

				<!-- Controls Overlay -->
				{#if showControls || !isPlaying}
					<div
						transition:fade={{ duration: 200 }}
						class="absolute inset-0 z-20 flex flex-col justify-between bg-black/40 p-4 sm:p-8"
					>
						<!-- Top Bar -->
						<div class="flex items-start justify-between">
							<button
								onclick={onClose}
								class="rounded-full bg-black/50 p-3 text-white backdrop-blur-sm transition-all hover:scale-105 hover:bg-white/20"
								aria-label="Close"
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
										d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18"
									/>
								</svg>
							</button>

							<!-- Audio Selector -->
							{#if audioTracks.length > 0}
								<div class="relative">
									<button
										onclick={(e) => {
											e.stopPropagation();
											showAudioMenu = !showAudioMenu;
										}}
										class="rounded-full bg-black/50 p-3 text-white backdrop-blur-sm transition-all hover:scale-105 hover:bg-white/20"
										aria-label="Audio Settings"
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
												d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z"
											/>
										</svg>
									</button>
									{#if showAudioMenu}
										<div
											class="absolute top-full right-0 mt-2 w-56 overflow-hidden rounded-lg bg-black/90 p-1 text-sm text-white shadow-xl backdrop-blur-md"
										>
											{#each audioTracks as [key, track]: [string, any]}
												<button
													onclick={(e) => {
														e.stopPropagation();
														changeAudio(track['hls-url']);
													}}
													class="block w-full rounded px-4 py-2 text-left transition-colors {selectedAudioUrl ===
													track['hls-url']
														? 'bg-dash-amber font-bold text-black'
														: 'text-white hover:bg-white/10'}"
												>
													<div class="flex items-center justify-between">
														<span>{track.language || key}</span>
														{#if selectedAudioUrl === track['hls-url']}
															<svg
																xmlns="http://www.w3.org/2000/svg"
																viewBox="0 0 24 24"
																fill="currentColor"
																class="h-4 w-4"
															>
																<path
																	fill-rule="evenodd"
																	d="M19.916 4.626a.75.75 0 01.208 1.04l-9 13.5a.75.75 0 01-1.154.114l-6-6a.75.75 0 011.06-1.06l5.353 5.353 8.493-12.74a.75.75 0 011.04-.207z"
																	clip-rule="evenodd"
																/>
															</svg>
														{/if}
													</div>
												</button>
											{/each}
										</div>
									{/if}
								</div>
							{/if}
						</div>

						<!-- Center Play/Pause -->
						<div
							class="absolute top-1/2 left-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center gap-8"
						>
							<button
								onclick={() => seekRelative(-15)}
								class="flex flex-col items-center gap-1 text-white/70 transition-all hover:scale-110 hover:text-white"
								aria-label="Rewind 15s"
							>
								<svg
									xmlns="http://www.w3.org/2000/svg"
									fill="none"
									viewBox="0 0 24 24"
									stroke-width="2"
									stroke="currentColor"
									class="h-8 w-8"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3"
									/>
								</svg>
								<span class="text-[10px] font-bold">-15s</span>
							</button>

							<button
								onclick={togglePlay}
								class="bg-dash-amber flex h-20 w-20 items-center justify-center rounded-full text-black shadow-lg transition-all hover:scale-105 hover:bg-white"
								aria-label={isPlaying ? 'Pause' : 'Play'}
							>
								{#if isPlaying}
									<svg
										xmlns="http://www.w3.org/2000/svg"
										fill="currentColor"
										viewBox="0 0 24 24"
										class="h-10 w-10"
									>
										<path
											fill-rule="evenodd"
											d="M6.75 5.25a.75.75 0 01.75-.75H9a.75.75 0 01.75.75v13.5a.75.75 0 01-.75.75H7.5a.75.75 0 01-.75-.75V5.25zm7.5 0A.75.75 0 0115 4.5h1.5a.75.75 0 01.75.75v13.5a.75.75 0 01-.75.75H15a.75.75 0 01-.75-.75V5.25z"
											clip-rule="evenodd"
										/>
									</svg>
								{:else}
									<svg
										xmlns="http://www.w3.org/2000/svg"
										viewBox="0 0 24 24"
										fill="currentColor"
										class="ml-1 h-10 w-10"
									>
										<path
											fill-rule="evenodd"
											d="M4.5 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.348c1.295.712 1.295 2.573 0 3.285L7.28 19.991c-1.25.687-2.779-.217-2.779-1.643V5.653z"
											clip-rule="evenodd"
										/>
									</svg>
								{/if}
							</button>

							<button
								onclick={() => seekRelative(15)}
								class="flex flex-col items-center gap-1 text-white/70 transition-all hover:scale-110 hover:text-white"
								aria-label="Forward 15s"
							>
								<svg
									xmlns="http://www.w3.org/2000/svg"
									fill="none"
									viewBox="0 0 24 24"
									stroke-width="2"
									stroke="currentColor"
									class="h-8 w-8"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										d="M15 15l6-6m0 0l-6-6m6 6H9a6 6 0 000 12h3"
										transform="scale(-1, 1) translate(-24, 0)"
									/>
								</svg>
								<span class="text-[10px] font-bold">+15s</span>
							</button>
						</div>

						<!-- Bottom Bar & Timeline -->
						<div
							class="-mx-4 mt-auto -mb-4 flex flex-col gap-2 bg-gradient-to-t from-black/80 to-transparent px-4 pt-8 pb-0 sm:-mx-8 sm:-mb-8 sm:px-8 sm:pb-8"
						>
							<div class="flex items-center gap-4">
								<span class="w-12 text-right font-mono text-xs text-white/80"
									>{formatTime(currentTime)}</span
								>
								<input
									type="range"
									min="0"
									max={duration || 100}
									value={currentTime}
									oninput={handleTimelineChange}
									class="[&::-webkit-slider-thumb]:bg-dash-amber h-1 flex-1 cursor-pointer appearance-none rounded-full bg-white/30 transition-all [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full hover:[&::-webkit-slider-thumb]:scale-125"
								/>
								<span class="w-12 font-mono text-xs text-white/50">{formatTime(duration)}</span>
							</div>

							<div class="flex items-center justify-end">
								<button
									onclick={toggleFullscreen}
									class="rounded-full bg-black/50 p-2 text-white backdrop-blur-sm transition-all hover:scale-105 hover:bg-white/20"
									aria-label="Fullscreen"
								>
									<svg
										xmlns="http://www.w3.org/2000/svg"
										fill="none"
										viewBox="0 0 24 24"
										stroke-width="1.5"
										stroke="currentColor"
										class="h-5 w-5"
									>
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15"
										/>
									</svg>
								</button>
							</div>
						</div>
					</div>
				{/if}
			</div>
		{:else if youtubeId}
			<!-- YouTube Trailer Player -->
			<div
				class="relative aspect-video w-full max-w-5xl overflow-hidden rounded-lg bg-black shadow-2xl"
				transition:scale={{ duration: 200, start: 0.95 }}
			>
				<button onclick={onClose} class="absolute -top-10 right-0 text-white/50 hover:text-white">
					CLOSE
				</button>
				<iframe
					src="https://www.youtube.com/embed/{youtubeId}?autoplay=1&rel=0&showinfo=0"
					title="YouTube video player"
					class="h-full w-full"
					frameborder="0"
					allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
					allowfullscreen
				></iframe>
			</div>
		{/if}
	</div>
{/if}
