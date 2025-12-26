import { json } from '@sveltejs/kit';
import { getSeasonDetails } from '$lib/server/tmdb';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params }) => {
    const { id, season_number } = params;

    if (!id || !season_number) {
        return json({ episodes: [] }, { status: 400 });
    }

    try {
        const episodes = await getSeasonDetails(id, parseInt(season_number));
        return json({ episodes });
    } catch (error) {
        console.error('Error fetching season details:', error);
        return json({ episodes: [] }, { status: 500 });
    }
};
