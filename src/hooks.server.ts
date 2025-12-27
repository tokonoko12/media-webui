import { redirect, type Handle } from '@sveltejs/kit';

const publicRoutes = ['/login'];

export const handle: Handle = async ({ event, resolve }) => {
	const token = event.cookies.get('session');

	if (token) {
		event.locals.token = token;
	}

	if (!event.locals.token && !publicRoutes.includes(event.url.pathname)) {
		throw redirect(303, '/login');
	}

	const response = await resolve(event);
	return response;
};
