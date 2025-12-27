<script lang="ts">
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';
	import Navbar from '$lib/components/layout/Navbar.svelte';
	import { navigating, page } from '$app/stores';
	import { onMount } from 'svelte';
	import { user, isAuthenticated } from '$lib/stores';
	import { BackendClient } from '$lib/backend';
	import { goto } from '$app/navigation';

	let { children, data } = $props();

	onMount(async () => {
		// If we have a token (hint from server), but no user data yet, fetch it.
		// Or simply always try to fetch if we think we might be logged in.
		if (data.isLoggedIn && !$user) {
			try {
				const client = new BackendClient();
				const { user: userData } = await client.getMe();
				user.set(userData);
				isAuthenticated.set(true);
			} catch (e) {
				console.error('Client-side auth check failed:', e);
				user.set(undefined);
				isAuthenticated.set(false);

				// Optional: Check if we are on a protected route and redirect
				// The server hook still protects routes via cookies, but strictly speaking
				// we might want to redirect if the cookie is invalid even if it exists.
				const publicRoutes = ['/login', '/register'];
				if (!publicRoutes.includes($page.url.pathname)) {
					goto('/login');
				}
			}
		} else if (!data.isLoggedIn) {
			user.set(undefined);
			isAuthenticated.set(false);
		}
	});

	// React to logout which might happen elsewhere
	$effect(() => {
		if ($user) {
			isAuthenticated.set(true);
		} else {
			isAuthenticated.set(false);
		}
	});
</script>

<svelte:head><link rel="icon" href={favicon} /></svelte:head>

<!-- Global Loading Bar -->
{#if $navigating}
	<div class="bg-dash-border fixed top-0 right-0 left-0 z-[100] h-1">
		<div class="bg-dash-amber animate-progress h-full" style="width: 100%"></div>
	</div>
	<style>
		@keyframes progress {
			0% {
				width: 0%;
				transform: translateX(-100%);
			}
			50% {
				width: 50%;
				transform: translateX(0);
			}
			100% {
				width: 100%;
				transform: translateX(0);
			}
		}
		.animate-progress {
			animation: progress 2s infinite linear;
			transform-origin: 0% 50%;
		}
	</style>
{/if}

<div
	class="bg-dash-bg text-dash-text selection:bg-dash-amber flex min-h-screen flex-col overflow-x-hidden font-mono selection:text-black"
>
	{#if !$page.url.pathname.startsWith('/login')}
		<Navbar />
	{/if}
	<main class="flex-grow">
		{@render children()}
	</main>
</div>
