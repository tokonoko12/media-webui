<script lang="ts">
	import { BackendClient } from '$lib/backend';
	import { goto } from '$app/navigation';

	let email = $state('');
	let password = $state('');
	let error = $state<string | null>(null);
	let isLoading = $state(false);

	async function handleLogin(e: Event) {
		e.preventDefault();
		error = null;
		isLoading = true;

		try {
			const client = new BackendClient();
			const response = await client.login({ email, password });

			if (response.session?.access_token) {
				// Set non-HttpOnly cookie for session since we are client-side
				// Allowing Lax SameSite for general navigation
				document.cookie = `session=${response.session.access_token}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`;

				// Force reload to ensure server hooks pick up the new cookie
				window.location.href = '/';
			} else {
				error = 'Login failed: No session returned.';
			}
		} catch (e: any) {
			console.error(e);
			error = e.message || 'Login failed';
		} finally {
			isLoading = false;
		}
	}
</script>

<div class="flex min-h-screen items-center justify-center bg-black p-4 font-mono">
	<div class="border-dash-border w-full max-w-md rounded-lg border bg-[#111] p-10 shadow-2xl">
		<div class="mb-10 text-center">
			<h1 class="font-retro text-dash-amber text-4xl tracking-widest uppercase">Login</h1>
		</div>

		<form onsubmit={handleLogin} class="space-y-8">
			<div class="space-y-2">
				<label for="email" class="text-dash-text block text-xs font-bold tracking-wider uppercase"
					>Email Address</label
				>
				<input
					id="email"
					name="email"
					type="email"
					required
					bind:value={email}
					class="border-dash-border focus:border-dash-amber focus:ring-dash-amber/20 h-12 w-full rounded border bg-[#0a0a0a] px-4 text-sm text-stone-300 transition-all outline-none placeholder:text-stone-800 focus:ring-1"
					placeholder="OPERATOR@SYSTEM.NET"
				/>
			</div>

			<div class="space-y-2">
				<label
					for="password"
					class="text-dash-text block text-xs font-bold tracking-wider uppercase">Passcode</label
				>
				<input
					id="password"
					name="password"
					type="password"
					required
					bind:value={password}
					class="border-dash-border focus:border-dash-amber focus:ring-dash-amber/20 h-12 w-full rounded border bg-[#0a0a0a] px-4 text-sm text-stone-300 transition-all outline-none placeholder:text-stone-800 focus:ring-1"
					placeholder="••••••••"
				/>
			</div>

			{#if error}
				<div class="border-dash-red/50 bg-dash-red/10 border-l-2 p-3">
					<p class="text-dash-red text-xs uppercase">Error: {error}</p>
				</div>
			{/if}

			<button
				type="submit"
				disabled={isLoading}
				class="bg-dash-amber hover:bg-dash-amber/90 text-dash-bg h-12 w-full rounded text-sm font-bold tracking-wider uppercase transition-all hover:shadow-[0_0_15px_rgba(220,165,76,0.4)] disabled:opacity-50"
			>
				{isLoading ? 'Authenticating...' : 'Authenticate'}
			</button>
		</form>
	</div>
</div>
