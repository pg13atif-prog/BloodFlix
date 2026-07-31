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
  if (!query || !query.trim()) return [];
  const rawQuery = query.trim();

  // 1. Extract 4-digit year if present (e.g. "don (1978)" -> year 1978, clean "don")
  const yearMatch = rawQuery.match(/\b(19\d\d|20\d\d)\b/);
  const targetYear = yearMatch ? yearMatch[1] : null;

  // Clean query by removing parenthetical year strings and symbols for accurate TMDB title matching
  const cleanedText = rawQuery
    .replace(/\(\s*(19\d\d|20\d\d)\s*\)/g, '')
    .replace(/\b(19\d\d|20\d\d)\b/g, '')
    .replace(/[()]/g, '')
    .trim();
  const searchKeywords = (cleanedText || rawQuery).toLowerCase();
  const searchWords = searchKeywords.split(/\s+/).filter(w => w.length > 0);

  // Build parallel fetch promises to maximize recall
  const promises = [];

  // Call 1: Standard multi-search page 1
  promises.push(
    fetchWithTimeout(
      `${API_BASE_URL}/search/multi?query=${encodeURIComponent(rawQuery)}&include_adult=false&language=en-US&page=1`,
      { signal }
    ).then(r => r.ok ? r.json() : { results: [] }).catch(() => ({ results: [] }))
  );

  // Call 2: If cleanedText differs from rawQuery, search multi-search with cleanedText
  if (cleanedText && cleanedText !== rawQuery) {
    promises.push(
      fetchWithTimeout(
        `${API_BASE_URL}/search/multi?query=${encodeURIComponent(cleanedText)}&include_adult=false&language=en-US&page=1`,
        { signal }
      ).then(r => r.ok ? r.json() : { results: [] }).catch(() => ({ results: [] }))
    );
  }

  // Call 3: Movie specific search with primary_release_year if year is present
  if (targetYear) {
    const q = cleanedText || rawQuery;
    promises.push(
      fetchWithTimeout(
        `${API_BASE_URL}/search/movie?query=${encodeURIComponent(q)}&primary_release_year=${targetYear}&include_adult=false&language=en-US&page=1`,
        { signal }
      ).then(r => r.ok ? r.json() : { results: [] }).catch(() => ({ results: [] }))
    );
  }

  // Call 4: Page 2 of movie search for short queries so classic movies further down are retrieved
  if (searchKeywords.length <= 8) {
    const q = cleanedText || rawQuery;
    promises.push(
      fetchWithTimeout(
        `${API_BASE_URL}/search/movie?query=${encodeURIComponent(q)}&include_adult=false&language=en-US&page=2`,
        { signal }
      ).then(r => r.ok ? r.json() : { results: [] }).catch(() => ({ results: [] }))
    );
  }

  // Call 5: If multi-word query (e.g. "amitabh bachchan don"), search for the last word (main title candidate)
  if (searchWords.length >= 2 && !targetYear) {
    const mainTitleCandidate = searchWords[searchWords.length - 1];
    if (mainTitleCandidate.length >= 3) {
      promises.push(
        fetchWithTimeout(
          `${API_BASE_URL}/search/movie?query=${encodeURIComponent(mainTitleCandidate)}&include_adult=false&language=en-US&page=1`,
          { signal }
        ).then(r => r.ok ? r.json() : { results: [] }).catch(() => ({ results: [] }))
      );
    }
  }

  const responses = await Promise.all(promises);

  // Deduplicate results by ID
  const itemMap = new Map();
  responses.forEach(data => {
    if (data && Array.isArray(data.results)) {
      data.results.forEach(item => {
        if ((item.media_type === 'movie' || item.media_type === 'tv' || item.title || item.name) && item.poster_path) {
          if (!itemMap.has(item.id)) {
            itemMap.set(item.id, item);
          }
        }
      });
    }
  });

  const rawList = Array.from(itemMap.values());

  // Smart scoring and ranking algorithm
  const scored = rawList.map(item => {
    let score = 0;
    const title = (item.title || item.name || '').toLowerCase();
    const releaseYear = (item.release_date || item.first_air_date || '').slice(0, 4);

    // Exact year match boost (+150)
    if (targetYear && releaseYear === targetYear) {
      score += 150;
    }

    // Exact title match boost (+100)
    if (title === searchKeywords || (cleanedText && title === cleanedText.toLowerCase())) {
      score += 100;
    }
    // Title starts with match (+50)
    else if (title.startsWith(searchKeywords) || (cleanedText && title.startsWith(cleanedText.toLowerCase()))) {
      score += 50;
    }
    // Containment of search words (+30)
    else if (searchWords.every(w => title.includes(w))) {
      score += 30;
    }

    // Popularity score weight
    if (item.popularity) {
      score += Math.min(item.popularity / 10, 20);
    }

    return { item, score };
  });

  // Sort by score descending
  scored.sort((a, b) => b.score - a.score);

  return scored.map(s => mapMovie(s.item));
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
    `${API_BASE_URL}/${mediaType}/${movieId}?append_to_response=credits,external_ids&language=en-US`,
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

  const crew = data.credits?.crew || [];
  const cast = data.credits?.cast || [];

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
    directors: crew.filter((c) => c.job === 'Director').map((c) => c.name),
    composers: crew.filter((c) => ['Original Music Composer', 'Music', 'Composer', 'Original Score', 'Songs'].includes(c.job) || c.department === 'Sound').slice(0, 3).map((c) => c.name),
    topCast: cast.slice(0, 6).map((c) => c.name),
  };
};

export const getMovieFactSheet = async (titleQuery) => {
  if (!titleQuery) return { title: 'Unknown', factSummary: 'No information available.' };
  try {
    const matches = await searchMedia(titleQuery);
    if (!matches || matches.length === 0) {
      return { title: titleQuery, factSummary: `Title: "${titleQuery}"` };
    }
    const best = matches[0];
    const details = await getMovieDetails(best.id, best.mediaType);
    
    const directors = details.directors?.length ? details.directors.join(', ') : 'N/A';
    const composers = details.composers?.length ? details.composers.join(', ') : 'N/A';
    const topCast = details.topCast?.length ? details.topCast.join(', ') : 'N/A';
    const genres = details.genres?.length ? details.genres.join(', ') : 'N/A';

    const factSummary = `Title: "${details.title}" (${details.year})
Type: ${details.mediaType === 'tv' ? 'TV Series' : 'Movie'}
Director: ${directors}
Music Composer(s): ${composers}
Main Cast: ${topCast}
Genres: ${genres}
Overview: ${details.overview || details.tagline || 'N/A'}`;

    return {
      title: details.title,
      year: details.year,
      factSummary,
      details
    };
  } catch (err) {
    console.error(`Failed to fetch fact sheet for ${titleQuery}:`, err);
    return { title: titleQuery, factSummary: `Title: "${titleQuery}"` };
  }
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

export const getTMDBContextForPrompt = async (prompt) => {
  if (!prompt || !prompt.trim()) return null;
  const p = prompt.trim();

  try {
    // 1. Clean prompt to extract potential person / actor / director names
    const cleanForPerson = p
      .replace(/'s\b/gi, '')
      .replace(/\b(classic|movies|movie|films|film|best|top|shows|show|actor|director|cinema|all|starred|in|bengali|hindi|tamil|telugu|bollywood|hollywood)\b/gi, '')
      .trim();

    const personQuery = cleanForPerson.length >= 3 ? cleanForPerson : p;

    const personRes = await fetchWithTimeout(
      `${API_BASE_URL}/search/person?query=${encodeURIComponent(personQuery)}&include_adult=false&language=en-US&page=1`
    );

    let personContext = '';
    if (personRes.ok) {
      const personData = await personRes.json();
      if (personData.results && personData.results.length > 0) {
        // Fetch up to 3 top people with this name to handle ambiguities (e.g. Tamil Dev vs Bengali Dev)
        const topPeople = personData.results.slice(0, 3);
        
        for (const topPerson of topPeople) {
          const creditsRes = await fetchWithTimeout(
            `${API_BASE_URL}/person/${topPerson.id}/movie_credits?language=en-US`
          );
          if (creditsRes.ok) {
            const creditsData = await creditsRes.json();
            const allMedia = [...(creditsData.cast || []), ...(creditsData.crew || [])];
            
            const sorted = allMedia
              .filter(m => m.poster_path && m.title)
              .sort((a, b) => (b.vote_count || 0) - (a.vote_count || 0));

            const uniqueMap = new Map();
            sorted.forEach(m => {
              if (!uniqueMap.has(m.id)) uniqueMap.set(m.id, m);
            });
            const topList = Array.from(uniqueMap.values()).slice(0, 15);

            if (topList.length > 0) {
              const formattedList = topList.map(m => `"${m.title}" (${(m.release_date || '').slice(0,4)})`).join(', ');
              personContext += `\n- Verified Filmography for ${topPerson.name} (${topPerson.known_for_department}): [${formattedList}]`;
            }
          }
        }
      }
    }

    // 2. Do a general media search to fetch candidate movies
    let mediaContext = '';
    const mediaCandidates = await searchMedia(p);
    if (mediaCandidates && mediaCandidates.length > 0) {
      const formattedList = mediaCandidates.slice(0, 12).map(m => `"${m.title}" (${m.year})`).join(', ');
      mediaContext = `\n- General TMDB search matches for query: [${formattedList}]`;
    }

    if (personContext || mediaContext) {
      return (personContext + mediaContext).trim();
    }
  } catch (err) {
    console.error('Error fetching TMDB context for prompt:', err);
  }
  return null;
};
