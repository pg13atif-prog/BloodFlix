const API_BASE_URL = '/api/tmdb';
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

export const fetchList = async (endpoint, signal) => {
  const response = await fetchWithTimeout(`${API_BASE_URL}/${endpoint}`, { signal });
  if (!response.ok) throw new Error(`Failed to load ${endpoint}`);
  const { results } = await response.json();
  return results.filter((item) => item.poster_path).map(mapMovie);
};

export const getPopularMovies = async (signal) => {
  const response = await fetchWithTimeout(
    `${API_BASE_URL}/movie/popular?language=en-US&page=1`,
    { signal },
  );

  if (!response.ok) {
    throw new Error('Unable to load movies from TMDB.');
  }

  const { results } = await response.json();
  return results.filter((movie) => movie.poster_path).map(mapMovie);
};

export const getPopularTvShows = async (signal) => {
  const response = await fetchWithTimeout(
    `${API_BASE_URL}/tv/popular?language=en-US&page=1`,
    { signal },
  );

  if (!response.ok) {
    throw new Error('Unable to load TV shows from TMDB.');
  }

  const { results } = await response.json();
  return results.filter((show) => show.poster_path).map(mapMovie);
};

export const getTrending = async (mediaType = 'all', timeWindow = 'day', signal) => {
  const response = await fetchWithTimeout(
    `${API_BASE_URL}/trending/${mediaType}/${timeWindow}?language=en-US`,
    { signal },
  );

  if (!response.ok) {
    throw new Error('Unable to load trending items from TMDB.');
  }

  const { results } = await response.json();
  return results.filter((item) => item.poster_path).map(mapMovie);
};

export const searchMedia = async (query, signal) => {
  const response = await fetchWithTimeout(
    `${API_BASE_URL}/search/multi?query=${encodeURIComponent(query)}&include_adult=false&language=en-US&page=1`,
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

export const getExternalRatings = async (imdbId, title, year) => {
  try {
    const params = new URLSearchParams();
    if (imdbId) params.append('imdbId', imdbId);
    if (title) params.append('title', title);
    if (year) params.append('year', year);

    const res = await fetch(`/api/ratings?${params.toString()}`);
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.error('Failed to load ratings:', err);
  }
  return { imdbRating: null, rottenTomatoes: null };
};

export const getMovieDetails = async (movieId, mediaType = 'movie', signal) => {
  const response = await fetchWithTimeout(
    `${API_BASE_URL}/${mediaType}/${movieId}?append_to_response=external_ids&language=en-US`,
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
    imdbId: data.imdb_id || data.external_ids?.imdb_id || null,
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
    runtimeMinutes: data.runtime || (data.episode_run_time ? data.episode_run_time[0] : 0) || 0,
    status: data.status ?? 'Released',
    budget: formatCurrency(data.budget),
    revenue: formatCurrency(data.revenue),
    genres: data.genres?.map((g) => g.name) ?? [],
    category: data.genres?.[0]?.name ?? (mediaType === 'tv' ? 'TV Show' : 'Movie'),
    productionCompanies: data.production_companies?.map((c) => c.name) ?? [],
    productionCountries: data.production_countries?.map((c) => c.iso_3166_1) ?? [],
    homepage: data.homepage || null,
    mediaType: mediaType,
    seasons: data.seasons || [],
    numberOfSeasons: data.number_of_seasons || 0,
    numberOfEpisodes: data.number_of_episodes || 0,
  };
};

export const getMovieCredits = async (movieId, mediaType = 'movie', signal) => {
  const response = await fetchWithTimeout(
    `${API_BASE_URL}/${mediaType}/${movieId}/credits?language=en-US`,
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
  const response = await fetchWithTimeout(
    `${API_BASE_URL}/${mediaType}/${movieId}/videos?language=en-US`,
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

export const discoverMedia = async ({
  mediaType = 'movie',
  genreIds = [],
  years = [],
  minRating = 0,
  sortBy = 'popularity.desc',
  page = 1
} = {}, signal) => {
  const endpoint = mediaType === 'tv' ? 'tv' : 'movie';
  
  // Adjust sort_by for TV vs Movie
  let effectiveSortBy = sortBy;
  if (mediaType === 'tv' && sortBy === 'primary_release_date.desc') {
    effectiveSortBy = 'first_air_date.desc';
  }

  let url = `${API_BASE_URL}/discover/${endpoint}?language=en-US&page=${page}&include_adult=false&sort_by=${effectiveSortBy}`;
  
  // Require minimum vote count to prevent obscure 1-vote items when sorting by rating
  if (effectiveSortBy.includes('vote_average') || minRating > 0) {
    url += mediaType === 'tv' ? `&vote_count.gte=5` : `&vote_count.gte=50`;
  }

  // Multi-genre filtering with TV ID translation
  if (genreIds && genreIds.length > 0) {
    let rawGenres = Array.isArray(genreIds) ? genreIds : [genreIds];
    if (mediaType === 'tv') {
      rawGenres = rawGenres.map(gId => {
        const numG = Number(gId);
        if (numG === 28 || numG === 12) return 10759; // Action (28) / Adventure (12) -> Action & Adventure (10759)
        if (numG === 878 || numG === 14) return 10765; // Sci-Fi (878) / Fantasy (14) -> Sci-Fi & Fantasy (10765)
        if (numG === 10752) return 10768; // War (10752) -> War & Politics (10768)
        return numG;
      });
      // Deduplicate mapped genre IDs
      rawGenres = [...new Set(rawGenres)];
    }
    url += `&with_genres=${rawGenres.join(',')}`;
  }
  
  // Multi-year or Decade filtering
  if (years && years.length > 0) {
    if (Array.isArray(years)) {
      if (years.length === 1) {
        url += mediaType === 'tv' ? `&first_air_date_year=${years[0]}` : `&primary_release_year=${years[0]}`;
      } else {
        const numericYears = years.map(Number).filter(n => !isNaN(n)).sort((a, b) => a - b);
        if (numericYears.length > 0) {
          const minYear = numericYears[0];
          const maxYear = numericYears[numericYears.length - 1];
          if (mediaType === 'tv') {
            url += `&first_air_date.gte=${minYear}-01-01&first_air_date.lte=${maxYear}-12-31`;
          } else {
            url += `&primary_release_date.gte=${minYear}-01-01&primary_release_date.lte=${maxYear}-12-31`;
          }
        }
      }
    } else if (typeof years === 'string' && years.includes('-')) {
      const [start, end] = years.split('-');
      if (mediaType === 'tv') {
        url += `&first_air_date.gte=${start}-01-01&first_air_date.lte=${end}-12-31`;
      } else {
        url += `&primary_release_date.gte=${start}-01-01&primary_release_date.lte=${end}-12-31`;
      }
    } else if (typeof years === 'string' && years) {
      url += mediaType === 'tv' ? `&first_air_date_year=${years}` : `&primary_release_year=${years}`;
    }
  }

  if (minRating > 0) {
    url += `&vote_average.gte=${minRating}`;
  }

  const response = await fetchWithTimeout(url, { signal });

  if (!response.ok) {
    throw new Error('Unable to discover content.');
  }

  const data = await response.json();
  const results = data.results || [];
  return {
    results: results.filter((m) => m.poster_path).map((item) => mapMovie({ ...item, media_type: mediaType })),
    totalPages: data.total_pages || 1,
    totalResults: data.total_results || 0,
    page: data.page || page
  };
};

export const discoverMovies = async ({ genreId, year } = {}, signal) => {
  const genreIds = genreId ? [genreId] : [];
  const years = year ? [year] : [];
  const data = await discoverMedia({ mediaType: 'movie', genreIds, years }, signal);
  return data.results;
};

export const getSimilarMovies = async (movieId, mediaType = 'movie', signal) => {
  const response = await fetchWithTimeout(
    `${API_BASE_URL}/${mediaType}/${movieId}/similar?language=en-US&page=1`,
    { signal },
  );

  if (!response.ok) {
    return [];
  }

  const { results } = await response.json();
  return (results || []).filter((m) => m.poster_path).slice(0, 10).map((m) => mapMovie({ ...m, media_type: mediaType }));
};

export const getWatchProviders = async (movieId, mediaType = 'movie', signal) => {
  const response = await fetchWithTimeout(
    `${API_BASE_URL}/${mediaType}/${movieId}/watch/providers`,
    { signal }
  );
  if (!response.ok) return null;
  const data = await response.json();
  return data.results || null;
};

export const getRecommendations = async (movieId, mediaType = 'movie', signal) => {
  const response = await fetchWithTimeout(
    `${API_BASE_URL}/${mediaType}/${movieId}/recommendations?language=en-US&page=1`,
    { signal }
  );
  if (!response.ok) return [];
  const { results } = await response.json();
  return (results || []).filter((m) => m.poster_path).slice(0, 10).map((m) => mapMovie({ ...m, media_type: mediaType }));
};

export const getReviews = async (movieId, mediaType = 'movie', signal) => {
  const response = await fetchWithTimeout(
    `${API_BASE_URL}/${mediaType}/${movieId}/reviews?language=en-US&page=1`,
    { signal }
  );
  if (!response.ok) return [];
  const data = await response.json();
  return data.results || [];
};

export const getFullCast = async (movieId, mediaType = 'movie', signal) => {
  const response = await fetchWithTimeout(
    `${API_BASE_URL}/${mediaType}/${movieId}/credits?language=en-US`,
    { signal }
  );
  if (!response.ok) return [];
  const data = await response.json();
  // Return more cast members (e.g. up to 30) instead of just top 12
  return (data.cast || []).slice(0, 30).map((member) => ({
    id: member.id,
    name: member.name,
    character: member.character,
    profilePath: member.profile_path ? `${PROFILE_BASE_URL}${member.profile_path}` : null,
  }));
};

export const getTvSeason = async (seriesId, seasonNumber, signal) => {
  const response = await fetchWithTimeout(
    `${API_BASE_URL}/tv/${seriesId}/season/${seasonNumber}?language=en-US`,
    { signal }
  );
  if (!response.ok) return null;
  return await response.json();
};

export const getTvEpisode = async (seriesId, seasonNumber, episodeNumber, signal) => {
  const response = await fetchWithTimeout(
    `${API_BASE_URL}/tv/${seriesId}/season/${seasonNumber}/episode/${episodeNumber}?language=en-US`,
    { signal }
  );
  if (!response.ok) return null;
  return await response.json();
};
