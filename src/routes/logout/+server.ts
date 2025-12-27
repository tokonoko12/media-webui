import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { BackendClient } from '$lib/backend';

export const POST: RequestHandler = async ({ cookies, locals }) => {
	const token = cookies.get('session');

	if (token) {
		try {
			const client = new BackendClient(token);
			await client.logout();
		} catch (e) {
			console.error('Logout error:', e);
		}
	}

	cookies.delete('session', { path: '/' });
	locals.token = undefined;
	locals.user = undefined;

	redirect(303, '/login');
};
