<script lang="ts">
	import { fade, scale } from 'svelte/transition';

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

	// Set initial active tab to highest priority available or 1080p
	$effect(() => {
		if (isOpen && streams?.streams) {
			if (streams.streams['1080p']?.length) activeTab = '1080p';
			else if (streams.streams['4k']?.length) activeTab = '4k';
			else if (streams.streams['720p']?.length) activeTab = '720p';
			else if (tabs.length) activeTab = tabs[0];
		}
	});

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') onClose();
	}

	function handleSelect(stream: any) {
		if (onSelect) {
			onSelect(stream);
			onClose();
		}
	}
</script>

<svelte:window onkeydown={handleKeydown} />

{#if isOpen}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
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

		<!-- Modal -->
		<div
			class="border-dash-border relative w-full max-w-4xl overflow-hidden rounded-lg border bg-black shadow-2xl transition-all sm:w-[95%]"
			transition:scale={{ duration: 200, start: 0.95 }}
		>
			<!-- Header -->
			<div
				class="border-dash-border/50 flex items-center justify-between border-b bg-stone-900/50 p-4"
			>
				<h2
					class="flex items-center gap-2 text-sm font-bold tracking-wider text-white uppercase sm:text-lg"
				>
					<span class="bg-dash-green block h-3 w-3 animate-pulse rounded-full"></span>
					<span class="hidden sm:inline">AVAILABLE_DATA_STREAMS</span>
					<span class="sm:hidden">DATA_STREAMS</span>
				</h2>
				<button onclick={onClose} class="text-dash-text transition-colors hover:text-white">
					<span class="sr-only">Close</span>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						fill="none"
						viewBox="0 0 24 24"
						stroke-width="1.5"
						stroke="currentColor"
						class="h-6 w-6"
					>
						<path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
					</svg>
				</button>
			</div>

			<!-- Tabs -->
			<div class="scrollbar-hide flex overflow-x-auto border-b border-stone-800 bg-stone-950/50">
				{#each tabs as tab}
					<button
						onclick={() => (activeTab = tab)}
						class="flex-shrink-0 px-6 py-3 text-sm font-bold tracking-widest uppercase transition-colors {activeTab ===
						tab
							? 'bg-dash-amber text-black'
							: 'text-stone-500 hover:bg-stone-900 hover:text-stone-300'}"
					>
						{#if streams?.streams?.[tab]}
							{tab} <span class="ml-1 text-[10px] opacity-60">({streams.streams[tab].length})</span>
						{:else}
							{tab}
						{/if}
					</button>
				{/each}
			</div>

			<!-- Content -->
			<div class="max-h-[60vh] overflow-y-auto bg-stone-950 p-4">
				{#if streams?.streams && streams.streams[activeTab]?.length > 0}
					<div class="flex flex-col gap-2">
						{#each streams.streams[activeTab] as stream}
							<button
								onclick={() => handleSelect({ ...stream, quality: activeTab })}
								class="group flex w-full flex-col gap-3 rounded-md border p-4 text-left transition-all sm:flex-row sm:items-center sm:gap-4
                                {selectedUrl === stream.url
									? 'border-dash-amber bg-dash-amber/10'
									: 'hover:border-dash-amber/50 border-stone-800 bg-stone-900/40 hover:bg-stone-900'}"
							>
								<!-- Top Row on Mobile: Icon + Content -->
								<div class="flex w-full items-start gap-4 sm:items-center">
									<div
										class="flex-shrink-0 rounded p-2 transition-colors
                                        {selectedUrl === stream.url
											? 'text-dash-amber bg-dash-amber/20'
											: 'group-hover:text-dash-amber bg-stone-800 text-stone-400'}"
									>
										<svg
											xmlns="http://www.w3.org/2000/svg"
											viewBox="0 0 24 24"
											fill="currentColor"
											class="h-6 w-6"
										>
											<path
												fill-rule="evenodd"
												d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm14.024-.983a1.125 1.125 0 010 1.966l-5.603 3.113A1.125 1.125 0 019 15.113V8.887c0-.857.921-1.4 1.671-.983l5.603 3.113z"
												clip-rule="evenodd"
											/>
										</svg>
									</div>
									<div class="min-w-0 flex-1">
										<div
											class="font-mono text-sm leading-snug font-bold transition-colors
                                            {selectedUrl === stream.url
												? 'text-dash-amber'
												: 'text-dash-text-light group-hover:text-white'}"
											style="word-break: break-word;"
										>
											{stream.title.split('\n')[0]}
										</div>
										<div
											class="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 font-mono text-xs text-stone-500"
										>
											{#if stream.title.includes('💾')}
												<span class="flex items-center gap-1 whitespace-nowrap">
													<span>SIZE:</span>
													<span class="text-emerald-500"
														>{stream.title.split('💾')[1].split('⚙️')[0].trim()}</span
													>
												</span>
											{/if}
											{#if stream.title.includes('👤')}
												<span class="flex items-center gap-1 whitespace-nowrap">
													<span>SEEDS:</span>
													<span class="text-amber-500"
														>{stream.title.split('👤')[1].split('💾')[0].trim()}</span
													>
												</span>
											{/if}
										</div>
									</div>
								</div>

								<!-- Button Row on Mobile -->
								<div class="sm:self-center">
									<span
										class="block w-full rounded px-4 py-2 text-center text-xs font-bold tracking-wider uppercase sm:w-auto sm:px-3 sm:py-1
                                        {selectedUrl === stream.url
											? 'bg-dash-amber text-black'
											: 'bg-dash-border text-dash-text'}"
									>
										{selectedUrl === stream.url ? 'SELECTED' : 'SELECT'}
									</span>
								</div>
							</button>
						{/each}
					</div>
				{:else}
					<div class="flex flex-col items-center justify-center py-12 text-stone-600">
						<svg
							xmlns="http://www.w3.org/2000/svg"
							fill="none"
							viewBox="0 0 24 24"
							stroke-width="1.5"
							stroke="currentColor"
							class="mb-2 h-12 w-12 opacity-50"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
							/>
						</svg>
						<p class="font-mono text-sm tracking-widest uppercase">NO_DATA_PACKETS_FOUND</p>
					</div>
				{/if}
			</div>
			<!-- Footer hint -->
			<div class="border-t border-stone-900 bg-stone-950 p-2 text-center">
				<p class="font-mono text-[10px] text-stone-600 uppercase">
					SECURE_CONNECTION_ESTABLISHED // STREAMING_PROTOCOL_READY
				</p>
			</div>
		</div>
	</div>
{/if}
