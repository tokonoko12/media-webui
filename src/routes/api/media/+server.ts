import { json } from '@sveltejs/kit';
import { getMovies, getSeries } from '$lib/server/tmdb';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url }) => {
    const type = url.searchParams.get('type'); // 'movie' or 'tv'
    const page = Number(url.searchParams.get('page')) || 1;
    const category = url.searchParams.get('category') || undefined;
    const genre = url.searchParams.get('genre') || undefined;

    if (!type) {
        return json({ error: 'Missing type parameter' }, { status: 400 });
    }

    let result;
    if (type === 'movie') {
        result = await getMovies(page, category, genre);
    } else if (type === 'tv') {
        result = await getSeries(page, category, genre);
    } else {
        return json({ error: 'Invalid type parameter' }, { status: 400 });
    }

    return json(result);
};
