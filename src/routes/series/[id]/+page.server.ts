import type { PageServerLoad } from './$types';
import { getSeriesDetails, getCredits, getRecommendations, getVideos } from '$lib/server/tmdb';
import { error } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ params }) => {
    const { id } = params;

    const [series, cast, recommendations, videos] = await Promise.all([
        getSeriesDetails(id),
        getCredits(id, 'tv'),
        getRecommendations(id, 'tv'),
        getVideos(id, 'tv')
    ]);

    if (!series) {
        throw error(404, 'Series transmission lost');
    }

    const trailer = videos.find((v: any) => v.type === 'Trailer' && v.site === 'YouTube') ||
        videos.find((v: any) => v.site === 'YouTube');

    return {
        series,
        cast,
        recommendations,
        trailer: trailer ? trailer.key : null
    };
};
