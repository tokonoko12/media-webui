import { json } from '@sveltejs/kit';
import { getSeriesDetails, getEpisodeStreams } from '$lib/server/tmdb';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params }) => {
    const { id, season, episode } = params;

    if (!id || !season || !episode) {
        return json({ streams: null }, { status: 400 });
    }

    try {
        // 1. Get Series Details to retrieve IMDB ID
        // Note: In an ideal world we might cache this or pass it from client, 
        // but fetching details is fast and ensures we have the correct ID.
        const series = await getSeriesDetails(id);

        if (!series || !series.imdb_id) {
            console.error(`No IMDB ID found for series ${id}`);
            return json({ streams: null }, { status: 404 });
        }

        // 2. Fetch Streams
        const streams = await getEpisodeStreams(series.imdb_id, parseInt(season), parseInt(episode));

        return json({ streams });
    } catch (error) {
        console.error('Error fetching episode streams:', error);
        return json({ streams: null }, { status: 500 });
    }
};
