<script lang="ts">
	import { fade, scale } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';
	import { X, Play, Users, HardDrive, Check } from 'lucide-svelte';

	let { isOpen, streams, selectedUrl, onClose, onSelect } = $props();

	let activeTab = $state('1080p');

	// Ensure we have tabs for available qualities
	let tabs = $derived(
		streams?.streams
			? Object.keys(streams.streams).sort((a, b) => {
					// Priority order
					const order = ['4k', '1080p', '720p', 'other'];
					return order.indexOf(a) - order.indexOf(b);
				})
			: []
	);

	// Set initial active tab
	$effect(() => {
		if (isOpen && streams?.streams) {
			// 1. Try to find tab for selectedUrl
			if (selectedUrl) {
				for (const [quality, list] of Object.entries(streams.streams)) {
					if ((list as any[]).some((s) => s.url === selectedUrl)) {
						activeTab = quality;
						return;
					}
				}
			}

			// 2. Fallback to priority defaults
			if (streams.streams['1080p']?.length) activeTab = '1080p';
			else if (streams.streams['4k']?.length) activeTab = '4k';
			else if (streams.streams['720p']?.length) activeTab = '720p';
			else if (tabs.length) activeTab = tabs[0];
		}
	});

	// Lock body scroll when modal is open
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

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') onClose();
	}

	function scrollToSelected(node: HTMLElement, isSelected: boolean) {
		if (isSelected) {
			node.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
		}
		return {
			update(isSelected: boolean) {
				if (isSelected) {
					node.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
				}
			}
		};
	}

	// Helper to extract metadata from title using the emojis as delimiters
	function getStreamMeta(title: string) {
		let cleanTitle = title;
		let size = '';
		let seeders = '';

		if (title.includes('💾')) {
			const parts = title.split('💾');
			cleanTitle = parts[0];
			const afterSize = parts[1];
			if (afterSize.includes('⚙️')) {
				size = afterSize.split('⚙️')[0].trim();
			} else if (afterSize.includes('👤')) {
				size = afterSize.split('👤')[0].trim();
			} else {
				size = afterSize.trim();
			}
		}

		if (title.includes('👤')) {
			const parts = title.split('👤');
			// If we haven't set cleanTitle yet (no floppy disk), do it now ?
			// Usually floppy comes first.
			// Let's rely on standard format: Title ... 💾 Size ... 👤 Seeders ...
			seeders = parts[1].split('💾')[0].trim(); // Handle if order is swapped or other emojis
		}

		return { cleanTitle, size, seeders };
	}
</script>

<svelte:window onkeydown={handleKeydown} />

{#if isOpen}
	<div
		class="fixed inset-0 z-[100] flex items-center justify-center p-4 backdrop-blur-md"
		transition:fade={{ duration: 200 }}
	>
		<!-- Backdrop -->
		<div
			class="absolute inset-0 bg-black/80"
			onclick={onClose}
			role="button"
			tabindex="0"
			onkeydown={(e) => e.key === 'Enter' && onClose()}
		></div>

		<!-- Modal Container -->
		<div
			class="relative flex h-[80vh] w-full max-w-3xl flex-col overflow-hidden rounded-lg border border-white/10 bg-[#09090b] shadow-2xl"
			transition:scale={{ duration: 300, start: 0.95, easing: cubicOut }}
		>
			<!-- Header -->
			<div
				class="flex flex-shrink-0 items-center justify-between border-b border-white/10 bg-[#09090b] p-6"
			>
				<div>
					<h2 class="font-mono text-xl font-bold tracking-widest text-white uppercase">
						Select Source
					</h2>
					<p class="mt-1 font-mono text-[10px] font-medium tracking-widest text-white/40 uppercase">
						{tabs.length > 0 ? 'High Speed Streams Available' : 'Scanning repository...'}
					</p>
				</div>
				<button
					onclick={onClose}
					class="rounded-md p-2 text-white/50 transition-colors hover:bg-white/10 hover:text-white"
				>
					<X class="h-5 w-5" />
				</button>
			</div>

			<!-- Tabs -->
			{#if tabs.length > 0}
				<div
					class="scrollbar-hide flex flex-shrink-0 gap-3 overflow-x-auto border-b border-white/10 bg-[#09090b]/50 px-6 py-4"
				>
					{#each tabs as tab}
						<button
							onclick={() => (activeTab = tab)}
							class="flex items-center gap-2 rounded px-4 py-2 font-mono text-xs font-bold tracking-widest uppercase transition-all
							{activeTab === tab
								? 'border border-white/20 bg-white/10 text-white'
								: 'border border-transparent bg-transparent text-white/40 hover:bg-white/5 hover:text-white'}"
						>
							{tab}
							{#if streams?.streams?.[tab]}
								<span class="opacity-50">({streams.streams[tab].length})</span>
							{/if}
						</button>
					{/each}
				</div>

				<!-- Stream List -->
				<div class="flex-1 overflow-y-auto bg-black/20 p-4 md:p-6">
					{#if streams?.streams && streams.streams[activeTab]?.length > 0}
						<div class="flex flex-col gap-2">
							{#each streams.streams[activeTab] as stream}
								{@const { cleanTitle, size, seeders } = getStreamMeta(stream.title)}
								{@const isActive = selectedUrl === stream.url}

								<button
									onclick={() => {
										onSelect({ ...stream, quality: activeTab });
										onClose();
									}}
									class="group relative flex w-full items-center gap-4 rounded border p-4 text-left transition-all
									{isActive
										? 'border-primary/50 bg-primary/5'
										: 'border-white/5 bg-white/5 hover:border-white/10 hover:bg-white/10'}"
									use:scrollToSelected={isActive}
								>
									<!-- Play Icon Box -->
									<div
										class="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-black/40 text-white/50 group-hover:text-white"
									>
										<Play class="h-4 w-4 fill-current" />
									</div>

									<div class="min-w-0 flex-1">
										<!-- Title -->
										<div class="mb-2 line-clamp-1 font-mono text-xs font-medium text-white/90">
											{stream.title.split('\n')[0].replace(/💾.*|👤.*/g, '')}
										</div>

										<!-- Badges -->
										<div class="flex flex-wrap items-center gap-3">
											{#if size}
												<span
													class="flex items-center gap-1.5 font-mono text-[10px] font-bold text-emerald-500"
												>
													<div class="h-1.5 w-1.5 rounded-full bg-emerald-500"></div>
													{size}
												</span>
											{/if}
											{#if seeders}
												<span
													class="flex items-center gap-1.5 font-mono text-[10px] font-bold text-blue-500"
												>
													<Users class="h-3 w-3" />
													{seeders}
												</span>
											{/if}
											<span
												class="flex items-center gap-1.5 font-mono text-[10px] font-bold text-white/40"
											>
												{activeTab.toUpperCase()}
											</span>
										</div>
									</div>

									<!-- Active Indicator -->
									{#if isActive}
										<div
											class="bg-primary/10 text-primary flex shrink-0 items-center gap-2 rounded px-2 py-1 font-mono text-[9px] font-bold"
										>
											ACTIVE
										</div>
									{/if}
								</button>
							{/each}
						</div>
					{:else}
						<div class="flex h-full flex-col items-center justify-center text-white/30">
							<p class="font-mono text-sm tracking-widest uppercase">No streams found</p>
						</div>
					{/if}
				</div>
			{:else}
				<div class="flex flex-1 items-center justify-center text-white/50">
					<div class="flex flex-col items-center gap-4">
						<div
							class="h-6 w-6 animate-spin rounded-full border-2 border-white/20 border-t-white"
						></div>
						<p class="font-mono text-xs font-bold tracking-widest uppercase">
							Resolving Sources...
						</p>
					</div>
				</div>
			{/if}
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
