<script lang="ts">
	import { fade, scale } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';

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
</script>

<svelte:window onkeydown={handleKeydown} />

{#if isOpen}
	<div
		class="fixed inset-0 z-[100] flex items-center justify-center p-4 backdrop-blur-md"
		transition:fade={{ duration: 200 }}
	>
		<!-- Backdrop -->
		<div
			class="absolute inset-0 bg-black/60"
			onclick={onClose}
			role="button"
			tabindex="0"
			onkeydown={(e) => e.key === 'Enter' && onClose()}
		></div>

		<!-- Modal -->
		<div
			class="relative flex w-full max-w-2xl flex-col overflow-hidden rounded-sm border border-white/10 bg-black/80 shadow-2xl backdrop-blur-xl"
			transition:scale={{ duration: 300, start: 0.95, easing: cubicOut }}
		>
			<!-- Header -->
			<div class="flex items-center justify-between border-b border-white/5 p-6">
				<div>
					<h2 class="font-retro text-xl tracking-wide text-white uppercase">Select Source</h2>
					<p class="text-xs font-medium tracking-widest text-white/40 uppercase">
						{tabs.length > 0 ? 'High Speed Streams Available' : 'Scanning repository...'}
					</p>
				</div>
				<button
					onclick={onClose}
					aria-label="Close"
					class="rounded-sm bg-white/5 p-2 text-white/50 transition-colors hover:bg-white/10 hover:text-white"
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						fill="none"
						viewBox="0 0 24 24"
						stroke-width="2"
						stroke="currentColor"
						class="h-5 w-5"
					>
						<path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
					</svg>
				</button>
			</div>

			<!-- Quality Tabs -->
			{#if tabs.length > 0}
				<div class="scrollbar-hide flex gap-2 overflow-x-auto border-b border-white/5 px-6 py-4">
					{#each tabs as tab}
						<button
							onclick={() => (activeTab = tab)}
							class="rounded-sm px-5 py-2 text-xs font-bold tracking-widest uppercase transition-all
                            {activeTab === tab
								? 'bg-dash-amber text-black shadow-[0_0_15px_rgba(220,165,76,0.3)]'
								: 'bg-white/5 text-white/50 hover:bg-white/10 hover:text-white'}"
						>
							{tab}
							{#if streams?.streams?.[tab]}
								<span class="ml-1 opacity-60">({streams.streams[tab].length})</span>
							{/if}
						</button>
					{/each}
				</div>

				<!-- Stream List -->
				<div class="max-h-[50vh] overflow-y-auto p-4 md:p-6">
					{#if streams?.streams && streams.streams[activeTab]?.length > 0}
						<div class="flex flex-col gap-3">
							{#each streams.streams[activeTab] as stream}
								<button
									onclick={() => {
										onSelect({ ...stream, quality: activeTab });
										onClose();
									}}
									class="group relative flex w-full flex-col gap-3 rounded-sm border p-4 text-left transition-all active:scale-[0.99]
                                    {selectedUrl === stream.url
										? 'border-dash-amber bg-dash-amber/10 shadow-[0_0_15px_rgba(220,165,76,0.1)]'
										: 'border-white/5 bg-white/5 hover:border-white/20 hover:bg-white/10'}"
									use:scrollToSelected={selectedUrl === stream.url}
								>
									<!-- Content -->
									<div class="flex w-full items-start gap-4">
										<!-- Icon -->
										<div
											class="flex h-10 w-10 shrink-0 items-center justify-center rounded-sm bg-black/40
                                            {selectedUrl === stream.url
												? 'text-dash-amber'
												: 'group-hover:text-dash-amber text-white/50'}"
										>
											<svg
												xmlns="http://www.w3.org/2000/svg"
												viewBox="0 0 24 24"
												fill="currentColor"
												class="h-5 w-5"
											>
												<path
													fill-rule="evenodd"
													d="M4.5 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.348c1.295.712 1.295 2.573 0 3.285L7.28 19.991c-1.25.687-2.779-.217-2.779-1.643V5.653z"
													clip-rule="evenodd"
												/>
											</svg>
										</div>

										<div class="min-w-0 flex-1">
											<!-- Title -->
											<div class="mb-1 line-clamp-2 text-sm font-medium text-white/90">
												{stream.title.split('\n')[0]}
											</div>

											<!-- Meta Badges -->
											<div class="flex flex-wrap items-center gap-2">
												{#if stream.title.includes('💾')}
													<span
														class="flex items-center gap-1.5 rounded bg-white/5 px-2 py-1 text-[10px] font-bold tracking-wider text-emerald-400 uppercase"
													>
														<span class="block h-1.5 w-1.5 rounded-full bg-emerald-400"></span>
														{stream.title.split('💾')[1].split('⚙️')[0].trim()}
													</span>
												{/if}
												{#if stream.title.includes('👤')}
													<span
														class="flex items-center gap-1.5 rounded bg-white/5 px-2 py-1 text-[10px] font-bold tracking-wider text-blue-400 uppercase"
													>
														<svg
															xmlns="http://www.w3.org/2000/svg"
															viewBox="0 0 20 20"
															fill="currentColor"
															class="h-3 w-3"
														>
															<path
																d="M7 8a3 3 0 100-6 3 3 0 000 6zM14.5 9a2.5 2.5 0 100-5 2.5 2.5 0 000 5zM1.615 16.428a1.224 1.224 0 01-.569-1.175 6.002 6.002 0 0111.908 0c.058.467-.172.92-.57 1.174A9.953 9.953 0 017 18a9.953 9.953 0 01-5.385-1.572zM14.5 16h-.106c.07-.297.088-.611.048-.933a7.47 7.47 0 00-1.588-3.755 4.502 4.502 0 015.874 2.636.818.818 0 01-.36.98A7.465 7.465 0 0114.5 16z"
															/>
														</svg>
														{stream.title.split('👤')[1].split('💾')[0].trim()}
													</span>
												{/if}
											</div>
										</div>

										<!-- Selection Indicator -->
										{#if selectedUrl === stream.url}
											<div
												class="text-dash-amber flex items-center gap-2 text-[10px] font-bold tracking-widest uppercase"
											>
												<span class="relative flex h-2 w-2">
													<span
														class="bg-dash-amber absolute inline-flex h-full w-full animate-ping rounded-full opacity-75"
													></span>
													<span class="bg-dash-amber relative inline-flex h-2 w-2 rounded-full"
													></span>
												</span>
												Active
											</div>
										{/if}
									</div>
								</button>
							{/each}
						</div>
					{:else}
						<div class="flex flex-col items-center justify-center py-12 text-white/30">
							<svg
								xmlns="http://www.w3.org/2000/svg"
								fill="none"
								viewBox="0 0 24 24"
								stroke-width="1.5"
								stroke="currentColor"
								class="mb-4 h-12 w-12 opacity-50"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
								/>
							</svg>
							<p class="font-mono text-sm tracking-widest uppercase">
								No streams found for {activeTab}
							</p>
						</div>
					{/if}
				</div>
			{:else}
				<div class="p-12 text-center text-white/50">
					<div
						class="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-white"
					></div>
					<p class="text-xs font-bold tracking-widest uppercase">Resolving Sources...</p>
				</div>
			{/if}
		</div>
	</div>
{/if}
