export interface Episode {
	id: number;
	name: string;
	overview: string;
	still_path: string;
	air_date: string;
	vote_average: number;
	episode_number: number;
	season_number: number;
}

export interface Season {
	id: number;
	name: string;
	overview: string;
	poster_path: string;
	air_date: string;
	season_number: number;
	episode_count: number;
}

export interface Movie {
	id: number;
	title: string;
	overview: string;
	poster_path: string;
	backdrop_path: string;
	release_date: string;
	vote_average: number;
	genres: string[] | { id: number; name: string }[];
	media_type?: 'movie' | 'tv' | 'series';
	imdb_id?: string;
	seasons?: Season[];
	// Extended Details
	status?: string;
	tagline?: string;
	runtime?: number;
	budget?: number;
	revenue?: number;
	production_companies?: { id: number; name: string; logo_path: string | null }[];
	networks?: { id: number; name: string; logo_path: string | null }[];
}

export const featuredMovie: Movie = {
	id: 1,
	title: 'Blade Runner 2049',
	overview:
		"Young Blade Runner K's discovery of a long-buried secret leads him to track down former Blade Runner Rick Deckard, who's been missing for thirty years.",
	poster_path: 'https://image.tmdb.org/t/p/w500/gajva2L0rPYkEWjzgFlBXCAVBE5.jpg',
	backdrop_path: 'https://image.tmdb.org/t/p/original/ilRyQw60nwTvJmQwOT5FHZ5U13o.jpg', // Using a real TMDB image URL for demo
	release_date: '2017-10-04',
	vote_average: 7.5,
	genres: ['Sci-Fi', 'Thriller', 'Drama']
};

export const trendingMovies: Movie[] = [
	{
		id: 2,
		title: 'Dune: Part Two',
		overview:
			'Follow the mythic journey of Paul Atreides as he unites with Chani and the Fremen while on a warpath of revenge against the conspirators who destroyed his family.',
		poster_path: 'https://image.tmdb.org/t/p/w500/1pdfLvkbY9ohJlCjQH2CZjjYVvJ.jpg',
		backdrop_path: 'https://image.tmdb.org/t/p/original/xOMo8BRK7PfcJv9JCnx7s5hj0PX.jpg',
		release_date: '2024-02-27',
		vote_average: 8.3,
		genres: ['Sci-Fi', 'Adventure']
	},
	{
		id: 3,
		title: 'Civil War',
		overview:
			'In the near future, a group of war journalists attempt to survive while reporting the truth as the United States stands on the brink of civil war.',
		poster_path: 'https://image.tmdb.org/t/p/w500/sh7Rg8Er3tFcN9BpKIPOMvALgZd.jpg',
		backdrop_path: 'https://image.tmdb.org/t/p/original/z121dSTR7PY9KxKuvwiIFSYW8cf.jpg',
		release_date: '2024-04-10',
		vote_average: 7.1,
		genres: ['War', 'Action', 'Drama']
	},
	{
		id: 4,
		title: 'The Creator',
		overview:
			'Amid a future war between the human race and the forces of artificial intelligence, a hardened ex-special forces agent grieving the disappearance of his wife, is recruited to hunt down and kill the Creator, the elusive architect of advanced AI who has developed a mysterious weapon with the power to end the war… and mankind itself.',
		poster_path: 'https://image.tmdb.org/t/p/w500/vBZ0qvaRxqEhZwl6LWmruJqWE8Z.jpg',
		backdrop_path: 'https://image.tmdb.org/t/p/original/kjQBrc00fB2RjHZB3PGR4k9ibnj.jpg',
		release_date: '2023-09-27',
		vote_average: 7.1,
		genres: ['Sci-Fi', 'Action', 'Thriller']
	},
	{
		id: 5,
		title: 'Tron: Legacy',
		overview:
			"Sam Flynn, the tech-savvy and daring son of Kevin Flynn, investigates his father's disappearance and is pulled into The Grid, a digital world of fierce gladiatorial games and cybernetic programs.",
		poster_path: 'https://image.tmdb.org/t/p/w500/bdH8tHuv7QvU9Sbd5L4Y82F8C8H.jpg',
		backdrop_path: 'https://image.tmdb.org/t/p/original/bF8A98y8w3c1bZ6s1w7sV1w8f7a.jpg',
		release_date: '2010-12-10',
		vote_average: 6.8,
		genres: ['Sci-Fi', 'Action', 'Adventure']
	}
];

export const retroClassics: Movie[] = [
	{
		id: 6,
		title: 'Akira',
		overview:
			'A secret military project endangers Neo-Tokyo when it turns a biker gang member into a rampaging psychic psychopath that only two veterans and a group of psychics can stop.',
		poster_path: 'https://image.tmdb.org/t/p/w500/neZ0YEAXzG7lf9B7sW1k6E6sK5.jpg',
		backdrop_path: 'https://image.tmdb.org/t/p/original/5lV5M2tj7u3B7w8z2w3w8.jpg',
		release_date: '1988-07-16',
		vote_average: 8.0,
		genres: ['Animation', 'Sci-Fi', 'Action']
	},
	{
		id: 7,
		title: 'Ghost in the Shell',
		overview:
			"In the year 2029, the barriers of our world have been broken down by the net and by cybernetics, but this brings new vulnerability to humans in the form of brain-hacking. When a highly-wanted hacker known as 'The Puppet Master' begins involving them in politics, Section 9, a group of cybernetically enhanced cops, are called in to investigate and stop the Puppet Master.",
		poster_path: 'https://image.tmdb.org/t/p/w500/9gC44ImY4Zclomk1eY5c9Z8c8.jpg',
		backdrop_path: 'https://image.tmdb.org/t/p/original/w7RDIgQM6bLT7JXtH4i4e4k2b.jpg',
		release_date: '1995-11-18',
		vote_average: 8.0,
		genres: ['Animation', 'Sci-Fi', 'Action']
	}
];
