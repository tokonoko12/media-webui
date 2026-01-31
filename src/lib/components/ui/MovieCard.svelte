<script lang="ts">
	import type { Movie } from '$lib/data';
	import { Badge } from '$lib/components/ui/badge';
	import * as Card from '$lib/components/ui/card';

	interface Props {
		movie: Movie;
	}

	let { movie }: Props = $props();
</script>

<a
	href={movie.media_type === 'tv' || movie.media_type === 'series'
		? `/series/${movie.id}`
		: `/movies/${movie.id}`}
	class="group/card block h-full transition-all duration-300 hover:scale-[1.02]"
>
	<Card.Root class="h-full overflow-hidden border-0 bg-transparent shadow-none">
		<Card.Content
			class="bg-muted relative aspect-[2/3] w-full overflow-hidden rounded-md p-0 shadow-lg"
		>
			{#if movie.poster_path}
				<img
					src={movie.poster_path}
					alt={movie.title}
					class="h-full w-full object-cover transition-transform duration-500 group-hover/card:scale-110"
					loading="lazy"
				/>
			{:else}
				<div class="bg-muted flex h-full w-full items-center justify-center">
					<span class="text-muted-foreground text-xs font-medium">No Image</span>
				</div>
			{/if}

			<!-- Overlay Gradient (On Hover) -->
			<div
				class="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60 transition-opacity duration-300 group-hover/card:opacity-90"
			></div>

			<!-- Rating Badge -->
			{#if movie.vote_average > 0}
				<div class="absolute top-2 right-2">
					<Badge
						variant="secondary"
						class="text-primary bg-black/60 font-bold backdrop-blur-md hover:bg-black/70"
					>
						{movie.vote_average.toFixed(1)}
					</Badge>
				</div>
			{/if}

			<!-- Media Type Badge -->
			<div class="absolute top-2 left-2">
				<Badge
					variant="outline"
					class="border-none bg-black/60 text-[9px] font-bold tracking-wider text-white/90 uppercase backdrop-blur-md"
				>
					{movie.media_type === 'tv' || movie.media_type === 'series' ? 'TV' : 'MOVIE'}
				</Badge>
			</div>
		</Card.Content>

		<Card.Footer class="flex flex-col items-start gap-1 p-0 pt-3">
			<h3
				class="text-foreground group-hover/card:text-primary line-clamp-1 text-base font-semibold transition-colors"
				title={movie.title}
			>
				{movie.title}
			</h3>

			<div class="text-muted-foreground flex items-center gap-2 text-xs font-medium">
				<span>{movie.release_date?.split('-')[0] || 'N/A'}</span>
				<span class="text-muted-foreground/50">•</span>
				<span class="text-foreground/80 truncate">
					{#if movie.season && movie.episode}
						<span>S{movie.season} E{movie.episode}</span>
					{:else if movie.genres && movie.genres.length > 0}
						{typeof movie.genres[0] === 'string'
							? movie.genres[0]
							: movie.genres[0].name || 'Unknown'}
					{:else}
						{movie.media_type === 'tv' || movie.media_type === 'series' ? 'Series' : 'Movie'}
					{/if}
				</span>
			</div>
		</Card.Footer>
	</Card.Root>
</a>
