import type { PageServerLoad } from './$types';
import { getSeriesDetails, getSeasonDetails } from '$lib/server/tmdb';

export const load: PageServerLoad = async ({ params }) => {
    const { id, season, episode } = params;
    const seasonNum = parseInt(season);
    const episodeNum = parseInt(episode);

    const series = await getSeriesDetails(id);

    // We need episode details. We can fetch the season and find it.
    // This is efficient enough and gives us context if we want to show other episodes later.
    const seasonEpisodes = await getSeasonDetails(id, seasonNum);
    const episodeDetails = seasonEpisodes.find((e: any) => e.episode_number === episodeNum);



    return {
        series,
        episode: episodeDetails,

        seasonNumber: seasonNum,
        episodeNumber: episodeNum
    };
};
