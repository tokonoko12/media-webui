import type { PageServerLoad } from './$types';
import { getSeries } from '$lib/server/tmdb';

export const load: PageServerLoad = async ({ url }) => {
    const page = Number(url.searchParams.get('page')) || 1;
    const category = url.searchParams.get('cat') || undefined;
    const genre = url.searchParams.get('genre') || undefined;

    // If specific filter/page is active, return "Detail" mode.
    if (category || genre || page > 1) {
        const { results, total_pages } = await getSeries(page, category, genre);
        return {
            mode: 'detail',
            series: results,
            currentPage: page,
            totalPages: total_pages > 500 ? 500 : total_pages,
            category,
            genre
        };
    }

    // Otherwise, return "Index" mode (Genre Sections)
    const [popular, actionAdventure, comedy, scifiFantasy, drama] = await Promise.all([
        getSeries(1), // Popular
        getSeries(1, undefined, '10759'), // Action & Adventure
        getSeries(1, undefined, '35'),    // Comedy
        getSeries(1, undefined, '10765'), // Sci-Fi & Fantasy
        getSeries(1, undefined, '18')     // Drama
    ]);

    return {
        mode: 'index',
        sections: [
            { title: 'POPULAR SERIES', link: '/series?cat=popular', data: popular.results.slice(0, 4) },
            { title: 'ACTION & ADVENTURE', link: '/series?genre=10759', data: actionAdventure.results.slice(0, 4) },
            { title: 'COMEDY', link: '/series?genre=35', data: comedy.results.slice(0, 4) },
            { title: 'SCI-FI & FANTASY', link: '/series?genre=10765', data: scifiFantasy.results.slice(0, 4) },
            { title: 'DRAMA', link: '/series?genre=18', data: drama.results.slice(0, 4) }
        ]
    };
};
