<script lang="ts">
	import { page } from '$app/state';
	import { afterNavigate } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import * as Sheet from '$lib/components/ui/sheet';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import { Search, Menu, X, User, LogOut, History, List, MonitorPlay } from 'lucide-svelte';

	let tabs = [
		{ label: 'MOVIES', href: '/movies' },
		{ label: 'SERIES', href: '/series' }
	];

	// State for mobile menu
	let isMenuOpen = $state(false);

	function closeMenu() {
		isMenuOpen = false;
	}

	// Search state
	let searchQuery = $state('');

	function clearSearch() {
		searchQuery = '';
		document.getElementById('desktop-search-input')?.focus();
	}

	afterNavigate(() => {
		searchQuery = '';
		isMenuOpen = false;
	});

	// Avatar fallback
	const defaultAvatar = `https://ui-avatars.com/api/?name=User&background=random&color=fff&size=128`;
</script>

<header
	class="bg-background/95 supports-[backdrop-filter]:bg-background/60 border-border/40 sticky top-0 z-50 w-full border-b backdrop-blur-sm"
>
	<div class="flex h-14 items-center px-4 md:px-6">
		<!-- Mobile Menu (Sheet) -->
		<Sheet.Root bind:open={isMenuOpen}>
			<Sheet.Trigger>
				{#snippet child({ props })}
					<Button {...props} variant="ghost" size="icon" class="mr-2 md:hidden">
						<Menu class="h-5 w-5" />
						<span class="sr-only">Toggle Menu</span>
					</Button>
				{/snippet}
			</Sheet.Trigger>
			<Sheet.Content side="left" class="border-border/40 bg-background w-[300px] sm:w-[350px]">
				<Sheet.Header class="text-left">
					<Sheet.Title class="flex items-center gap-2">
						<div class="bg-primary h-4 w-4 shadow-[0_0_10px_rgba(250,204,21,0.5)]"></div>
						<span class="text-foreground font-bold tracking-widest uppercase">MEDIAHUB</span>
					</Sheet.Title>
				</Sheet.Header>
				<nav class="mt-8 flex flex-col gap-4">
					{#each tabs as tab}
						<Button
							variant="ghost"
							class="justify-start font-bold tracking-widest uppercase"
							href={tab.href}
							onclick={closeMenu}
						>
							{tab.label}
						</Button>
					{/each}

					<div class="bg-border/40 my-4 h-px"></div>

					{#if page.data.isLoggedIn}
						<Button variant="ghost" class="justify-start" href="/my-list" onclick={closeMenu}>
							<List class="mr-2 h-4 w-4" /> Watchlist
						</Button>
						<Button variant="ghost" class="justify-start" href="/history" onclick={closeMenu}>
							<History class="mr-2 h-4 w-4" /> History
						</Button>
						<form action="/logout" method="POST" class="w-full">
							<Button
								variant="ghost"
								type="submit"
								class="text-muted-foreground hover:text-foreground w-full justify-start"
							>
								<LogOut class="mr-2 h-4 w-4" /> Logout
							</Button>
						</form>
					{:else}
						<Button variant="default" href="/login" onclick={closeMenu}>Login</Button>
					{/if}
				</nav>
			</Sheet.Content>
		</Sheet.Root>

		<!-- Logo -->
		<a href="/" class="mr-6 flex items-center gap-2">
			<div class="bg-primary h-4 w-4 shadow-[0_0_10px_rgba(250,204,21,0.5)]"></div>
			<span class="text-foreground hidden font-bold tracking-widest uppercase sm:inline-block"
				>MEDIAHUB</span
			>
		</a>

		<!-- Desktop Navigation -->
		<nav class="hidden items-center gap-6 text-sm font-medium md:flex">
			{#each tabs as tab}
				<a
					href={tab.href}
					class="hover:text-foreground/80 transition-colors {page.url.pathname.startsWith(tab.href)
						? 'text-primary font-bold'
						: 'text-foreground/60'}"
				>
					{tab.label}
				</a>
			{/each}
		</nav>

		<!-- Search & Actions -->
		<div class="flex flex-1 items-center justify-end gap-2 md:justify-end">
			<div class="w-full flex-1 md:w-auto md:flex-none">
				<form action="/search" class="relative">
					<Search class="text-muted-foreground absolute top-2.5 left-2.5 h-4 w-4" />
					<Input
						id="desktop-search-input"
						type="search"
						name="q"
						placeholder="Search..."
						class="bg-background w-full pl-8 md:w-[200px] lg:w-[300px]"
						bind:value={searchQuery}
					/>
				</form>
			</div>

			<!-- User Profile (Dropdown) -->
			{#if page.data.isLoggedIn}
				<DropdownMenu.Root>
					<DropdownMenu.Trigger>
						{#snippet child({ props })}
							<Button
								{...props}
								variant="ghost"
								size="icon"
								class="border-border/40 relative h-9 w-9 rounded-full border"
							>
								<img
									src={page.data.user?.avatar || defaultAvatar}
									alt="User"
									class="h-9 w-9 rounded-full object-cover"
								/>
							</Button>
						{/snippet}
					</DropdownMenu.Trigger>
					<DropdownMenu.Content align="end">
						<DropdownMenu.Label>My Account</DropdownMenu.Label>
						<DropdownMenu.Separator />
						<DropdownMenu.Item>
							<a href="/my-list" class="flex w-full items-center">
								<List class="mr-2 h-4 w-4" /> Watchlist
							</a>
						</DropdownMenu.Item>
						<DropdownMenu.Item>
							<a href="/history" class="flex w-full items-center">
								<History class="mr-2 h-4 w-4" /> History
							</a>
						</DropdownMenu.Item>
						<DropdownMenu.Separator />
						<DropdownMenu.Item>
							<form action="/logout" method="POST" class="w-full">
								<button type="submit" class="flex w-full items-center text-red-500">
									<LogOut class="mr-2 h-4 w-4" /> Logout
								</button>
							</form>
						</DropdownMenu.Item>
					</DropdownMenu.Content>
				</DropdownMenu.Root>
			{:else}
				<Button variant="default" size="sm" href="/login">Login</Button>
			{/if}
		</div>
	</div>
</header>
