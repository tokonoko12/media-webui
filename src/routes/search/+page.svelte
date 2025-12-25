<script lang="ts">
	import MovieCard from '$lib/components/ui/MovieCard.svelte';
	import Pagination from '$lib/components/ui/Pagination.svelte';

	let { data } = $props();
</script>

<svelte:head>
	<title>MEDIAHUB // SEARCH: {data.query.toUpperCase()}</title>
</svelte:head>

<div class="mx-auto flex h-full max-w-7xl flex-col gap-8 pb-12">
	<section class="panel">
		<div class="border-dash-border mb-6 flex items-center justify-between border-b pb-2">
			<h1 class="font-retro text-dash-text-light text-xl tracking-widest uppercase md:text-2xl">
				SEARCH_RESULTS: <span class="text-dash-amber">"{data.query}"</span>
			</h1>
			<span class="text-dash-text font-mono text-xs uppercase">
				{data.results.length} UNITS FOUND
			</span>
		</div>

		{#if data.results.length > 0}
			<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
				{#each data.results as movie}
					<MovieCard {movie} />
				{/each}
			</div>

			<div class="mt-8 flex justify-center">
				<Pagination
					currentPage={data.currentPage}
					totalPages={data.totalPages}
					baseUrl={`/search?q=${data.query}`}
				/>
			</div>
		{:else if data.query}
			<div class="text-dash-text py-20 text-center font-mono opacity-50">
				NO_DATA_FOUND_FOR_QUERY
			</div>
		{:else}
			<div class="text-dash-text py-20 text-center font-mono opacity-50">AWAITING_INPUT...</div>
		{/if}
	</section>
</div>
