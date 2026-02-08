<script lang="ts">
	import ExitIcon from '$lib/components/icons/player/ExitIcon.svelte';
	import AudioIcon from '$lib/components/icons/player/AudioIcon.svelte';
	import CheckIcon from '$lib/components/icons/player/CheckIcon.svelte';
	import FullscreenIcon from '$lib/components/icons/player/FullscreenIcon.svelte';
	import RewindIcon from '$lib/components/icons/player/RewindIcon.svelte';
	import ForwardIcon from '$lib/components/icons/player/ForwardIcon.svelte';
	import PlayIcon from '$lib/components/icons/player/PlayIcon.svelte';
	import PauseIcon from '$lib/components/icons/player/PauseIcon.svelte';

	const BUFFER_LENGTH_TO_PLAY = 40;
	const BUFFER_LEVEL_UPDATED = 'bufferLevelUpdated';
	const PLAYBACK_TIME_UPDATED = 'playbackTimeUpdated';

	interface Props {
		audios?: Record<string, { language: string; url: string }>;
		downloader: 'realdebrid' | 'torbox' | undefined;
		startTime?: number;
		streamduration?: number;
		closePlayer: () => void;
	}

	interface BufferLevel {
		audio: number;
		video: number;
	}

	let {
		audios = {},
		downloader = undefined,
		startTime = 0,
		streamduration = 0,
		closePlayer
	}: Props = $props();

	let isPlaying = $state(true);
	let initPlayer = $state(true);
	let isBuffering = $state(true);
	let showAudioMenu = $state(false);
	let showControls = $state(true);
	let isScrubbing = $state(false);

	let bufferLevel = $state<BufferLevel>({ audio: 0, video: 0 });
	let controlTimer: NodeJS.Timeout;

	let videoPlayerHtmlElement = $state<HTMLVideoElement | undefined>(undefined);
	let videoPlayer = $state<any>();

	let currentTime = $state(startTime);
	let duration = $derived(streamduration);
	let audioTracks = $derived(audios);
	let selectedAudio = $derived(Object.keys(audioTracks)[0]);
	let streamUrl = $derived(audioTracks[selectedAudio]?.url);
	let initialStartTime = $state(startTime);

	let timelineElement = $state<HTMLDivElement>();

	$effect(() => {
		let aborted = false;
		if (typeof window !== 'undefined') {
			(async () => {
				if (initPlayer && videoPlayerHtmlElement && streamUrl && downloader) {
					const player = await initVideoPlayer();
					if (aborted) {
						if (player) {
							player.reset();
							player.destroy();
						}
						return;
					}
					videoPlayer = player;
					addEventListeners();
					initPlayer = false;
				}
			})();
		}
		return () => {
			aborted = true;
			cleanUp();
		};
	});

	function addEventListeners() {
		if (!videoPlayer) return;
		videoPlayer.on(BUFFER_LEVEL_UPDATED, (e: any) => {
			bufferLevel[e.mediaType as keyof BufferLevel] = e.bufferLevel;
			if (
				bufferLevel.audio >= BUFFER_LENGTH_TO_PLAY &&
				bufferLevel.video >= BUFFER_LENGTH_TO_PLAY
			) {
				isBuffering = false;
				if (isPlaying) {
					videoPlayer.play();
				}
			}
		});
		videoPlayer.on(PLAYBACK_TIME_UPDATED, (e: any) => {
			if (!isScrubbing) {
				currentTime = initialStartTime + e.time;
			}
		});
	}

	function getStreamUrl(downloader: string, url: string, currentTime = 0): string {
		if (downloader === 'realdebrid') {
			return `${url}&t=${currentTime}`;
		}
		return url;
	}

	async function initVideoPlayer(autoPlay = false) {
		if (!downloader || !streamUrl || !videoPlayerHtmlElement) return;
		const playableUrl = getStreamUrl(downloader, streamUrl, currentTime);
		if (downloader === 'realdebrid') {
			const dashjs = await import('dashjs');
			const player = dashjs.MediaPlayer().create();
			player.initialize(videoPlayerHtmlElement, playableUrl, autoPlay);
			player.updateSettings({
				streaming: {
					buffer: {
						bufferTimeAtTopQuality: 50,
						bufferTimeAtTopQualityLongForm: 60,
						bufferTimeDefault: 50,
						bufferPruningInterval: 50
					}
				}
			});
			return player;
		}
		return undefined;
	}

	function formatTime(seconds: number) {
		const h = Math.floor(seconds / 3600);
		const m = Math.floor((seconds % 3600) / 60);
		const s = Math.floor(seconds % 60);
		if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
		return `${m}:${s.toString().padStart(2, '0')}`;
	}

	function cleanUp() {
		if (videoPlayer) {
			videoPlayer.pause();
			videoPlayer.reset();
			videoPlayer.destroy();
			videoPlayer = undefined;
		}
	}

	function seekTo(downloader: string, url: string, player: any, time: number) {
		if (downloader == 'realdebrid') {
			const bufferlength = Math.min(...Object.values(bufferLevel));
			if (Math.abs(time - initialStartTime) > bufferlength) {
				isBuffering = true;
				const newMpdUrl = getStreamUrl(downloader, url, time);
				player.attachSource(newMpdUrl);
				initialStartTime = time;
			} else {
				player.seek(time - initialStartTime);
			}
		}
	}

	function handleMouseMove() {
		showControls = true;
		clearTimeout(controlTimer);
		controlTimer = setTimeout(() => {
			if (isPlaying) showControls = false;
		}, 2500);
	}

	function handleTimelineInteraction(event: MouseEvent) {
		if (!timelineElement) return;
		const rect = timelineElement.getBoundingClientRect();
		const x = Math.max(0, Math.min(event.clientX - rect.left, rect.width));
		const percentage = x / rect.width;
		currentTime = percentage * duration;
	}

	function onTimelineMouseDown(e: MouseEvent) {
		isScrubbing = true;
		handleTimelineInteraction(e);
	}

	function onWindowMouseMove(e: MouseEvent) {
		if (isScrubbing) {
			handleTimelineInteraction(e);
		}
		// Also handle show controls
		handleMouseMove();
	}

	function updateVideoPlayer() {
		if (downloader == 'realdebrid') {
			const newMpdUrl = getStreamUrl(downloader, streamUrl, currentTime);
			isBuffering = true;
			videoPlayer.attachSource(newMpdUrl);
			initialStartTime = currentTime;
		}
	}

	function onWindowMouseUp(e: MouseEvent) {
		if (isScrubbing) {
			isScrubbing = false;
			seekTo(downloader as string, streamUrl as string, videoPlayer, currentTime);
			initialStartTime = currentTime;
		}
	}
</script>

<svelte:window
	onmousemove={onWindowMouseMove}
	onmouseup={onWindowMouseUp}
	onclick={handleMouseMove}
	onkeydown={handleMouseMove}
	ontouchstart={handleMouseMove}
/>

<div
	class="fixed inset-0 z-50 flex items-center justify-center bg-black"
	role="application"
	tabindex="-1"
>
	<div
		class="group relative h-full w-full overflow-hidden bg-black {showControls
			? 'cursor-auto'
			: 'cursor-none'}"
	>
		<!-- VIDEO -->
		<div class="absolute inset-0 flex items-center justify-center font-mono text-white/20">
			<video class="h-full w-full" bind:this={videoPlayerHtmlElement} id="videoPlayer"> </video>
		</div>

		<!-- BUFFERING SPINNER (Always visible) -->
		{#if isBuffering}
			<div class="pointer-events-none absolute inset-0 z-50 flex items-center justify-center">
				<div
					class="h-[4.5rem] w-[4.5rem] animate-spin rounded-full border-4 border-white/10 border-t-white/80 md:h-[7rem] md:w-[7rem]"
				></div>
			</div>
		{/if}

		<!-- CENTER CONTROLS (Floating) -->
		<div
			class="pointer-events-none absolute inset-0 z-30 flex items-center justify-center transition-opacity duration-300 {showControls
				? 'opacity-100'
				: 'opacity-0'}"
		>
			<div class="pointer-events-auto flex items-center justify-center gap-8 md:gap-16">
				<button
					class="group flex flex-col items-center gap-2 text-white/80 transition-all hover:scale-110 hover:text-white active:scale-95 {showControls
						? 'opacity-100'
						: 'opacity-0'} transition-opacity duration-300"
					aria-label="Rewind 15s"
					onclick={() => {
						currentTime = currentTime - 15;
						seekTo(downloader as string, streamUrl as string, videoPlayer, currentTime);
					}}
				>
					<RewindIcon class="h-8 w-8 drop-shadow-lg md:h-12 md:w-12" />
					<span
						class="-translate-y-2 text-[8px] font-bold tracking-widest uppercase opacity-0 transition-all group-hover:translate-y-0 group-hover:opacity-100 md:text-[10px]"
					>
						-15s
					</span>
				</button>

				<div class="relative flex items-center justify-center">
					<button
						onclick={() => {
							if (isPlaying) {
								videoPlayer?.pause();
							} else {
								videoPlayer?.play();
							}
							isPlaying = !isPlaying;
						}}
						class="group relative rounded-full border border-white/20 bg-white/10 p-4 shadow-2xl transition-all hover:scale-105 hover:bg-white/20 active:scale-95 md:p-6"
						aria-label={isPlaying ? 'Pause' : 'Play'}
					>
						{#if isPlaying}
							<PauseIcon class="h-10 w-10 fill-current text-white drop-shadow-xl md:h-16 md:w-16" />
						{:else}
							<PlayIcon
								class="ml-1 h-10 w-10 fill-current text-white drop-shadow-xl md:h-16 md:w-16"
							/>
						{/if}
					</button>
				</div>

				<button
					class="group flex flex-col items-center gap-2 text-white/80 transition-all hover:scale-110 hover:text-white active:scale-95 {showControls
						? 'opacity-100'
						: 'opacity-0'} transition-opacity duration-300"
					aria-label="Forward 15s"
					onclick={() => {
						currentTime = currentTime + 15;
						seekTo(downloader as string, streamUrl as string, videoPlayer, currentTime);
					}}
				>
					<ForwardIcon class="h-8 w-8 drop-shadow-lg md:h-12 md:w-12" />
					<span
						class="-translate-y-2 text-[8px] font-bold tracking-widest uppercase opacity-0 transition-all group-hover:translate-y-0 group-hover:opacity-100 md:text-[10px]"
					>
						+15s
					</span>
				</button>
			</div>
		</div>

		<!-- MAIN CONTROLS (Top/Bottom) -->
		<div
			class="absolute inset-0 z-20 flex flex-col justify-between bg-black/20 transition-opacity duration-300 {showControls
				? 'opacity-100'
				: 'opacity-0'}"
		>
			<div class="z-30 flex items-center justify-between p-4 md:p-6">
				<button
					class="hover:text-primary transition-colors hover:scale-110 active:scale-95"
					aria-label="Exit"
					onclick={() => {
						closePlayer();
					}}
				>
					<ExitIcon class="h-6 w-6 text-white drop-shadow-md md:h-8 md:w-8" />
				</button>

				<div class="flex items-center gap-4 md:gap-6">
					<div class="relative">
						<button
							onclick={(e) => {
								e.stopPropagation();
								showAudioMenu = !showAudioMenu;
							}}
							class="hover:text-primary transition-colors hover:scale-110 active:scale-95"
							aria-label="Audio Settings"
						>
							<AudioIcon class="h-3 w-3 text-white drop-shadow-md md:h-5 md:w-5" />
						</button>
						{#if showAudioMenu}
							<div
								class="absolute top-full right-0 z-50 mt-4 w-48 overflow-hidden rounded-lg border border-white/10 bg-black/95 p-1 text-sm text-white shadow-2xl backdrop-blur-xl md:w-60"
							>
								<div
									class="mb-1 border-b border-white/10 px-3 py-2 text-[10px] font-bold tracking-widest text-white/50 uppercase md:text-xs"
								>
									Select Audio
								</div>
								{#each Object.entries(audioTracks) as [audio_lang_key, track]}
									<button
										onclick={(e) => {
											e.stopPropagation();
											streamUrl = track.url;
											selectedAudio = audio_lang_key;
											showAudioMenu = false;
											updateVideoPlayer();
										}}
										class="flex w-full items-center justify-between rounded-md px-3 py-2 text-left transition-all {audio_lang_key ===
										selectedAudio
											? 'bg-white/20 font-bold text-white'
											: 'text-white/70 hover:bg-white/10 hover:text-white'} md:py-3"
									>
										<span class="text-xs capitalize uppercase md:text-sm">{track.language}</span>
										{#if audio_lang_key === selectedAudio}
											<CheckIcon class="text-primary h-3 w-3 md:h-4 md:w-4" />
										{/if}
									</button>
								{/each}
							</div>
						{/if}
					</div>

					<button
						class="hover:text-primary transition-colors hover:scale-110 active:scale-95"
						aria-label="Fullscreen"
					>
						<FullscreenIcon class="h-3 w-3 text-white drop-shadow-md md:h-5 md:w-5" />
					</button>
				</div>
			</div>

			<div
				class="z-30 w-full bg-gradient-to-t from-black via-black/80 to-transparent px-6 pt-12 pb-4 md:px-12 md:pt-20 md:pb-8"
			>
				<div class="flex w-full flex-col gap-2">
					<div
						class="flex w-full items-center justify-between font-mono text-xs font-bold tracking-widest text-white/80 md:text-sm"
					>
						<span>{formatTime(currentTime)}</span>
						<span>{formatTime(duration)}</span>
					</div>

					<!-- svelte-ignore a11y_click_events_have_key_events -->
					<!-- svelte-ignore a11y_role_has_required_aria_props -->
					<div
						bind:this={timelineElement}
						onmousedown={onTimelineMouseDown}
						class="group relative h-3 w-full cursor-pointer bg-white/20 transition-all duration-200 hover:h-4 md:h-4"
						role="slider"
						tabindex="0"
					>
						<!-- BUFFER -->
						<div class="absolute inset-0 overflow-hidden">
							<div
								class="absolute h-full bg-white/30"
								style="left: {((initialStartTime + currentTime) / duration) *
									100}%; width: {duration == 0
									? 0
									: (Math.min(...Object.values(bufferLevel)) / duration) * 100}%"
							></div>
						</div>

						<!-- PROGRESS -->
						<div
							class="bg-primary absolute top-0 left-0 h-full"
							style="width: {(currentTime / (duration || 1)) * 100}%"
						>
							<!-- HANDLE -->
							<div
								class="absolute top-1/2 right-0 h-4 w-[2px] translate-x-1/2 -translate-y-1/2 scale-0 bg-white shadow-lg transition-transform group-hover:scale-100 md:h-5 md:w-[4px]"
							></div>
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>
</div>

<style>
</style>
