const API_BASE_URL = 'https://api.themoviedb.org/3';
const IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w500';
const BACKDROP_BASE_URL = 'https://image.tmdb.org/t/p/w1280';
const PROFILE_BASE_URL = 'https://image.tmdb.org/t/p/w185';

export const genres = {
  28: 'Action',
  12: 'Adventure',
  16: 'Animation',
  35: 'Comedy',
  80: 'Crime',
  99: 'Documentary',
  18: 'Drama',
  10751: 'Family',
  14: 'Fantasy',
  27: 'Horror',
  10402: 'Music',
  9648: 'Mystery',
  10749: 'Romance',
  878: 'Sci-Fi',
  53: 'Thriller',
  10752: 'War',
  37: 'Western',
};

const mapMovie = (movie) => ({
  id: movie.id,
  title: movie.title || movie.name,
  year: (movie.release_date || movie.first_air_date)?.slice(0, 4) ?? '—',
  rating: movie.vote_average?.toFixed(1) ?? '—',
  category: genres[movie.genre_ids?.[0]] ?? (movie.media_type === 'tv' ? 'TV Show' : 'Movie'),
  poster: movie.poster_path ? `${IMAGE_BASE_URL}${movie.poster_path}` : null,
  backdrop: movie.backdrop_path ? `${BACKDROP_BASE_URL}${movie.backdrop_path}` : null,
  overview: movie.overview || null,
  mediaType: movie.media_type || (movie.name ? 'tv' : 'movie'),
});

const getApiKey = () => {
  const apiKey = import.meta.env.VITE_TMDB_API_KEY;
  if (!apiKey) {
    throw new Error('Missing TMDB API key. Add VITE_TMDB_API_KEY to .env.local.');
  }
  return apiKey;
};

const fetchWithTimeout = async (url, options = {}) => {
  const { timeout = 10000, signal, ...rest } = options;
  
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  
  const onAbort = () => controller.abort();
  if (signal) {
    signal.addEventListener('abort', onAbort);
  }

  try {
    const response = await fetch(url, {
      ...rest,
      signal: controller.signal
    });
    clearTimeout(id);
    return response;
  } catch (err) {
    clearTimeout(id);
    throw err;
  } finally {
    if (signal) {
      signal.removeEventListener('abort', onAbort);
    }
  }
};

export const getPopularMovies = async (signal) => {
  const apiKey = getApiKey();

  const response = await fetchWithTimeout(
    `${API_BASE_URL}/movie/popular?language=en-US&page=1&api_key=${apiKey}`,
    { signal },
  );

  if (!response.ok) {
    throw new Error('Unable to load movies from TMDB.');
  }

  const { results } = await response.json();
  return results.filter((movie) => movie.poster_path).map(mapMovie);
};

export const getPopularTvShows = async (signal) => {
  const apiKey = getApiKey();

  const response = await fetchWithTimeout(
    `${API_BASE_URL}/tv/popular?language=en-US&page=1&api_key=${apiKey}`,
    { signal },
  );

  if (!response.ok) {
    throw new Error('Unable to load TV shows from TMDB.');
  }

  const { results } = await response.json();
  return results.filter((show) => show.poster_path).map(mapMovie);
};

export const getTrending = async (mediaType = 'all', timeWindow = 'day', signal) => {
  const apiKey = getApiKey();

  const response = await fetchWithTimeout(
    `${API_BASE_URL}/trending/${mediaType}/${timeWindow}?language=en-US&api_key=${apiKey}`,
    { signal },
  );

  if (!response.ok) {
    throw new Error('Unable to load trending items from TMDB.');
  }

  const { results } = await response.json();
  return results.filter((item) => item.poster_path).map(mapMovie);
};

export const searchMedia = async (query, signal) => {
  const apiKey = getApiKey();

  const response = await fetchWithTimeout(
    `${API_BASE_URL}/search/multi?query=${encodeURIComponent(query)}&include_adult=false&language=en-US&page=1&api_key=${apiKey}`,
    { signal },
  );

  if (!response.ok) {
    throw new Error('Unable to perform search.');
  }

  const { results } = await response.json();
  // Filter out people, only keep movies/tv with posters
  return results
    .filter((item) => (item.media_type === 'movie' || item.media_type === 'tv') && item.poster_path)
    .map(mapMovie);
};

export const getMovieDetails = async (movieId, mediaType = 'movie', signal) => {
  const apiKey = getApiKey();

  const response = await fetchWithTimeout(
    `${API_BASE_URL}/${mediaType}/${movieId}?language=en-US&api_key=${apiKey}`,
    { signal },
  );

  if (!response.ok) {
    throw new Error('Unable to load movie details.');
  }

  const data = await response.json();

  const formatCurrency = (val) =>
    val ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val) : null;

  const formatRuntime = (minutes) => {
    if (!minutes) return 'N/A';
    const hrs = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`;
  };

  return {
    id: data.id,
    title: data.title || data.name,
    originalTitle: data.original_title || data.original_name,
    tagline: data.tagline,
    overview: data.overview,
    poster: data.poster_path ? `${IMAGE_BASE_URL}${data.poster_path}` : null,
    backdrop: data.backdrop_path ? `${BACKDROP_BASE_URL}${data.backdrop_path}` : null,
    rating: data.vote_average?.toFixed(1) ?? '—',
    voteCount: data.vote_count ?? 0,
    releaseDate: data.release_date ?? data.first_air_date ?? '',
    year: (data.release_date || data.first_air_date)?.slice(0, 4) ?? '—',
    runtime: formatRuntime(data.runtime || (data.episode_run_time ? data.episode_run_time[0] : 0)),
    status: data.status ?? 'Released',
    budget: formatCurrency(data.budget),
    revenue: formatCurrency(data.revenue),
    genres: data.genres?.map((g) => g.name) ?? [],
    category: data.genres?.[0]?.name ?? (mediaType === 'tv' ? 'TV Show' : 'Movie'),
    productionCompanies: data.production_companies?.map((c) => c.name) ?? [],
    homepage: data.homepage || null,
    mediaType: mediaType,
  };
};

export const getMovieCredits = async (movieId, mediaType = 'movie', signal) => {
  const apiKey = getApiKey();

  const response = await fetchWithTimeout(
    `${API_BASE_URL}/${mediaType}/${movieId}/credits?language=en-US&api_key=${apiKey}`,
    { signal },
  );

  if (!response.ok) {
    return [];
  }

  const data = await response.json();
  return (data.cast || []).slice(0, 12).map((member) => ({
    id: member.id,
    name: member.name,
    character: member.character,
    profilePath: member.profile_path ? `${PROFILE_BASE_URL}${member.profile_path}` : null,
  }));
};

export const getMovieVideos = async (movieId, mediaType = 'movie', signal) => {
  const apiKey = getApiKey();

  const response = await fetchWithTimeout(
    `${API_BASE_URL}/${mediaType}/${movieId}/videos?language=en-US&api_key=${apiKey}`,
    { signal },
  );

  if (!response.ok) {
    return [];
  }

  const data = await response.json();
  const results = data.results || [];

  // Filter YouTube trailers/clips
  const trailers = results.filter((v) => v.site === 'YouTube' && v.type === 'Trailer');
  return trailers.length > 0 ? trailers : results.filter((v) => v.site === 'YouTube');
};

export const discoverMovies = async ({ genreId, year }, signal) => {
  const apiKey = getApiKey();
  
  let url = `${API_BASE_URL}/discover/movie?language=en-US&page=1&api_key=${apiKey}&include_adult=false`;
  
  if (genreId) {
    url += `&with_genres=${genreId}`;
  }
  if (year) {
    url += `&primary_release_year=${year}`;
  }

  const response = await fetchWithTimeout(url, { signal });

  if (!response.ok) {
    throw new Error('Unable to discover movies.');
  }

  const { results } = await response.json();
  return results.filter((m) => m.poster_path).map(mapMovie);
};

export const getSimilarMovies = async (movieId, mediaType = 'movie', signal) => {
  const apiKey = getApiKey();

  const response = await fetchWithTimeout(
    `${API_BASE_URL}/${mediaType}/${movieId}/similar?language=en-US&page=1&api_key=${apiKey}`,
    { signal },
  );

  if (!response.ok) {
    return [];
  }

  const { results } = await response.json();
  return (results || []).filter((m) => m.poster_path).slice(0, 10).map((m) => mapMovie({ ...m, media_type: mediaType }));
};

