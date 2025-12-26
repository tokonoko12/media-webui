<script lang="ts">
	import type { Movie } from '$lib/data';

	interface Props {
		movie: Movie;
	}

	let { movie }: Props = $props();
</script>

<a
	href={movie.media_type === 'tv' ? `/series/${movie.id}` : `/movies/${movie.id}`}
	class="group/card relative flex h-full flex-col gap-3 transition-all duration-300 hover:-translate-y-1"
>
	<!-- Poster Container -->
	<div
		class="border-dash-border group-hover/card:border-dash-amber relative aspect-[2/3] w-full overflow-hidden border transition-colors"
	>
		{#if movie.poster_path}
			<img
				src={movie.poster_path}
				alt={movie.title}
				class="h-full w-full object-cover transition-transform duration-500 group-hover/card:scale-105"
				loading="lazy"
			/>
		{:else}
			<div class="bg-dash-panel flex h-full w-full items-center justify-center">
				<span class="text-dash-text text-xs uppercase">NO_IMG</span>
			</div>
		{/if}

		<!-- Overlay Gradient -->
		<div
			class="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/80 to-transparent"
		></div>

		<!-- Rating Badge (Overlaid) -->
		<div
			class="border-dash-border/50 absolute top-2 right-2 flex items-center gap-1 border bg-black/80 px-1.5 py-0.5 backdrop-blur-sm"
		>
			<span class="text-dash-amber text-[10px] font-bold">{movie.vote_average.toFixed(1)}</span>
		</div>
	</div>

	<!-- Info Section -->
	<div class="flex flex-col gap-1 px-1">
		<h3
			class="font-retro text-dash-text-light group-hover/card:text-dash-amber line-clamp-1 text-lg leading-none transition-colors"
			title={movie.title}
		>
			{movie.title}
		</h3>

		<div class="text-dash-text/70 flex items-center gap-2 font-mono text-xs uppercase">
			<span>{movie.release_date?.split('-')[0] || 'N/A'}</span>
			<span class="text-dash-border">•</span>
			<span class="truncate">{movie.genres?.slice(0, 1).join('') || 'UNKNOWN'}</span>
		</div>
	</div>
</a>
