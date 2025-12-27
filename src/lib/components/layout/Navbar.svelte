<script lang="ts">
	import { page } from '$app/state';
	import { afterNavigate } from '$app/navigation';

	interface Attributes {
		'on:clickoutside'?: (e: CustomEvent) => void;
	}

	function clickOutside(node: HTMLElement) {
		const handleClick = (event: MouseEvent) => {
			if (node && !node.contains(event.target as Node) && !event.defaultPrevented) {
				node.dispatchEvent(new CustomEvent('clickoutside', { detail: node }));
			}
		};

		document.addEventListener('click', handleClick, true);

		return {
			destroy() {
				document.removeEventListener('click', handleClick, true);
			}
		};
	}

	let tabs = [
		{ label: 'MOVIES', href: '/movies' },
		{ label: 'SERIES', href: '/series' }
	];

	let isMenuOpen = $state(false);
	let isProfileOpen = $state(false);

	function toggleMenu() {
		isMenuOpen = !isMenuOpen;
	}

	function closeMenu() {
		isMenuOpen = false;
	}

	function toggleProfile() {
		isProfileOpen = !isProfileOpen;
	}

	function closeProfile() {
		isProfileOpen = false;
	}

	let isMobileSearchOpen = $state(false);

	function toggleMobileSearch() {
		isMobileSearchOpen = !isMobileSearchOpen;
		if (isMobileSearchOpen) isMenuOpen = false;
	}

	let searchQuery = $state('');

	function clearSearch() {
		searchQuery = '';
		// Optional: focus input
		document.getElementById('desktop-search-input')?.focus();
	}

	afterNavigate(() => {
		searchQuery = '';
		isMobileSearchOpen = false;
		isMenuOpen = false;
		isProfileOpen = false;
	});

	// Default avatar if user avatar is nil
	// Using a simple transparent SVG with a user icon or just a colored circle
	const defaultAvatar = `https://ui-avatars.com/api/?name=User&background=random&color=fff&size=128`;

	function focusOnMount(node: HTMLElement) {
		node.focus();
	}
</script>

<nav
	class="bg-dash-bg border-dash-border fixed top-0 left-0 z-50 flex h-12 w-full items-center justify-between border-b px-0 font-mono text-sm"
>
	<div class="flex h-full shrink-0 items-center">
		<!-- Logo Area -->
		<a
			href="/"
			class="border-dash-border hover:bg-dash-panel flex h-full items-center gap-3 border-r px-4 transition-colors lg:px-6"
		>
			<div class="bg-dash-amber h-3 w-3"></div>
			<span class="text-dash-text-light font-bold tracking-widest uppercase">MEDIAHUB</span>
		</a>

		<!-- Desktop Tabs -->
		<div class="hidden h-full md:flex">
			{#each tabs as tab}
				<a
					href={tab.href}
					class="border-dash-border hover:bg-dash-panel hover:text-dash-amber flex h-full items-center border-r px-4 text-xs font-bold tracking-widest uppercase transition-colors lg:px-8
          {page.url.pathname.startsWith(tab.href)
						? 'bg-dash-panel text-dash-amber border-t-dash-amber border-t-2 pt-[2px]'
						: 'text-dash-text border-t-2 border-t-transparent pt-[2px]'}"
				>
					{tab.label}
				</a>
			{/each}
		</div>
	</div>

	<!-- Centered Search -->
	<div class="hidden h-full flex-1 items-center px-4 md:flex">
		<form action="/search" class="flex h-full w-full items-center">
			<div class="relative flex w-full flex-1 items-center">
				<svg
					xmlns="http://www.w3.org/2000/svg"
					fill="none"
					viewBox="0 0 24 24"
					stroke-width="1.5"
					stroke="currentColor"
					class="text-dash-text/50 absolute left-3 h-4 w-4"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
					/>
				</svg>
				<input
					id="desktop-search-input"
					type="text"
					name="q"
					bind:value={searchQuery}
					placeholder="SEARCH_DB..."
					class="text-dash-text border-dash-border/30 focus:border-dash-amber w-full border bg-transparent py-1.5 pr-8 pl-10 text-xs transition-all outline-none placeholder:opacity-40"
					autocomplete="off"
				/>
				{#if searchQuery}
					<button
						type="button"
						onclick={clearSearch}
						class="text-dash-text/50 hover:text-dash-amber absolute right-0 p-1 transition-colors"
						aria-label="Clear search"
					>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							fill="none"
							viewBox="0 0 24 24"
							stroke-width="1.5"
							stroke="currentColor"
							class="h-4 w-4"
						>
							<path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
						</svg>
					</button>
				{/if}
			</div>
			<button
				type="submit"
				class="hover:text-dash-amber text-dash-text ml-2 px-2 py-1.5 text-xs font-bold tracking-widest uppercase transition-all lg:px-4"
			>
				SEARCH
			</button>
		</form>
	</div>

	<!-- Right Actions -->
	<div class="flex h-full shrink-0 items-center">
		<div class="border-dash-border hidden h-full items-center border-l px-4 md:flex lg:px-6">
			{#if page.data.isLoggedIn}
				<!-- Profile Dropdown -->
				<div class="relative flex h-full items-center">
					<button onclick={toggleProfile} class="flex items-center gap-2 focus:outline-none">
						<img
							src={page.data.user?.avatar || defaultAvatar}
							alt="User"
							class="hover:border-dash-amber h-8 w-8 rounded-full border border-white/20 transition-colors"
						/>
					</button>

					{#if isProfileOpen}
						<!-- svelte-ignore a11y_no_static_element_interactions -->
						<div
							use:clickOutside
							onclickoutside={closeProfile}
							class="bg-dash-bg border-dash-border absolute top-full right-0 z-50 mt-2 flex w-48 flex-col border shadow-xl"
						>
							<a
								href="/my-list"
								onclick={closeProfile}
								class="text-dash-text hover:text-dash-amber px-4 py-3 text-xs tracking-widest uppercase transition-colors hover:bg-white/5"
							>
								Watchlist
							</a>
							<a
								href="/history"
								onclick={closeProfile}
								class="text-dash-text hover:text-dash-amber border-dash-border border-t px-4 py-3 text-xs tracking-widest uppercase transition-colors hover:bg-white/5"
							>
								History
							</a>
							<form action="/logout" method="POST" class="w-full">
								<button
									type="submit"
									class="text-dash-text hover:text-dash-amber border-dash-border w-full border-t px-4 py-3 text-left text-xs tracking-widest uppercase transition-colors hover:bg-white/5"
								>
									Logout
								</button>
							</form>
						</div>
					{/if}
				</div>
			{:else}
				<a
					href="/login"
					class="border-dash-border hover:border-dash-amber hover:text-dash-amber text-dash-text border px-4 py-1.5 text-xs tracking-widest uppercase transition-colors"
				>
					Login
				</a>
			{/if}
		</div>

		<!-- Mobile Search Toggle -->
		<div class="border-dash-border flex h-full items-center border-l px-4 md:hidden">
			<button
				onclick={toggleMobileSearch}
				class="text-dash-text hover:text-dash-amber p-2"
				aria-label="Toggle Search"
			>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					fill="none"
					viewBox="0 0 24 24"
					stroke-width="1.5"
					stroke="currentColor"
					class="h-5 w-5"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
					/>
				</svg>
			</button>
		</div>

		<!-- Mobile Menu Toggle -->
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

			{#if page.data.isLoggedIn}
				<!-- Mobile User Links -->
				<a
					href="/my-list"
					onclick={closeMenu}
					class="border-dash-border hover:bg-dash-panel hover:text-dash-amber text-dash-text border-b py-4 text-center text-xs font-bold tracking-widest uppercase transition-colors"
				>
					Watchlist
				</a>
				<a
					href="/history"
					onclick={closeMenu}
					class="border-dash-border hover:bg-dash-panel hover:text-dash-amber text-dash-text border-b py-4 text-center text-xs font-bold tracking-widest uppercase transition-colors"
				>
					History
				</a>
				<div class="border-dash-border flex justify-center border-b p-4">
					<form action="/logout" method="POST" class="w-full max-w-xs">
						<button
							type="submit"
							class="border-dash-border hover:border-dash-amber hover:text-dash-amber text-dash-text w-full border px-4 py-2 text-xs tracking-widest uppercase transition-colors"
						>
							Logout
						</button>
					</form>
				</div>
			{:else}
				<div class="border-dash-border flex justify-center border-b p-4">
					<a
						href="/login"
						onclick={closeMenu}
						class="border-dash-border hover:border-dash-amber hover:text-dash-amber text-dash-text block w-full max-w-xs border px-4 py-2 text-center text-xs tracking-widest uppercase transition-colors"
					>
						Login
					</a>
				</div>
			{/if}
		</div>
	</div>
{/if}

<!-- Mobile Search Overlay -->
{#if isMobileSearchOpen}
	<div
		class="bg-dash-bg border-dash-border fixed top-12 left-0 z-40 flex w-full justify-center border-b p-4 shadow-lg md:hidden"
	>
		<form action="/search" class="flex w-full max-w-xs gap-2">
			<input
				type="text"
				name="q"
				placeholder="SEARCH_DATABASE..."
				class="bg-dash-bg text-dash-text border-dash-border focus:border-dash-amber w-full border px-4 py-2 text-xs transition-colors outline-none placeholder:opacity-40"
				use:focusOnMount
			/>
			<button
				type="submit"
				class="bg-dash-amber text-dash-bg border-dash-amber border px-4 py-2 text-xs font-bold tracking-widest uppercase"
			>
				GO
			</button>
		</form>
	</div>
{/if}
