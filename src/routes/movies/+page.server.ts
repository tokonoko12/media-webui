import type { PageServerLoad } from './$types';
import { getMovies } from '$lib/server/tmdb';

export const load: PageServerLoad = async ({ url }) => {
    const page = Number(url.searchParams.get('page')) || 1;
    const category = url.searchParams.get('cat') || undefined;
    const genre = url.searchParams.get('genre') || undefined;

    // If specific filter/page is active, return "Detail" mode (Single Grid)
    if (category || genre || page > 1) {
        const { results, total_pages } = await getMovies(page, category, genre);
        return {
            mode: 'detail',
            movies: results,
            currentPage: page,
            totalPages: total_pages > 500 ? 500 : total_pages,
            category,
            genre
        };
    }

    // Otherwise, return "Index" mode (Genre Sections)
    // Fetch a mix of genres for the listing page
    const [popular, action, comedy, scifi, horror, animation] = await Promise.all([
        getMovies(1), // Popular/Default
        getMovies(1, undefined, '28'),  // Action
        getMovies(1, undefined, '35'),  // Comedy
        getMovies(1, undefined, '878'), // Sci-Fi
        getMovies(1, undefined, '27'),  // Horror
        getMovies(1, undefined, '16')   // Animation
    ]);

    return {
        mode: 'index',
        sections: [
            { title: 'POPULAR MOVIES', link: '/movies?cat=popular', data: popular.results.slice(0, 4) },
            { title: 'ACTION', link: '/movies?genre=28', data: action.results.slice(0, 4) },
            { title: 'COMEDY', link: '/movies?genre=35', data: comedy.results.slice(0, 4) },
            { title: 'SCI-FI', link: '/movies?genre=878', data: scifi.results.slice(0, 4) },
            { title: 'HORROR', link: '/movies?genre=27', data: horror.results.slice(0, 4) },
            { title: 'ANIMATION', link: '/movies?genre=16', data: animation.results.slice(0, 4) }
        ]
    };
};
