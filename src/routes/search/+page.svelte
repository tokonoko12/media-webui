<script lang="ts">
	import MovieCard from '$lib/components/ui/MovieCard.svelte';
	import { Skeleton } from '$lib/components/ui/skeleton';
	import { BackendClient } from '$lib/backend';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';

	// No server props
	// let { data } = $props();

	const query = $derived($page.url.searchParams.get('q') || '');

	let results = $state<any[]>([]);
	let isLoading = $state(false);
	let error = $state<string | null>(null);
	let searchInput = $state('');

	// Pagination State
	let currentPage = $state(1);
	let totalPages = $state(0);
	let totalResults = $state(0);

	$effect(() => {
		searchInput = query;
		if (query) {
			// New query means reset everything
			resetAndSearch(query);
		} else {
			results = [];
			currentPage = 1;
			totalPages = 0;
			totalResults = 0;
		}
	});

	async function resetAndSearch(q: string) {
		results = [];
		currentPage = 1;
		totalPages = 0;
		totalResults = 0;
		await performSearch(q, 1);
	}

	async function performSearch(q: string, page: number) {
		if (!q) return;
		isLoading = true;
		error = null;
		try {
			const client = new BackendClient();
			const res = await client.search(q, page);

			if (page === 1) {
				results = res.results || [];
			} else {
				results = [...results, ...(res.results || [])];
			}

			currentPage = res.page;
			totalPages = res.total_pages;
			totalResults = res.total_results;
		} catch (e: any) {
			console.error(e);
			error = 'Search failed';
			// Don't clear results on error if loading more
			if (page === 1) results = [];
		} finally {
			isLoading = false;
		}
	}

	function handleSearch(e: Event) {
		e.preventDefault();
		if (searchInput.trim()) {
			goto(`/search?q=${encodeURIComponent(searchInput.trim())}`);
		}
	}

	function loadMore() {
		if (!isLoading && currentPage < totalPages) {
			performSearch(query, currentPage + 1);
		}
	}
</script>

<svelte:head>
	<title>MEDIAHUB // SEARCH</title>
</svelte:head>

<div class="relative min-h-screen w-full bg-black">
	<div
		class="pointer-events-none fixed inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20"
	></div>

	<div class="relative z-10 px-6 pt-10 pb-12 md:px-12">
		<div class="mx-auto max-w-7xl">
			<!-- Search Header Removed by User Request -->
			<div class="mb-8"></div>

			<!-- Results -->
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
			{:else if error && results.length === 0}
				<div class="flex h-64 w-full items-center justify-center font-mono text-red-500">
					{error}
				</div>
			{:else if results.length > 0}
				<div
					class="mb-12 grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6"
				>
					{#each results as item}
						<MovieCard movie={item} />
					{/each}
				</div>

				<!-- Loading Indicator for Infinite Scroll -->
				{#if isLoading && currentPage > 1}
					<div class="flex justify-center pb-20">
						<div
							class="border-t-dash-amber h-6 w-6 animate-spin rounded-full border-2 border-white/20"
						></div>
					</div>
				{/if}
			{:else if query}
				<div
					class="text-dash-text/50 flex h-64 w-full flex-col items-center justify-center gap-4 font-mono"
				>
					<p>NO_MATCHES_FOUND</p>
				</div>
			{:else}
				<!-- Empty State -->
				<div
					class="text-dash-text/50 flex h-64 w-full flex-col items-center justify-center gap-4 font-mono"
				>
					<p>AWAITING_INPUT</p>
				</div>
			{/if}
		</div>
	</div>
</div>

<svelte:window
	onscroll={() => {
		if (isLoading || currentPage >= totalPages) return;
		if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 500) {
			loadMore();
		}
	}}
/>
