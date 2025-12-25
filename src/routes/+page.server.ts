import type { PageServerLoad } from './$types';
import {
    getTrendingMovies,
    getFeaturedMovie,
    getClassics,
    getTopRated,
    getNewReleases,
    getActionMovies,
    getComedyMovies
} from '$lib/server/tmdb';

export const load: PageServerLoad = async () => {
    const [featured, trending, classics, topRated, newReleases, action, comedy] = await Promise.all([
        getFeaturedMovie(),
        getTrendingMovies(),
        getClassics(),
        getTopRated(),
        getNewReleases(),
        getActionMovies(),
        getComedyMovies()
    ]);

    return {
        featured,
        trending,
        classics,
        topRated,
        newReleases,
        action,
        comedy
    };
};
