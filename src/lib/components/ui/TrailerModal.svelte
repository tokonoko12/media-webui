<script lang="ts">
	import { X } from 'lucide-svelte';
	import { fade, scale } from 'svelte/transition';

	let { isOpen, youtubeId, onClose } = $props<{
		isOpen: boolean;
		youtubeId?: string;
		onClose: () => void;
	}>();

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape' && isOpen) {
			onClose();
		}
	}
</script>

<svelte:window onkeydown={handleKeydown} />

{#if isOpen && youtubeId}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm"
		transition:fade={{ duration: 200 }}
		onclick={onClose}
		role="dialog"
		aria-modal="true"
		tabindex="-1"
	>
		<div
			class="relative aspect-video w-full max-w-5xl overflow-hidden rounded-xl bg-black shadow-2xl ring-1 ring-white/10"
			transition:scale={{ duration: 200, start: 0.95 }}
			onclick={(e) => e.stopPropagation()}
			role="document"
			tabindex="0"
		>
			<button
				onclick={onClose}
				class="absolute top-4 right-4 z-10 rounded-full bg-black/50 p-2 text-white/70 transition-colors hover:bg-black/80 hover:text-white"
				aria-label="Close trailer"
			>
				<X class="h-6 w-6" />
			</button>

			<iframe
				src="https://www.youtube.com/embed/{youtubeId}?autoplay=1&rel=0"
				title="YouTube video player"
				class="h-full w-full border-0"
				allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
				allowfullscreen
			></iframe>
		</div>
	</div>
{/if}
