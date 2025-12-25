import type { PageServerLoad } from './$types';
import { searchMulti } from '$lib/server/tmdb';

export const load: PageServerLoad = async ({ url }) => {
    const query = url.searchParams.get('q');
    const page = Number(url.searchParams.get('page')) || 1;

    if (!query) {
        return {
            query: '',
            results: [],
            currentPage: 1,
            totalPages: 0
        };
    }

    const { results, total_pages } = await searchMulti(query, page);

    return {
        query,
        results,
        currentPage: page,
        totalPages: total_pages > 500 ? 500 : total_pages // TMDB limit
    };
};
