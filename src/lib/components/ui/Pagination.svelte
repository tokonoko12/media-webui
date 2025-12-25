<script lang="ts">
	import { page } from '$app/state';

	interface Props {
		currentPage: number;
		totalPages: number;
		baseUrl: string;
	}

	let { currentPage, totalPages, baseUrl }: Props = $props();

	function getUrl(p: number) {
		const url = new URL(page.url);
		url.searchParams.set('page', p.toString());
		return url.toString();
	}
</script>

<div class="flex items-center justify-center gap-4 py-8 font-mono text-sm">
	{#if currentPage > 1}
		<a
			href={getUrl(currentPage - 1)}
			class="border-dash-border hover:bg-dash-panel hover:text-dash-amber hover:border-dash-amber border px-4 py-2 uppercase transition-all"
		>
			&lt; PREV
		</a>
	{:else}
		<span
			class="border-dash-border text-dash-text cursor-not-allowed border px-4 py-2 uppercase opacity-30"
		>
			&lt; PREV
		</span>
	{/if}

	<div class="flex items-center gap-2">
		<span class="text-dash-amber font-bold">PAGE {currentPage}</span>
		<span class="text-dash-text text-xs opacity-50">OF {totalPages}</span>
	</div>

	{#if currentPage < totalPages}
		<a
			href={getUrl(currentPage + 1)}
			class="border-dash-border hover:bg-dash-panel hover:text-dash-amber hover:border-dash-amber border px-4 py-2 uppercase transition-all"
		>
			NEXT &gt;
		</a>
	{:else}
		<span
			class="border-dash-border text-dash-text cursor-not-allowed border px-4 py-2 uppercase opacity-30"
		>
			NEXT &gt;
		</span>
	{/if}
</div>
