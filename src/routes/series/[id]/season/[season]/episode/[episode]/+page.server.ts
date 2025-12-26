import type { PageServerLoad } from './$types';
import { getSeriesDetails, getSeasonDetails, getEpisodeStreams, getProStreams } from '$lib/server/tmdb';

export const load: PageServerLoad = async ({ params }) => {
    const { id, season, episode } = params;
    const seasonNum = parseInt(season);
    const episodeNum = parseInt(episode);

    const series = await getSeriesDetails(id);

    // We need episode details. We can fetch the season and find it.
    // This is efficient enough and gives us context if we want to show other episodes later.
    const seasonEpisodes = await getSeasonDetails(id, seasonNum);
    const episodeDetails = seasonEpisodes.find(e => e.episode_number === episodeNum);

    let streams = null;
    if (series?.imdb_id) {
        console.log(`[EpisodePage] Fetching streams for IMDB: ${series.imdb_id} S${seasonNum} E${episodeNum}`);
        streams = await getEpisodeStreams(series.imdb_id, seasonNum, episodeNum);
        console.log(`[EpisodePage] Streams response:`, JSON.stringify(streams, null, 2));
    } else {
        console.warn(`[EpisodePage] No IMDB ID found for series ${id}`);
    }

    return {
        series,
        episode: episodeDetails,
        streams,
        seasonNumber: seasonNum,
        episodeNumber: episodeNum
    };
};
