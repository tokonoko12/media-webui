<script lang="ts">
	import { onMount, onDestroy, untrack } from 'svelte';
	import { fade, scale } from 'svelte/transition';
	import Hls from 'hls.js';

	let {
		isOpen,
		youtubeId,
		streamUrl = undefined,
		audios = undefined,
		downloader = undefined,
		onClose
	} = $props();

	let videoElement = $state<HTMLVideoElement | undefined>(undefined);
	let hls = $state<Hls | null>(null);
	let dashed = $state<any>(null); // Dash player instance

	let containerElement: HTMLDivElement | undefined = undefined;

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

	// Special DB (RealDebrid) MPD State
	let mpdOffset = $state(0);
	let initialDuration = $state(0);

	// Set initial selected audio (default to streamUrl or first track)
	$effect(() => {
		if (isOpen && streamUrl && !selectedAudioUrl) {
			selectedAudioUrl = streamUrl;
		}
	});

	// Reset state when opening/closing
	$effect(() => {
		if (!isOpen) {
			untrack(() => {
				if (hls) {
					hls.destroy();
					hls = null;
				}
				if (dashed) {
					dashed.destroy();
					dashed = null;
				}
			});
			isPlaying = false;
			isBuffering = false;
			showControls = true;
			currentTime = 0;
			duration = 0;
			selectedAudioUrl = undefined;
			mpdOffset = 0;
			initialDuration = 0;
		}
	});

	// Manage Body Scroll
	$effect(() => {
		if (isOpen) {
			document.body.style.overflow = 'hidden';
		} else {
			document.body.style.overflow = '';
		}
		return () => {
			document.body.style.overflow = '';
		};
	});

	// Initialize Player (HLS or DASH)
	$effect(() => {
		if (isOpen && streamUrl && videoElement) {
			// Check if we already have a player for this URL to prevent re-init
			// Note: simple check, if streamUrl changes we re-init

			// Reset previous players
			untrack(() => {
				if (hls) {
					hls.destroy();
					hls = null;
				}
				if (dashed) {
					dashed.destroy();
					dashed = null;
				}
			});

			const isDash = streamUrl.includes('.mpd');
			const isHls =
				streamUrl.includes('.m3u8') || (Hls.isSupported() && streamUrl.includes('.m3u8')); // Simple check

			console.log(`[VideoPlayer] Init. URL: ${streamUrl}`);

			// Check for DASH (MPD)
			if (isDash) {
				console.log('[VideoPlayer] Initializing DASH');
				import('dashjs').then((dashjs) => {
					if (!videoElement || !streamUrl.includes('.mpd')) return;

					// Basic init without seek logic first
					let playUrl = streamUrl;

					// Allow RD params if needed for initial load, but handling seeking separately is safer.
					// For initial load, we might want to start at 0 if it's a fresh RD link?
					// Actually, let's keep it simple: Just init.

					dashed = dashjs.MediaPlayer().create();
					dashed.updateSettings({
						streaming: {
							retryIntervals: {
								MPD: 5000,
								MediaSegment: 5000,
								InitializationSegment: 5000,
								IndexSegment: 5000,
								other: 5000
							},
							retryAttempts: {
								MPD: 3,
								MediaSegment: 3,
								InitializationSegment: 3,
								IndexSegment: 3,
								other: 3
							}
						}
					});

					dashed.initialize(videoElement, playUrl, true); // Auto-play true
					dashed.on(dashjs.MediaPlayer.events.STREAM_INITIALIZED, () => {
						isBuffering = false;
						isPlaying = true;
					});
					dashed.on(dashjs.MediaPlayer.events.PLAYBACK_METADATA_LOADED, () => {
						const d = videoElement?.duration || 0;
						// Initial duration setting
						if (downloader === 'realdebrid') {
							if (initialDuration === 0 && d > 0) {
								initialDuration = d;
							}
							duration = initialDuration > 0 ? initialDuration : d;
						} else {
							duration = d;
						}
					});
				});
			}
			// Check for HLS (M3U8)
			else if (
				Hls.isSupported() &&
				(streamUrl.includes('.m3u8') || !videoElement.canPlayType('application/vnd.apple.mpegurl'))
			) {
				console.log('[VideoPlayer] Initializing HLS');
				hls = new Hls({
					enableWorker: true,
					lowLatencyMode: true
				});
				hls.loadSource(streamUrl);
				hls.attachMedia(videoElement);
				hls.on(Hls.Events.MANIFEST_PARSED, () => {
					videoElement?.play().catch(() => console.log('Autoplay blocked'));
					isPlaying = true;
				});
				hls.on(Hls.Events.ERROR, (event, data) => {
					if (data.fatal) {
						switch (data.type) {
							case Hls.ErrorTypes.NETWORK_ERROR:
								hls?.startLoad();
								break;
							case Hls.ErrorTypes.MEDIA_ERROR:
								hls?.recoverMediaError();
								break;
							default:
								hls?.destroy();
								break;
						}
					}
				});
			} else if (videoElement.canPlayType('application/vnd.apple.mpegurl')) {
				console.log('[VideoPlayer] Initializing Native HLS');
				videoElement.src = streamUrl;
				videoElement.addEventListener('loadedmetadata', () => {
					videoElement?.play();
					isPlaying = true;
				});
			} else {
				console.log('[VideoPlayer] Initializing Direct Play');
				videoElement.src = streamUrl;
				videoElement.play();
				isPlaying = true;
			}
		}
	});

	// SEPARATE Effect for MPD Seeking (RD support)
	$effect(() => {
		// This depends on mpdOffset.
		// We only want to act if we have a dash player and it's RD.
		if (mpdOffset > 0 && dashed && downloader === 'realdebrid' && streamUrl?.includes('.mpd')) {
			console.log('[VideoPlayer] Handling MPD Seek to', mpdOffset);
			// Re-load logic for RD MPD seeking
			const separator = streamUrl.includes('?') ? '&' : '?';
			const playUrl = `${streamUrl}${separator}t=${Math.floor(mpdOffset)}&_=${Date.now()}`;

			// We need to attach this new URL to the existing player or re-init?
			// Usually forcing attachSource is enough if player exists.
			dashed.attachSource(playUrl);

			if (videoElement) videoElement.currentTime = 0; // Reset native time for the new segment
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
		if (downloader === 'realdebrid' && streamUrl && streamUrl.includes('.mpd')) {
			const target = Math.max(0, (currentTime || 0) + seconds);
			handleMpdSeek(target);
		} else if (videoElement) {
			videoElement.currentTime += seconds;
			resetControlsTimer();
		}
	}

	function handleTimelineChange(e: Event) {
		const target = e.target as HTMLInputElement;
		const time = parseFloat(target.value);

		if (downloader === 'realdebrid' && streamUrl && streamUrl.includes('.mpd')) {
			handleMpdSeek(time);
		} else if (videoElement) {
			videoElement.currentTime = time;
			currentTime = time;
		}
		resetControlsTimer();
	}

	function handleMpdSeek(time: number) {
		mpdOffset = time;
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
		if (hls && videoElement) {
			const currentTimeSaver = videoElement.currentTime;
			const wasPlaying = !videoElement.paused;

			hls.loadSource(url);

			// Try to restore position and play state after clear
			hls.once(Hls.Events.MANIFEST_PARSED, () => {
				untrack(() => {
					if (videoElement) {
						videoElement.currentTime = currentTimeSaver;
						if (wasPlaying) videoElement.play();
					}
				});
			});

			showAudioMenu = false;
		} else if (videoElement) {
			const v = videoElement;
			const currentTimeSaver = v.currentTime;
			v.src = url;
			v.currentTime = currentTimeSaver;
			v.play();
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
					ontimeupdate={() => {
						const vTime = videoElement?.currentTime || 0;
						const isRD =
							downloader === 'realdebrid' ||
							streamUrl?.toLowerCase().includes('real-debrid') ||
							streamUrl?.toLowerCase().includes('realdebrid');
						if (isRD) {
							currentTime = vTime + mpdOffset;
						} else {
							currentTime = vTime;
						}
					}}
					ondurationchange={() => {
						const d = videoElement?.duration || 0;
						const isRD =
							downloader === 'realdebrid' ||
							streamUrl?.toLowerCase().includes('real-debrid') ||
							streamUrl?.toLowerCase().includes('realdebrid');
						if (isRD && initialDuration > 0) {
							// Keep initial duration if set
							duration = initialDuration;
						} else {
							duration = d;
						}
					}}
				></video>

				<!-- Controls Overlay -->
				{#if showControls || !isPlaying || isBuffering}
					<div
						transition:fade={{ duration: 200 }}
						class="absolute inset-0 z-20 flex flex-col justify-between bg-black/10"
					>
						<!-- Top Bar -->
						<div class="z-30 flex items-start justify-between p-6">
							<!-- Left: Exit -->
							<button
								onclick={onClose}
								class="hover:text-dash-amber flex items-center gap-2 bg-black/50 px-4 py-2 text-white/80 backdrop-blur-md transition-all hover:bg-black/80"
							>
								<svg
									xmlns="http://www.w3.org/2000/svg"
									fill="none"
									viewBox="0 0 24 24"
									stroke-width="2"
									stroke="currentColor"
									class="h-5 w-5"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18"
									/>
								</svg>
								<span class="font-mono text-xs font-bold tracking-wider uppercase">EXIT</span>
							</button>

							<!-- Right: Audio & Fullscreen -->
							<div class="flex items-center gap-4">
								<!-- Audio Selector -->
								{#if audioTracks.length > 0}
									<div class="relative">
										<button
											onclick={(e) => {
												e.stopPropagation();
												showAudioMenu = !showAudioMenu;
											}}
											class="hover:text-dash-amber flex items-center gap-2 bg-black/50 px-4 py-2 text-white/80 backdrop-blur-md transition-all hover:bg-black/80"
											aria-label="Audio Settings"
										>
											<svg
												xmlns="http://www.w3.org/2000/svg"
												fill="none"
												viewBox="0 0 24 24"
												stroke-width="2"
												stroke="currentColor"
												class="h-5 w-5"
											>
												<path
													stroke-linecap="round"
													stroke-linejoin="round"
													d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z"
												/>
											</svg>
											<span
												class="hidden font-mono text-xs font-bold tracking-wider uppercase sm:block"
												>AUDIO</span
											>
										</button>
										{#if showAudioMenu}
											<div
												class="border-dash-border/50 absolute top-full right-0 mt-2 w-56 overflow-hidden border bg-black/95 p-1 text-sm text-white shadow-xl backdrop-blur-md"
											>
												{#each audioTracks as [key, track]}
													<button
														onclick={(e) => {
															e.stopPropagation();
															changeAudio((track as any)['url']);
														}}
														class="block w-full px-4 py-2 text-left transition-colors {selectedAudioUrl ===
														(track as any)['url']
															? 'bg-dash-amber font-bold text-black'
															: 'text-white hover:bg-white/10'}"
													>
														<div class="flex items-center justify-between">
															<span>{(track as any).language || key}</span>
															{#if selectedAudioUrl === (track as any)['url']}
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

								<!-- Fullscreen -->
								<button
									onclick={toggleFullscreen}
									class="hover:text-dash-amber flex items-center gap-2 bg-black/50 px-4 py-2 text-white/80 backdrop-blur-md transition-all hover:bg-black/80"
									aria-label="Fullscreen"
								>
									<svg
										xmlns="http://www.w3.org/2000/svg"
										fill="none"
										viewBox="0 0 24 24"
										stroke-width="2"
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

						<!-- CENTER CONTROLS -->
						<div
							class="pointer-events-none absolute inset-0 z-20 flex flex-col items-center justify-center"
						>
							<!-- Controls Row -->
							<div class="pointer-events-auto flex items-center justify-center gap-12">
								<!-- Rewind -->
								<button
									onclick={() => seekRelative(-15)}
									class="hover:text-dash-amber group flex transform flex-col items-center gap-2 text-white/70 transition-colors duration-200 hover:scale-110"
								>
									<svg
										xmlns="http://www.w3.org/2000/svg"
										fill="none"
										viewBox="0 0 24 24"
										stroke-width="1"
										stroke="currentColor"
										class="h-12 w-12 transition-transform group-active:-translate-x-1"
									>
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											d="M15.75 19.5L8.25 12l7.5-7.5"
										/>
									</svg>
									<span class="font-mono text-[10px] font-bold tracking-widest uppercase">-15s</span
									>
								</button>

								<!-- Play/Pause & Buffering -->
								<div class="relative flex items-center justify-center">
									{#if isBuffering}
										<div class="absolute inset-0 -m-4">
											<svg
												class="text-dash-amber h-full w-full animate-spin opacity-50"
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
													stroke-width="3"
												></circle>
												<path
													class="opacity-75"
													fill="currentColor"
													d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
												></path>
											</svg>
										</div>
									{/if}
									<button
										onclick={togglePlay}
										class="hover:text-dash-amber scale-100 text-white drop-shadow-2xl transition-colors duration-200 hover:scale-110 active:scale-95"
										aria-label={isPlaying ? 'Pause' : 'Play'}
									>
										{#if isPlaying}
											<svg
												xmlns="http://www.w3.org/2000/svg"
												fill="currentColor"
												viewBox="0 0 24 24"
												class="h-24 w-24"
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
												class="h-24 w-24"
											>
												<path
													fill-rule="evenodd"
													d="M4.5 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.348c1.295.712 1.295 2.573 0 3.285L7.28 19.991c-1.25.687-2.779-.217-2.779-1.643V5.653z"
													clip-rule="evenodd"
												/>
											</svg>
										{/if}
									</button>
								</div>

								<!-- Forward -->
								<button
									onclick={() => seekRelative(15)}
									class="hover:text-dash-amber group flex transform flex-col items-center gap-2 text-white/70 transition-colors duration-200 hover:scale-110"
								>
									<svg
										xmlns="http://www.w3.org/2000/svg"
										fill="none"
										viewBox="0 0 24 24"
										stroke-width="1"
										stroke="currentColor"
										class="h-12 w-12 transition-transform group-active:translate-x-1"
									>
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											d="M8.25 4.5l7.5 7.5-7.5 7.5"
										/>
									</svg>
									<span class="font-mono text-[10px] font-bold tracking-widest uppercase">+15s</span
									>
								</button>
							</div>
						</div>

						<!-- Bottom Timeline -->
						<div class="z-30 w-full bg-gradient-to-t from-black via-black/80 to-transparent pt-12">
							<!-- Time Labels -->
							<div class="pointer-events-none flex justify-between px-10 pb-4">
								<span
									class="font-mono text-xl font-bold tracking-widest text-white/90 drop-shadow-lg"
									>{formatTime(currentTime)}</span
								>
								<span
									class="font-mono text-xl font-bold tracking-widest text-white/90 drop-shadow-lg"
									>{formatTime(duration)}</span
								>
							</div>

							<!-- Big Flat Timeline -->
							<div class="relative h-6 w-full bg-gray-800/50 transition-all duration-300 hover:h-8">
								<input
									type="range"
									min="0"
									max={duration || 100}
									value={currentTime}
									oninput={handleTimelineChange}
									style="background: linear-gradient(to right, #DCA54C {(currentTime /
										(duration || 1)) *
										100}%, transparent {(currentTime / (duration || 1)) * 100}%);"
									class="absolute inset-0 z-10 h-full w-full cursor-pointer appearance-none rounded-none bg-transparent
                                           [&::-moz-range-thumb]:h-full [&::-moz-range-thumb]:w-2 [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:rounded-none [&::-moz-range-thumb]:border-none [&::-moz-range-thumb]:bg-white
                                           [&::-webkit-slider-thumb]:h-full [&::-webkit-slider-thumb]:w-2 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-none [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-lg"
								/>
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
