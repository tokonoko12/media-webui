<script lang="ts">
	import MovieCard from '$lib/components/ui/MovieCard.svelte';
	import { onMount } from 'svelte';

	let { data } = $props();

	let movies = $state(data.movies || []);
	let currentPage = $state(data.currentPage || 1);
	let isLoading = $state(false);
	let hasMore = $state((data.totalPages || 0) > 1);
	let loadTrigger = $state<HTMLElement | undefined>(undefined);
	let observer: IntersectionObserver;

	// Reactively update local state when data changes (navigation)
	$effect(() => {
		movies = data.movies || [];
		currentPage = data.currentPage || 1;
		hasMore = (data.totalPages || 0) > 1;
	});

	let title = $derived.by(() => {
		if (data.mode === 'index') return 'MOVIES CATALOG';
		if (data.category === 'top') return 'TOP RATED MOVIES';
		if (data.category === 'new') return 'NEW RELEASES';
		if (data.category === 'retro') return 'RETRO ARCHIVE';
		if (data.genre === '28') return 'ACTION MOVIES';
		if (data.genre === '35') return 'COMEDY MOVIES';
		if (data.genre === '878') return 'SCI-FI MOVIES';
		if (data.genre === '27') return 'HORROR MOVIES';
		if (data.genre === '16') return 'ANIMATION MOVIES';
		return 'DISCOVER MOVIES';
	});

	async function loadMore() {
		if (isLoading || !hasMore) return;
		isLoading = true;

		try {
			const nextPage = currentPage + 1;
			let url = `/api/media?type=movie&page=${nextPage}`;
			if (data.category) url += `&category=${data.category}`;
			if (data.genre) url += `&genre=${data.genre}`;

			const res = await fetch(url);
			const resData = await res.json();

			if (resData.results && resData.results.length > 0) {
				movies = [...movies, ...resData.results];
				currentPage = nextPage;
				if (currentPage >= (resData.total_pages || 1)) {
					hasMore = false;
				}
			} else {
				hasMore = false;
			}
		} catch (error) {
			console.error('Error loading more movies:', error);
		} finally {
			isLoading = false;
		}
	}

	$effect(() => {
		if (loadTrigger && hasMore) {
			observer = new IntersectionObserver(
				(entries) => {
					if (entries[0].isIntersecting) {
						loadMore();
					}
				},
				{ rootMargin: '200px' }
			);

			observer.observe(loadTrigger);

			return () => {
				observer.disconnect();
			};
		}
	});
</script>

<svelte:head>
	<title>MEDIAHUB // {title}</title>
</svelte:head>

<div class="mx-auto flex h-full max-w-7xl flex-col gap-8 pb-12">
	{#if data.mode === 'detail'}
		<!-- DETAIL VIEW: Single Grid + Infinite Scroll -->
		<section>
			<div class="border-dash-border mb-6 flex items-center justify-between border-b pb-2">
				<h1 class="font-retro text-dash-text-light text-xl tracking-widest uppercase md:text-2xl">
					{title}
				</h1>
			</div>

			{#if movies.length > 0}
				<div class="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-4">
					{#each movies as movie}
						<MovieCard {movie} />
					{/each}
				</div>

				<!-- Infinite Scroll Trigger -->
				{#if hasMore}
					<div
						bind:this={loadTrigger}
						class="text-dash-text mt-8 flex justify-center py-4 font-mono text-xs uppercase opacity-50"
					>
						{#if isLoading}
							<span class="animate-pulse">LOADING_DATA_PACKETS...</span>
						{:else}
							<span>WAITING_FOR_SCROLL_EVENT...</span>
						{/if}
					</div>
				{:else}
					<div class="text-dash-text mt-8 text-center font-mono text-xs uppercase opacity-30">
						END_OF_STREAM
					</div>
				{/if}
			{:else}
				<div class="text-dash-text py-20 text-center font-mono opacity-50">
					NO_DATA_FOUND_IN_SECTOR
				</div>
			{/if}
		</section>
	{:else}
		<!-- INDEX VIEW: Multiple Genre Sections -->

		<div class="grid grid-cols-1 gap-6 md:grid-cols-2">
			{#each data.sections as section}
				<section class="panel">
					<div class="border-dash-border mb-4 flex items-center justify-between border-b pb-2">
						<h2 class="text-dash-text-light text-sm font-bold tracking-wider uppercase">
							{section.title}
						</h2>
						<a
							href={section.link}
							class="text-dash-text hover:text-dash-amber text-xs tracking-wider uppercase"
							>[VIEW_MORE]</a
						>
					</div>
					<div class="scrollbar-hide flex gap-4 overflow-x-auto pt-4 pb-4">
						{#each section.data as movie}
							<div class="w-[140px] flex-none">
								<MovieCard {movie} />
							</div>
						{/each}
					</div>
				</section>
			{/each}
		</div>
	{/if}
</div>
