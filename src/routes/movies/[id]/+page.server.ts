import type { PageServerLoad } from './$types';
import { getMovieDetails, getCredits, getRecommendations, getVideos, getProStreams } from '$lib/server/tmdb';
import { error } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ params }) => {
    const { id } = params;

    const movie = await getMovieDetails(id);

    if (!movie) {
        throw error(404, 'Movie not found in sector');
    }

    const [cast, recommendations, videos] = await Promise.all([
        getCredits(id, 'movie'),
        getRecommendations(id, 'movie'),
        getVideos(id, 'movie')
    ]);

    let streams = null;
    console.log(`[StreamFetch] Movie ID: ${id}, IMDb ID: ${movie.imdb_id}`);

    if (movie.imdb_id) {
        try {
            console.log(`[StreamFetch] Fetching from API...`);
            streams = await getProStreams(movie.imdb_id, 'movie');
            console.log(`[StreamFetch] Success. Stream keys: ${streams ? Object.keys(streams?.streams || {}) : 'null'}`);
        } catch (e) {
            console.error('[StreamFetch] Failed to fetch streams:', e);
            // Non-critical, continue without streams
        }
    } else {
        console.warn('[StreamFetch] No IMDb ID found for this movie.');
    }

    // Find official trailer
    const trailer = videos.find((v: any) => v.type === 'Trailer' && v.site === 'YouTube')?.key;

    return {
        movie,
        cast,
        recommendations,
        trailer,
        streams
    };
};
