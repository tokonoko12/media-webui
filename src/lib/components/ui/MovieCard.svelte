<script lang="ts">
	import type { Movie } from '$lib/data';

	interface Props {
		movie: Movie;
	}

	let { movie }: Props = $props();
</script>

<a
	href={movie.media_type === 'tv' ? `/series/${movie.id}` : `/movies/${movie.id}`}
	class="group hover:border-dash-amber/50 flex cursor-pointer flex-col gap-1 border border-transparent p-2 transition-all hover:bg-white/5"
>
	<!-- Minimalist layout: Poster left, Details right (or top/down depending on container) -->
	<div class="flex gap-3">
		<div class="bg-dash-panel border-dash-border relative h-16 w-12 flex-shrink-0 border">
			<img
				src={movie.poster_path}
				alt={movie.title}
				class="h-full w-full object-cover transition-opacity"
			/>
		</div>

		<div class="flex min-w-0 flex-1 flex-col">
			<h3
				class="text-dash-text-light group-hover:text-dash-amber truncate font-mono text-sm font-bold transition-colors"
			>
				{movie.title}
			</h3>
			<div class="text-dash-text mt-1 flex items-center gap-2 text-xs">
				<span>{movie.release_date.split('-')[0]}</span>
				<span class="border-dash-border border px-1 text-[10px]"
					>{movie.vote_average.toFixed(1)}</span
				>
			</div>
			<div class="text-dash-text text-opacity-50 mt-1 truncate text-[10px]">
				{movie.genres.slice(0, 2).join(', ')}
			</div>
		</div>
	</div>
</a>
