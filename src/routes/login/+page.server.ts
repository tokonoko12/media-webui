import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { BackendClient } from '$lib/backend';

export const load: PageServerLoad = async ({ locals }) => {
	if (locals.user || locals.token) {
		redirect(303, '/');
	}
};

// Actions removed in favor of client-side fetch
