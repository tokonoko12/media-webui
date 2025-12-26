import { getSeriesDetails, getEpisodeStreams } from '$lib/server/tmdb';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params }) => {
    const { id, season, episode } = params;
    if (!id || !season || !episode) return json({ error: 'Missing parameters' }, { status: 400 });

    try {
        const series = await getSeriesDetails(id);
        if (!series || !series.imdb_id) {
            return json({ error: 'Series not found or missing IMDb ID' }, { status: 404 });
        }

        const seasonNum = parseInt(season);
        const episodeNum = parseInt(episode);

        console.log(
            `[API] Fetching streams for Series ${id} (IMDb: ${series.imdb_id}) S${seasonNum} E${episodeNum}`
        );
        const streams = await getEpisodeStreams(series.imdb_id, seasonNum, episodeNum);

        return json(streams || {});
    } catch (e) {
        console.error(`[API] Error fetching streams for series ${id}:`, e);
        return json({ error: 'Internal Server Error' }, { status: 500 });
    }
};
