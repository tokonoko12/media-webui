import { PUBLIC_BACKEND_URL } from '$env/static/public';

export const BACKEND_URL = PUBLIC_BACKEND_URL;

export interface User {
	id: number;
	username: string;
	email: string;
	full_name?: string;
}

export interface Session {
	access_token: string;
}

export interface AuthResponse {
	message: string;
	user: User;
	session?: Session;
}

export interface Stream {
	name: string;
	url: string;
	quality: string;
	size?: string;
}

export interface WatchlistItem {
	id: string; // The backend ID (string)
	tmdb_id: number;
	media_type: 'movie' | 'series';
	title?: string;
	name?: string;
	poster_path?: string;
	backdrop_path?: string;
	overview?: string;
	release_date?: string;
	first_air_date?: string;
	vote_average?: number;
	added_at?: string;
}

export interface WatchHistoryItem {
	media_id: string;
	media_type: 'movie' | 'series';
	progress: number;
	duration: number;
	season?: number;
	episode?: number;
	last_watched_at?: string;
}

export interface PaginatedResponse<T> {
	page: number;
	total_pages: number;
	total_results: number;
	[key: string]: any; // Allow for 'results', 'watchlist', 'history' keys
}

export class BackendClient {
	private token: string | null = null;

	constructor(token?: string) {
		if (token) {
			this.token = token;
		} else if (typeof document !== 'undefined') {
			// Client-side: try to get token from cookie
			const match = document.cookie.match(new RegExp('(^| )session=([^;]+)'));
			if (match) {
				this.token = match[2];
			}
		}
	}

	private async request<T>(
		endpoint: string,
		method: string = 'GET',
		body?: any,
		customToken?: string
	): Promise<T> {
		const headers: HeadersInit = {
			'Content-Type': 'application/json'
		};

		const t = customToken || this.token;
		if (t) {
			headers['Authorization'] = `Bearer ${t}`;
		}

		console.log(`[Backend] ${method} ${endpoint}`);

		const url = endpoint.startsWith('http') ? endpoint : `${BACKEND_URL}${endpoint}`;

		const res = await fetch(url, {
			method,
			headers,
			body: body ? JSON.stringify(body) : undefined
		});

		if (!res.ok) {
			const err = await res.json().catch(() => ({ message: 'Unknown error' }));
			throw new Error(err.message || `API Error: ${res.status}`);
		}

		return res.json();
	}

	// Auth
	async register(data: any): Promise<AuthResponse> {
		return this.request('/auth/register', 'POST', data);
	}

	async login(data: any): Promise<AuthResponse> {
		return this.request('/auth/login', 'POST', data);
	}

	async logout(): Promise<{ message: string }> {
		return this.request('/auth/logout', 'POST');
	}

	async getMe(): Promise<{ user: User }> {
		return this.request('/auth/me');
	}

	// Watchlist
	async getWatchlist(
		page: number = 1,
		limit: number = 20
	): Promise<PaginatedResponse<{ watchlist: WatchlistItem[] }>> {
		const params = new URLSearchParams({
			page: page.toString(),
			limit: limit.toString()
		});
		return this.request(`/watchlist?${params.toString()}`);
	}

	async addToWatchlist(item: {
		media_id: string;
		media_type: string;
	}): Promise<{ message: string; item: WatchlistItem }> {
		return this.request('/watchlist', 'POST', item);
	}

	async removeFromWatchlist(mediaId: string): Promise<{ message: string }> {
		return this.request(`/watchlist/${mediaId}`, 'DELETE');
	}

	// History
	async getHistory(
		page: number = 1,
		limit: number = 20
	): Promise<PaginatedResponse<{ history: WatchHistoryItem[] }>> {
		const params = new URLSearchParams({
			page: page.toString(),
			limit: limit.toString()
		});
		return this.request(`/history?${params.toString()}`);
	}

	async getHistoryItem(mediaId: string): Promise<{ history: WatchHistoryItem[] }> {
		return this.request(`/history/${mediaId}`);
	}

	async updateHistory(data: {
		media_id: string;
		media_type: string;
		progress: number;
		duration: number;
		season?: number;
		episode?: number;
	}): Promise<{ message: string }> {
		return this.request('/history', 'POST', data);
	}

	// Streams
	// Catalog
	async getHomeCatalog(): Promise<any> {
		return this.request('/catalog/home');
	}

	async getMoviesCatalog(): Promise<any> {
		return this.request('/catalog/movies');
	}

	async getSeriesCatalog(): Promise<any> {
		return this.request('/catalog/series');
	}

	// Details
	async getMovieDetails(tmdbId: string): Promise<any> {
		return this.request(`/details/movies/${tmdbId}`);
	}

	async getSeriesDetails(tmdbId: string): Promise<any> {
		return this.request(`/details/series/${tmdbId}`);
	}

	async getSeasonDetails(tmdbId: string, seasonNumber: number): Promise<any> {
		return this.request(`/details/series/${tmdbId}/season/${seasonNumber}`);
	}

	// Streams
	async getStreams(url: string): Promise<Stream[]> {
		return this.request(url);
	}

	async resolveStream(url: string): Promise<any> {
		return this.request(url);
	}

	async getMovieStreams(id: string): Promise<Stream[]> {
		return this.request(`/streams/movies/${id}`);
	}

	async getSeriesStreams(id: string, season: number, episode: number): Promise<Stream[]> {
		return this.request(`/streams/series/${id}/${season}/${episode}`);
	}

	// Search
	async search(query: string, page: number = 1): Promise<PaginatedResponse<{ results: any[] }>> {
		const params = new URLSearchParams({
			q: query,
			page: page.toString()
		});
		return this.request(`/search?${params.toString()}`);
	}
}
