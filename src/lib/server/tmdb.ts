import { TMDB_API_KEY } from '$env/static/private';
import type { Movie } from '$lib/data';

const BASE_URL = 'https://api.themoviedb.org/3';

async function fetchFromTMDB(endpoint: string, params: Record<string, string> = {}) {
    const url = new URL(`${BASE_URL}${endpoint}`);
    url.searchParams.append('api_key', TMDB_API_KEY);

    for (const [key, value] of Object.entries(params)) {
        url.searchParams.append(key, value);
    }

    const response = await fetch(url.toString());

    if (!response.ok) {
        console.error(`TMDB API Error: ${response.status} ${response.statusText}`);
        return null;
    }

    return response.json();
}

// Helper to map TMDB result to our Movie interface
function mapMovie(tmdbMovie: any, mediaType?: 'movie' | 'tv'): Movie {
    const movie: Movie = {
        id: tmdbMovie.id,
        title: tmdbMovie.title || tmdbMovie.name, // Support TV somewhat
        overview: tmdbMovie.overview,
        poster_path: tmdbMovie.poster_path ? `https://image.tmdb.org/t/p/w500${tmdbMovie.poster_path}` : '',
        backdrop_path: tmdbMovie.backdrop_path ? `https://image.tmdb.org/t/p/original${tmdbMovie.backdrop_path}` : '',
        release_date: tmdbMovie.release_date || tmdbMovie.first_air_date || 'N/A',
        vote_average: tmdbMovie.vote_average,
        genres: [], // We won't fetch genres for every item to save calls, mocking or generic
        media_type: mediaType || tmdbMovie.media_type || 'movie', // Default to movie if unknown
        imdb_id: tmdbMovie.imdb_id || tmdbMovie.external_ids?.imdb_id, // Important for stream fetching
        // Extended Details
        status: tmdbMovie.status,
        tagline: tmdbMovie.tagline,
        runtime: tmdbMovie.runtime || tmdbMovie.episode_run_time?.[0], // Episode run time is array
        budget: tmdbMovie.budget,
        revenue: tmdbMovie.revenue,
        production_companies: tmdbMovie.production_companies,
        networks: tmdbMovie.networks
    };

    if (tmdbMovie.seasons) {
        movie.seasons = tmdbMovie.seasons.map((s: any) => ({
            id: s.id,
            name: s.name,
            overview: s.overview,
            poster_path: s.poster_path ? `https://image.tmdb.org/t/p/w500${s.poster_path}` : '',
            air_date: s.air_date,
            season_number: s.season_number,
            episode_count: s.episode_count
        })).filter((s: any) => s.season_number > 0); // Filter out "Specials" (season 0) usually
    }

    return movie;
}

function mapEpisode(tmdbEpisode: any) {
    return {
        id: tmdbEpisode.id,
        name: tmdbEpisode.name,
        overview: tmdbEpisode.overview,
        still_path: tmdbEpisode.still_path ? `https://image.tmdb.org/t/p/w500${tmdbEpisode.still_path}` : '',
        air_date: tmdbEpisode.air_date,
        vote_average: tmdbEpisode.vote_average,
        episode_number: tmdbEpisode.episode_number,
        season_number: tmdbEpisode.season_number
    };
}

export async function getSeasonDetails(id: string, seasonNumber: number) {
    const data = await fetchFromTMDB(`/tv/${id}/season/${seasonNumber}`);
    return data?.episodes?.map(mapEpisode) || [];
}

export async function getTrendingMovies() {
    const data = await fetchFromTMDB('/trending/movie/day');
    return data?.results.slice(0, 10).map((m: any) => mapMovie(m, 'movie')) || [];
}

export async function getFeaturedMovie() {
    // Get popular movies and pick a random one from top 5 for variety
    const data = await fetchFromTMDB('/movie/popular');
    if (!data?.results?.length) return null;
    const randomIndex = Math.floor(Math.random() * 5);
    const movie = data.results[randomIndex];

    // Fetch details to get better info if needed (like genres), but for now map basic
    const mapped = mapMovie(movie, 'movie');
    // Add some fake genres since list only gives IDs
    mapped.genres = ["Sci-Fi", "Action"];
    return mapped;
}

export async function getClassics() {
    const data = await fetchFromTMDB('/discover/movie', {
        'primary_release_date.lte': '2000-01-01',
        'sort_by': 'vote_average.desc',
        'vote_count.gte': '1000',
        'with_genres': '878' // Sci-Fi ID for that retro feel
    });
    return data?.results.slice(0, 8).map((m: any) => mapMovie(m, 'movie')) || [];
}

export async function getTopRated() {
    const data = await fetchFromTMDB('/movie/top_rated');
    return data?.results.slice(0, 8).map((m: any) => mapMovie(m, 'movie')) || [];
}

export async function getNewReleases() {
    const data = await fetchFromTMDB('/movie/now_playing');
    return data?.results.slice(0, 8).map((m: any) => mapMovie(m, 'movie')) || [];
}

export async function getActionMovies() {
    const data = await fetchFromTMDB('/discover/movie', {
        with_genres: '28',
        sort_by: 'popularity.desc'
    });
    return data?.results.slice(0, 8).map((m: any) => mapMovie(m, 'movie')) || [];
}

export async function getComedyMovies() {
    const data = await fetchFromTMDB('/discover/movie', {
        with_genres: '35',
        sort_by: 'popularity.desc'
    });
    return data?.results.slice(0, 8).map((m: any) => mapMovie(m, 'movie')) || [];
}

// Generic Discovery for Movies
export async function getMovies(page: number = 1, category?: string, genre?: string) {
    let endpoint = '/discover/movie';
    const params: Record<string, string> = {
        page: page.toString(),
        sort_by: 'popularity.desc'
    };

    if (category === 'top') {
        endpoint = '/movie/top_rated';
    } else if (category === 'new') {
        endpoint = '/movie/now_playing';
    } else if (category === 'trending') {
        // Trending endpoint doesn't support generic filtering well with discover params in same way, 
        // but for listing page we might want /trending/movie/week
        endpoint = '/trending/movie/week';
    }

    if (genre) {
        endpoint = '/discover/movie'; // Force discover if genre is present, as mostly categories don't support genre filtering directly
        params['with_genres'] = genre;
    }

    // If it's retro category
    if (category === 'retro') {
        endpoint = '/discover/movie';
        params['primary_release_date.lte'] = '2000-01-01';
        params['sort_by'] = 'vote_average.desc';
        params['vote_count.gte'] = '500';
    }

    const data = await fetchFromTMDB(endpoint, params);

    return {
        results: data?.results?.map((m: any) => mapMovie(m, 'movie')) || [],
        total_pages: data?.total_pages || 1
    };
}

// Generic Discovery for Series
export async function getSeries(page: number = 1, category?: string, genre?: string) {
    let endpoint = '/discover/tv';
    const params: Record<string, string> = {
        page: page.toString(),
        sort_by: 'popularity.desc'
    };

    if (category === 'top') {
        endpoint = '/tv/top_rated';
    } else if (category === 'new') {
        endpoint = '/tv/on_the_air';
    } else if (category === 'trending') {
        endpoint = '/trending/tv/week';
    }

    if (genre) {
        endpoint = '/discover/tv';
        params['with_genres'] = genre;
    }

    const data = await fetchFromTMDB(endpoint, params);

    return {
        results: data?.results?.map((m: any) => mapMovie(m, 'tv')) || [], // Reuse mapMovie since it handles name/title
        total_pages: data?.total_pages || 1
    };
}

// Multi-Search (Movies + TV)
export async function searchMulti(query: string, page: number = 1) {
    const data = await fetchFromTMDB('/search/multi', {
        query,
        page: page.toString(),
        include_adult: 'false'
    });

    if (!data?.results) return { results: [], total_pages: 0 };

    // Filter out 'person' results and map to our Movie interface
    const filtered = data.results
        .filter((item: any) => item.media_type === 'movie' || item.media_type === 'tv')
        .map((m: any) => mapMovie(m)); // Will use item.media_type

    return {
        results: filtered,
        total_pages: data.total_pages
    };
}

// Fetch Details
export async function getMovieDetails(id: string) {
    const data = await fetchFromTMDB(`/movie/${id}`);
    return data ? mapMovie(data, 'movie') : null;
}

export async function getSeriesDetails(id: string) {
    const data = await fetchFromTMDB(`/tv/${id}?append_to_response=external_ids`);
    return data ? mapMovie(data, 'tv') : null;
}

// Fetch Cast/Credits
export async function getCredits(id: string, type: 'movie' | 'tv' = 'movie') {
    const data = await fetchFromTMDB(`/${type}/${id}/credits`);
    return data?.cast?.slice(0, 10).map((c: any) => ({
        name: c.name,
        character: c.character,
        profile_path: c.profile_path ? `https://image.tmdb.org/t/p/w200${c.profile_path}` : ''
    })) || [];
}

// Fetch Recommendations
export async function getRecommendations(id: string, type: 'movie' | 'tv' = 'movie') {
    const data = await fetchFromTMDB(`/${type}/${id}/recommendations`);
    return data?.results?.slice(0, 6).map((m: any) => mapMovie(m, type)) || [];
}

export async function getVideos(id: string, type: 'movie' | 'tv' = 'movie') {
    const data = await fetchFromTMDB(`/${type}/${id}/videos`);
    return data?.results || [];
}

export async function getProStreams(imdbId: string | undefined, type: 'movie' | 'tv' = 'movie') {
    if (!imdbId) return null;
    try {
        // Only movie support documented by user, but assuming structure is typical /movies/<id>
        // User only gave example for movies. For now implementing for movies.
        if (type !== 'movie') return null;

        // const res = await fetch(`https://mediaapi.mitserve.fun/movies/${imdbId}`);
        const res = await fetch(`https://mediaapi.mitserve.fun/movies/${imdbId}`);

        if (!res.ok) return null;
        return await res.json();
    } catch (e) {
        console.error('Stream API Error:', e);
        return null;
    }
}

export async function getEpisodeStreams(imdbId: string | undefined, season: number, episode: number) {
    if (!imdbId) return null;
    try {
        const res = await fetch(`https://mediaapi.mitserve.fun/series/${imdbId}/${season}/${episode}`);
        if (!res.ok) return null;
        return await res.json();
    } catch (e) {
        console.error('Episode Stream API Error:', e);
        return null;
    }
}
