<script lang="ts">
	import type { Movie } from '$lib/data';

	interface Props {
		movie: Movie;
	}

	let { movie }: Props = $props();
</script>

<section class="relative flex h-[85vh] w-full items-end overflow-hidden pb-20">
	<!-- Background Image with Parallax-like fixity or just absolute -->
	<div class="absolute inset-0 h-full w-full">
		<img
			src={movie.backdrop_path}
			alt={movie.title}
			class="h-full w-full object-cover object-center opacity-60"
		/>
		<!-- Gradient Overlay for fade effect -->
		<div class="from-dark-bg via-dark-bg/50 absolute inset-0 bg-gradient-to-t to-transparent"></div>
		<div
			class="from-dark-bg absolute inset-0 bg-gradient-to-r via-transparent to-transparent"
		></div>
		<!-- Scanline Overlay -->
		<div class="crt-scanline"></div>
	</div>

	<div class="relative z-10 container mx-auto flex flex-col items-start gap-4 px-6">
		<div class="mb-2 flex gap-2">
			{#each movie.genres as genre}
				<span
					class="bg-neon-cyan/10 border-neon-cyan text-neon-cyan border px-2 py-1 text-xs font-bold tracking-wider uppercase backdrop-blur-sm"
				>
					{genre}
				</span>
			{/each}
		</div>

		<h1
			class="font-retro max-w-4xl text-3xl leading-tight font-bold tracking-tight text-white drop-shadow-lg md:text-5xl lg:text-7xl"
		>
			{movie.title}
		</h1>

		<p class="line-clamp-3 max-w-2xl text-lg text-gray-200 drop-shadow-md md:text-xl">
			{movie.overview}
		</p>

		<div class="mt-6 flex items-center gap-4">
			<button
				class="group bg-neon-pink hover:bg-neon-pink/80 clip-path-slant relative overflow-hidden px-8 py-3 text-lg font-bold tracking-wider text-white uppercase shadow-[0_0_20px_rgba(255,0,255,0.5)] transition-all duration-300 hover:shadow-[0_0_40px_rgba(255,0,255,0.7)]"
			>
				<span class="relative z-10 flex items-center gap-2">
					<svg
						xmlns="http://www.w3.org/2000/svg"
						viewBox="0 0 24 24"
						fill="currentColor"
						class="h-6 w-6"
					>
						<path
							fill-rule="evenodd"
							d="M4.5 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.348c1.295.712 1.295 2.573 0 3.285L7.28 19.991c-1.25.687-2.779-.217-2.779-1.643V5.653Z"
							clip-rule="evenodd"
						/>
					</svg>
					Play Now
				</span>
			</button>

			<button
				class="border border-white/20 bg-white/10 px-8 py-3 text-lg font-bold tracking-wider text-white uppercase backdrop-blur-md transition-all duration-300 hover:bg-white/20"
			>
				More Info
			</button>
		</div>
	</div>
</section>

<style>
	.clip-path-slant {
		clip-path: polygon(
			10px 0,
			100% 0,
			100% calc(100% - 10px),
			calc(100% - 10px) 100%,
			0 100%,
			0 10px
		);
	}
</style>
