import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { BackendClient } from '$lib/backend';

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.token) return json({ error: 'Unauthorized' }, { status: 401 });

	try {
		const body = await request.json();
		// Validation could go here

		const client = new BackendClient(locals.token);
		await client.updateHistory(body);

		return json({ message: 'History updated' });
	} catch (e: any) {
		console.error('History update failed', e);
		return json({ error: e.message }, { status: 500 });
	}
};
