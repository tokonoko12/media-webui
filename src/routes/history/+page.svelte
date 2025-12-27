<script lang="ts">
	import MovieCard from '$lib/components/ui/MovieCard.svelte';
	import Skeleton from '$lib/components/ui/Skeleton.svelte';
	import { BackendClient } from '$lib/backend';
	import { onMount } from 'svelte';

	// No server props
	// let { data } = $props();

	let historyItems = $state<any[]>([]);
	let isLoading = $state(true);
	let error = $state<string | null>(null);

	// Pagination State
	let currentPage = $state(1);
	let totalPages = $state(0);
	let totalResults = $state(0);
	let isLoadMore = $state(false);

	onMount(async () => {
		await loadHistory(1);
	});

	async function loadHistory(page: number) {
		if (page === 1) {
			isLoading = true;
		} else {
			isLoadMore = true;
		}

		error = null;
		try {
			const client = new BackendClient();
			const res = await client.getHistory(page);
			const items = res.history || [];

			if (items.length === 0) {
				if (page === 1) {
					historyItems = [];
					totalPages = 0;
					totalResults = 0;
				}
				return;
			}

			// Items already contain details
			const validResults = items.map((item: any) => ({
				...item,
				media_type: item.media_type, // Ensure media_type is kept
				// Map history specific fields for MovieCard (progress bar support planned)
				history_progress: item.progress,
				history_duration: item.duration
			}));

			if (page === 1) {
				historyItems = validResults;
			} else {
				historyItems = [...historyItems, ...validResults];
			}

			// const results = await Promise.all(detailsPromises);
			// const validResults = results.filter((r) => r !== null);

			if (page === 1) {
				historyItems = validResults;
			} else {
				historyItems = [...historyItems, ...validResults];
			}

			currentPage = res.page;
			totalPages = res.total_pages;
			totalResults = res.total_results;
		} catch (e: any) {
			console.error('Failed to load history', e);
			error = 'Failed to load your history';
		} finally {
			isLoading = false;
			isLoadMore = false;
		}
	}

	function loadMore() {
		if (!isLoading && !isLoadMore && currentPage < totalPages) {
			loadHistory(currentPage + 1);
		}
	}
</script>

<svelte:head>
	<title>MEDIAHUB // HISTORY</title>
</svelte:head>

<div class="relative min-h-screen w-full bg-black">
	<div
		class="pointer-events-none fixed inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20"
	></div>

	<div class="relative z-10 px-6 pt-20 pb-12 md:px-12">
		<div class="mx-auto max-w-7xl">
			<div class="border-dash-border/30 mb-12 flex items-center border-b pb-4">
				<div class="flex items-center gap-3">
					<div class="bg-dash-amber h-8 w-1"></div>
					<h1 class="font-retro text-dash-text-light text-3xl tracking-wide uppercase sm:text-4xl">
						History
					</h1>
				</div>
			</div>

			{#if isLoading && currentPage === 1}
				<!-- Grid Skeleton -->
				<div
					class="mb-12 grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6"
				>
					{#each Array(12) as _}
						<div class="space-y-3">
							<Skeleton class="aspect-[2/3] w-full" />
							<Skeleton class="h-4 w-3/4" />
							<Skeleton class="h-3 w-1/2" />
						</div>
					{/each}
				</div>
			{:else if error && historyItems.length === 0}
				<div class="flex h-64 w-full items-center justify-center font-mono text-red-500">
					{error}
				</div>
			{:else if historyItems.length === 0}
				<div
					class="text-dash-text/50 flex h-64 w-full flex-col items-center justify-center gap-4 font-mono"
				>
					<p>NO_HISTORY_FOUND</p>
					<a
						href="/"
						class="text-dash-amber text-sm uppercase transition-colors hover:text-white hover:underline"
						>Start Watching</a
					>
				</div>
			{:else}
				<div
					class="mb-12 grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6"
				>
					{#each historyItems as item}
						<MovieCard movie={item} />
					{/each}
				</div>

				<!-- Loading Indicator for Infinite Scroll -->
				{#if isLoadMore}
					<div class="flex justify-center pb-20">
						<div
							class="border-t-dash-amber h-6 w-6 animate-spin rounded-full border-2 border-white/20"
						></div>
					</div>
				{/if}
			{/if}
		</div>
	</div>
</div>

<svelte:window
	onscroll={() => {
		if (isLoading || isLoadMore || currentPage >= totalPages) return;
		if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 500) {
			loadMore();
		}
	}}
/>
