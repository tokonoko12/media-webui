<script lang="ts">
	import { page } from '$app/state';

	let tabs = [
		{ label: 'HOME', href: '/' },
		{ label: 'MOVIES', href: '/movies' },
		{ label: 'SERIES', href: '/series' },
		{ label: 'LIST', href: '/my-list' }
	];

	let isMenuOpen = $state(false);

	function toggleMenu() {
		isMenuOpen = !isMenuOpen;
	}

	function closeMenu() {
		isMenuOpen = false;
	}
</script>

<nav
	class="bg-dash-bg border-dash-border fixed top-0 left-0 z-50 flex h-12 w-full items-center justify-between border-b px-0 font-mono text-sm"
>
	<div class="flex h-full items-center">
		<!-- Logo Area -->
		<div class="border-dash-border flex h-full items-center gap-3 border-r px-6">
			<div class="bg-dash-amber h-3 w-3"></div>
			<span class="text-dash-text-light font-bold tracking-widest uppercase">MEDIAHUB</span>
		</div>

		<!-- Desktop Tabs -->
		<div class="hidden h-full md:flex">
			{#each tabs as tab}
				<a
					href={tab.href}
					class="border-dash-border hover:bg-dash-panel hover:text-dash-amber flex h-full items-center border-r px-8 text-xs font-bold tracking-widest uppercase transition-colors
          {page.url.pathname === tab.href
						? 'bg-dash-panel text-dash-amber border-t-dash-amber border-t-2 pt-[2px]'
						: 'text-dash-text border-t-2 border-t-transparent pt-[2px]'}"
				>
					{tab.label}
				</a>
			{/each}
		</div>
	</div>

	<!-- Desktop Search and Actions -->
	<div class="border-dash-border hidden h-full items-center border-l md:flex">
		<form action="/search" class="flex h-full items-center px-4">
			<input
				type="text"
				name="q"
				placeholder="SEARCH_DB..."
				class="bg-dash-bg text-dash-text border-dash-border focus:border-dash-amber w-32 border-b bg-transparent px-2 py-1 text-xs transition-all outline-none placeholder:opacity-40 focus:w-48"
			/>
		</form>
		<div class="border-dash-border flex h-full items-center border-l px-6">
			<button
				class="border-dash-border hover:border-dash-amber hover:text-dash-amber text-dash-text border px-4 py-1.5 text-xs tracking-widest uppercase transition-colors"
			>
				Login
			</button>
		</div>
	</div>

	<!-- Mobile Toggle -->
	<div class="border-dash-border flex h-full items-center border-l px-4 md:hidden">
		<button
			onclick={toggleMenu}
			class="text-dash-text hover:text-dash-amber flex flex-col gap-1 p-2"
			aria-label="Toggle Menu"
		>
			<span
				class="block h-0.5 w-5 bg-current transition-transform {isMenuOpen
					? 'translate-y-1.5 rotate-45'
					: ''}"
			></span>
			<span class="block h-0.5 w-5 bg-current transition-opacity {isMenuOpen ? 'opacity-0' : ''}"
			></span>
			<span
				class="block h-0.5 w-5 bg-current transition-transform {isMenuOpen
					? '-translate-y-1.5 -rotate-45'
					: ''}"
			></span>
		</button>
	</div>
</nav>

<!-- Mobile Menu Overlay -->
{#if isMenuOpen}
	<div
		class="bg-dash-bg border-dash-border fixed top-12 left-0 z-40 w-full border-b shadow-lg md:hidden"
	>
		<div class="flex flex-col">
			{#each tabs as tab}
				<a
					href={tab.href}
					onclick={closeMenu}
					class="border-dash-border hover:bg-dash-panel hover:text-dash-amber border-b py-4 text-center text-xs font-bold tracking-widest uppercase transition-colors
          {page.url.pathname === tab.href ? 'text-dash-amber bg-dash-panel' : 'text-dash-text'}"
				>
					{tab.label}
				</a>
			{/each}
			<div class="border-dash-border flex justify-center border-b p-4">
				<form action="/search" class="w-full max-w-xs">
					<input
						type="text"
						name="q"
						placeholder="SEARCH_DATABASE..."
						class="bg-dash-bg text-dash-text border-dash-border focus:border-dash-amber w-full border px-4 py-2 text-xs transition-colors outline-none placeholder:opacity-40"
					/>
				</form>
			</div>
			<div class="border-dash-border flex justify-center border-b p-4">
				<button
					class="border-dash-border hover:border-dash-amber hover:text-dash-amber text-dash-text w-full max-w-xs border px-4 py-2 text-xs tracking-widest uppercase transition-colors"
				>
					Login
				</button>
			</div>
		</div>
	</div>
{/if}
