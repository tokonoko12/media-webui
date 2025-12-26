import { getMovieDetails, getProStreams } from '$lib/server/tmdb';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params }) => {
    const { id } = params;
    if (!id) return json({ error: 'Missing ID' }, { status: 400 });

    try {
        const movie = await getMovieDetails(id);
        if (!movie || !movie.imdb_id) {
            return json({ error: 'Movie not found or missing IMDb ID' }, { status: 404 });
        }

        console.log(`[API] Fetching streams for Movie ${id} (IMDb: ${movie.imdb_id})`);
        const streams = await getProStreams(movie.imdb_id, 'movie');

        return json(streams || {});
    } catch (e) {
        console.error(`[API] Error fetching streams for movie ${id}:`, e);
        return json({ error: 'Internal Server Error' }, { status: 500 });
    }
};
