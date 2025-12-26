import type { PageServerLoad } from './$types';
import { getMovieDetails, getCredits, getRecommendations, getVideos } from '$lib/server/tmdb';
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



    // Find official trailer
    const trailer = videos.find((v: any) => v.type === 'Trailer' && v.site === 'YouTube')?.key;

    return {
        movie,
        cast,
        recommendations,
        trailer
    };
};
