<script lang="ts">
	import SectionRow from '$lib/components/ui/SectionRow.svelte';
	import Skeleton from '$lib/components/ui/Skeleton.svelte';
	import { BackendClient } from '$lib/backend';
	import { onMount } from 'svelte';

	let catalog = $state<{ sections: any[] }>({ sections: [] });
	let isLoading = $state(true);
	let error = $state<string | null>(null);

	onMount(async () => {
		try {
			const client = new BackendClient();
			catalog = await client.getMoviesCatalog();
		} catch (e: any) {
			console.error(e);
			error = 'Failed to load movies catalog';
		} finally {
			isLoading = false;
		}
	});
</script>

<svelte:head>
	<title>MEDIAHUB // MOVIES</title>
</svelte:head>

<div class="mx-auto flex h-full max-w-7xl flex-col gap-8 px-4 pt-20 pb-12 md:px-8">
	<div class="flex flex-col gap-12">
		{#if isLoading}
			<!-- Skeletons -->
			{#each Array(2) as _}
				<div class="space-y-4">
					<Skeleton class="h-8 w-48" />
					<div class="scrollbar-hide flex flex-nowrap gap-4 overflow-x-auto">
						{#each Array(6) as _}
							<Skeleton class="aspect-[2/3] w-[140px] flex-none md:w-[180px]" />
						{/each}
					</div>
				</div>
			{/each}
		{:else if error}
			<div class="flex h-96 w-full items-center justify-center font-mono text-red-500">
				{error}
			</div>
		{:else if catalog.sections && catalog.sections.length > 0}
			{#each catalog.sections as section}
				<SectionRow
					title={section.title.toUpperCase()}
					movies={section.items}
					link="#"
					color="dash-amber"
				/>
			{/each}
		{:else}
			<div class="text-dash-text py-20 text-center font-mono opacity-50">NO MOVIES FOUND</div>
		{/if}
	</div>
</div>
