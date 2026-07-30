import { useState, useEffect, useMemo } from 'react';
import {
  getMovieDetails,
  getFullCast,
  getMovieVideos,
  getSimilarMovies,
  getWatchProviders,
  getRecommendations,
  getReviews,
  getTvSeason,
  getExternalRatings
} from '../services/tmdb';
import { 
  addToWatchlist, removeFromWatchlist, isInWatchlist, addRecentlyViewed,
  addToWatched, removeFromWatched, isWatched,
  addToLiked, removeFromLiked, isLiked
} from '../services/firestore';
import { useAuth } from '../context/AuthContext';
import MovieRow from '../components/MovieRow';
import { checkAndUnlockAchievements, trackDetailView, incrementStat } from '../services/achievements';
import './MovieDetail.css';

const MovieDetail = ({ movieId, mediaType = 'movie', onBack }) => {
  const [movie, setMovie] = useState(null);
  const [cast, setCast] = useState([]);
  const [trailerKey, setTrailerKey] = useState(null);
  const [similarMovies, setSimilarMovies] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [watchProviders, setWatchProviders] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [status, setStatus] = useState('loading');
  const [showTrailerModal, setShowTrailerModal] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [isLikedItem, setIsLikedItem] = useState(false);
  const [isWatchedItem, setIsWatchedItem] = useState(false);
  const [externalRatings, setExternalRatings] = useState({ imdbRating: null, rottenTomatoes: null });
  
  // TV Show Season Data
  const [selectedSeason, setSelectedSeason] = useState(1);
  const [seasonDetails, setSeasonDetails] = useState(null);
  
  // Episode Modal
  const [selectedEpisode, setSelectedEpisode] = useState(null);
  
  const { currentUser } = useAuth();
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    const controller = new AbortController();
    setStatus('loading');

    Promise.all([
      getMovieDetails(movieId, mediaType, controller.signal),
      getFullCast(movieId, mediaType, controller.signal),
      getMovieVideos(movieId, mediaType, controller.signal),
      getSimilarMovies(movieId, mediaType, controller.signal),
      getWatchProviders(movieId, mediaType, controller.signal),
      getRecommendations(movieId, mediaType, controller.signal),
      getReviews(movieId, mediaType, controller.signal)
    ])
      .then(([detailsData, castData, videosData, similarData, providersData, recsData, reviewsData]) => {
        setMovie(detailsData);
        setCast(castData);
        setTrailerKey(videosData[0]?.key || null);
        setSimilarMovies(similarData);
        
        // Fetch IMDb and Rotten Tomatoes ratings
        getExternalRatings(detailsData.imdb_id, detailsData.title, detailsData.release_date?.split('-')[0]).then(setExternalRatings);

        // Providers logic (filter by US for now if geolocation not available)
        const usProviders = providersData?.US || providersData?.GB || providersData?.CA || null;
        setWatchProviders(usProviders);
        
        setRecommendations(recsData);
        setReviews(reviewsData);
        setStatus('success');
        
        // Add to recently viewed if logged in
        if (currentUser) {
          addRecentlyViewed(currentUser.uid, detailsData).catch(err => console.error("Could not add to recently viewed", err));
          trackDetailView(currentUser.uid, detailsData.id, detailsData.productionCountries);
        }
      })
      .catch((err) => {
        if (err.name !== 'AbortError') {
          console.error('Error fetching movie details:', err);
          setStatus('error');
        }
      });

    return () => controller.abort();
  }, [movieId, mediaType, currentUser]);

  // Check user lists
  useEffect(() => {
    if (currentUser && movieId) {
      isInWatchlist(currentUser.uid, movieId).then(setIsSaved).catch(() => setIsSaved(false));
      isLiked(currentUser.uid, movieId).then(setIsLikedItem).catch(() => setIsLikedItem(false));
      isWatched(currentUser.uid, movieId).then(setIsWatchedItem).catch(() => setIsWatchedItem(false));
    } else {
      setIsSaved(false);
      setIsLikedItem(false);
      setIsWatchedItem(false);
    }
  }, [currentUser, movieId]);
  
  // Fetch TV Season details
  useEffect(() => {
    if (movie && movie.mediaType === 'tv' && movie.seasons && movie.seasons.length > 0) {
      const controller = new AbortController();
      getTvSeason(movieId, selectedSeason, controller.signal)
        .then(setSeasonDetails)
        .catch(console.error);
      return () => controller.abort();
    }
  }, [movie, selectedSeason, movieId]);

  // Handle ESC key for modal
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && showTrailerModal) {
        setShowTrailerModal(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showTrailerModal]);

  const handleWatchlistClick = async () => {
    if (!currentUser) {
      alert('Please log in to add movies to your watchlist.');
      return;
    }

    try {
      if (isSaved) {
        await removeFromWatchlist(currentUser.uid, movieId);
        setIsSaved(false);
      } else {
        await addToWatchlist(currentUser.uid, movie);
        setIsSaved(true);
        checkAndUnlockAchievements(currentUser.uid);
      }
    } catch (err) {
      console.error('Error updating watchlist:', err);
      alert(`Failed to update watchlist: ${err.message}`);
    }
  };

  const handleLikeClick = async () => {
    if (!currentUser) return alert('Please log in to like titles.');
    try {
      if (isLikedItem) {
        await removeFromLiked(currentUser.uid, movieId);
        setIsLikedItem(false);
      } else {
        await addToLiked(currentUser.uid, movie);
        setIsLikedItem(true);
        checkAndUnlockAchievements(currentUser.uid);
      }
    } catch (err) { console.error(err); }
  };

  const handleWatchedClick = async () => {
    if (!currentUser) return alert('Please log in to mark titles as watched.');
    try {
      if (isWatchedItem) {
        await removeFromWatched(currentUser.uid, movieId);
        setIsWatchedItem(false);
      } else {
        let runtime = 0;
        if (movie.mediaType === 'tv') {
           runtime = (movie.numberOfEpisodes || 1) * (movie.runtimeMinutes || 45);
        } else {
           runtime = movie.runtimeMinutes || 120;
        }
        await addToWatched(currentUser.uid, movie, runtime);
        setIsWatchedItem(true);
        checkAndUnlockAchievements(currentUser.uid);
      }
    } catch (err) { console.error(err); }
  };
  
  const handleMarkSeasonWatched = async () => {
    if (!currentUser) return alert('Please log in to mark a season as watched.');
    if (!seasonDetails || !seasonDetails.episodes) return;
    
    // We can just add the total runtime of the season to the user's watched list, 
    // or add each episode individually. For simplicity we'll just add the series entry itself 
    // but scale the runtime to the season length.
    const seasonRuntime = seasonDetails.episodes.length * (movie.runtimeMinutes || 45);
    try {
      // For this simple implementation, we'll just re-add the main show but with updated runtime. 
      // Ideally, episodes should be tracked individually, but this satisfies the basic request.
      await addToWatched(currentUser.uid, movie, seasonRuntime);
      alert(`Season ${selectedSeason} marked as watched!`);
      setIsWatchedItem(true);
      checkAndUnlockAchievements(currentUser.uid);
    } catch (err) { console.error(err); }
  };

  const getGenreColor = (genre) => {
    const safeGenre = genre.toLowerCase().replace(/[^a-z0-9-]/g, '-');
    return `var(--color-genre-${safeGenre}, var(--color-genre-default))`;
  };

  // Merge similar and recommendations into a single deduplicated array
  const relatedMovies = useMemo(() => {
    const combined = [...similarMovies, ...recommendations];
    const uniqueMap = new Map();
    combined.forEach(m => {
      if (m && m.id && !uniqueMap.has(m.id)) {
        uniqueMap.set(m.id, m);
      }
    });
    return Array.from(uniqueMap.values());
  }, [similarMovies, recommendations]);

  if (status === 'loading') {
    return (
      <div className="movie-detail-page skeleton-page">
        <div className="detail-header-nav">
          <div className="skeleton skeleton-btn"></div>
        </div>
        <div className="detail-hero">
          <div className="skeleton skeleton-backdrop"></div>
        </div>
        <div className="detail-container">
          <div className="detail-main-grid">
            <div className="detail-poster-col">
              <div className="skeleton skeleton-poster"></div>
              <div className="skeleton skeleton-sidebar"></div>
            </div>
            <div className="detail-info-col">
              <div className="skeleton skeleton-title"></div>
              <div className="skeleton skeleton-tagline"></div>
              <div className="skeleton skeleton-badges"></div>
              <div className="skeleton skeleton-actions"></div>
              <div className="skeleton skeleton-overview"></div>
              <div className="skeleton skeleton-overview-line"></div>
              <div className="skeleton skeleton-overview-line short"></div>
              <div className="cast-grid" style={{ marginTop: '3rem' }}>
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="cast-card">
                    <div className="skeleton skeleton-avatar"></div>
                    <div className="skeleton skeleton-text"></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (status === 'error' || !movie) {
    return (
      <div className="movie-detail-state error-state">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="error-icon">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="8" x2="12" y2="12"></line>
          <line x1="12" y1="16" x2="12.01" y2="16"></line>
        </svg>
        <h2 className="error-title">Oops! Movie not found</h2>
        <p className="error-desc">We couldn't load the details for this title. It might have been removed or is temporarily unavailable.</p>
        <button className="btn-primary error-btn" onClick={onBack}>
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"></polyline></svg>
          Back to Browse
        </button>
      </div>
    );
  }

  const renderSidebarBoxes = () => (
    <>
      {/* Watch Providers Box (Moved to Top of Sidebar for High Visibility) */}
      <div className="detail-sidebar-box glass-panel watch-providers-box">
        <h4 className="sidebar-heading">Where to Watch</h4>
        {!watchProviders ? (
          <p className="no-providers-text">No official streaming providers available in your region.</p>
        ) : (
          <div className="provider-categories">
            {watchProviders.flatrate && (
              <div className="provider-category">
                <span className="provider-label">Stream</span>
                <div className="provider-logos">
                  {watchProviders.flatrate.map(p => {
                    const targetUrl = `https://www.google.com/search?q=watch+${encodeURIComponent(movie.title)}+on+${encodeURIComponent(p.provider_name)}`;
                    return (
                      <a 
                        key={p.provider_id} 
                        href={targetUrl}
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="provider-logo-link"
                        title={`Watch ${movie.title} on ${p.provider_name}`}
                      >
                        <img src={`https://image.tmdb.org/t/p/w200${p.logo_path}`} alt={p.provider_name} className="provider-logo" />
                      </a>
                    );
                  })}
                </div>
              </div>
            )}
            {watchProviders.rent && (
              <div className="provider-category">
                <span className="provider-label">Rent</span>
                <div className="provider-logos">
                  {watchProviders.rent.map(p => {
                    const targetUrl = `https://www.google.com/search?q=rent+${encodeURIComponent(movie.title)}+on+${encodeURIComponent(p.provider_name)}`;
                    return (
                      <a 
                        key={p.provider_id} 
                        href={targetUrl}
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="provider-logo-link"
                        title={`Rent ${movie.title} on ${p.provider_name}`}
                      >
                        <img src={`https://image.tmdb.org/t/p/w200${p.logo_path}`} alt={p.provider_name} className="provider-logo" />
                      </a>
                    );
                  })}
                </div>
              </div>
            )}
            {watchProviders.buy && (
              <div className="provider-category">
                <span className="provider-label">Buy</span>
                <div className="provider-logos">
                  {watchProviders.buy.map(p => {
                    const targetUrl = `https://www.google.com/search?q=buy+${encodeURIComponent(movie.title)}+on+${encodeURIComponent(p.provider_name)}`;
                    return (
                      <a 
                        key={p.provider_id} 
                        href={targetUrl}
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="provider-logo-link"
                        title={`Buy ${movie.title} on ${p.provider_name}`}
                      >
                        <img src={`https://image.tmdb.org/t/p/w200${p.logo_path}`} alt={p.provider_name} className="provider-logo" />
                      </a>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Premium Info Sidebar */}
      <div className="detail-sidebar-box glass-panel">
        <h4 className="sidebar-heading">Information</h4>
        <div className="meta-item">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
          <div className="meta-text">
            <span className="meta-label">Status</span>
            <span className="meta-val">{movie.status}</span>
          </div>
        </div>
        <div className="meta-item">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
          <div className="meta-text">
            <span className="meta-label">Release Date</span>
            <span className="meta-val">{movie.releaseDate || movie.year}</span>
          </div>
        </div>
        <div className="meta-item">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 16 14"></polyline></svg>
          <div className="meta-text">
            <span className="meta-label">Runtime</span>
            <span className="meta-val">{movie.runtime}</span>
          </div>
        </div>
        {movie.budget && (
          <div className="meta-item">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
            <div className="meta-text">
              <span className="meta-label">Budget</span>
              <span className="meta-val">{movie.budget}</span>
            </div>
          </div>
        )}
        {movie.revenue && (
          <div className="meta-item">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
            <div className="meta-text">
              <span className="meta-label">Revenue</span>
              <span className="meta-val">{movie.revenue}</span>
            </div>
          </div>
        )}
        {movie.productionCompanies.length > 0 && (
          <div className="meta-item">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path></svg>
            <div className="meta-text">
              <span className="meta-label">Production</span>
              <span className="meta-val">{movie.productionCompanies.slice(0, 2).join(', ')}</span>
            </div>
          </div>
        )}
      </div>
    </>
  );

  return (
    <div className="movie-detail-page">
      {/* ── Top Navigation Bar ── */}
      <div className="detail-header-nav">
        <button className="btn-back" onClick={onBack} aria-label="Go back to list">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Back to Browse
        </button>
      </div>

      {/* ── Backdrop Banner ── */}
      <div className="detail-hero">
        {movie.backdrop ? (
          <img src={movie.backdrop} alt="" className="detail-hero-backdrop" />
        ) : (
          <div className="detail-hero-placeholder" />
        )}
        <div className="detail-hero-gradient" />
        <div className="detail-hero-vignette" />
        <div className="detail-particles"></div>
      </div>

      {/* ── Main Content Container ── */}
      <div className="detail-container">
        <div className="detail-main-grid">
          {/* Left Column: Poster Card */}
          <div className="detail-poster-col">
            <div className="detail-poster-wrapper">
              {movie.poster ? (
                <img src={movie.poster} alt={`${movie.title} Poster`} className="detail-poster" loading="lazy" />
              ) : (
                <div className="detail-poster-empty">No Image</div>
              )}
            </div>
            {!isMobile && renderSidebarBoxes()}
          </div>

          {/* Right Column: Key Details */}
          <div className="detail-info-col">
            <div className="detail-title-section">
              <h1 className="detail-title">{movie.title}</h1>
              {movie.tagline && <p className="detail-tagline">&ldquo;{movie.tagline}&rdquo;</p>}

              {/* Badges Bar */}
              <div className="detail-badges-row">
                <span className="badge rating-badge">
                  <span className="star-icon">★</span> {movie.rating}
                  <span className="vote-count">({movie.voteCount})</span>
                </span>

                {externalRatings?.imdbRating && (
                  <span className="badge imdb-badge" title="IMDb Rating">
                    <span className="imdb-logo">IMDb</span> {externalRatings.imdbRating}
                  </span>
                )}

                {externalRatings?.rottenTomatoes && (
                  <span className="badge rt-badge" title="Rotten Tomatoes Score">
                    <span className="rt-logo">🍅</span> {externalRatings.rottenTomatoes}
                  </span>
                )}

                <span className="badge year-badge">{movie.year}</span>
                <span className="badge runtime-badge">{movie.runtime}</span>
                {movie.genres.map((g) => (
                  <span 
                    key={g} 
                    className="badge genre-badge" 
                    style={{ 
                      borderColor: getGenreColor(g),
                      backgroundColor: 'rgba(15, 23, 42, 0.85)'
                    }}
                  >
                    {g}
                  </span>
                ))}
              </div>
            </div>

            {/* CTA Buttons */}
            <div className="detail-actions">
              {trailerKey ? (
                <button
                  className="detail-btn btn-primary"
                  onClick={() => {
                    setShowTrailerModal(true);
                    if (currentUser) {
                      incrementStat(currentUser.uid, 'trailersWatchedCount');
                    }
                  }}
                >
                  <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                  Watch Official Trailer
                </button>
              ) : (
                <button className="detail-btn btn-primary disabled" disabled>
                  Trailer Unavailable
                </button>
              )}

              <button
                className={`detail-btn btn-secondary ${isSaved ? 'saved' : ''}`}
                onClick={handleWatchlistClick}
              >
                <svg viewBox="0 0 24 24" width="20" height="20" fill={isSaved ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
                  <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
                </svg>
                {isSaved ? 'In Watchlist' : 'Watchlist'}
              </button>
              
              <button
                className={`detail-btn btn-secondary ${isLikedItem ? 'liked' : ''}`}
                onClick={handleLikeClick}
              >
                <svg viewBox="0 0 24 24" width="20" height="20" fill={isLikedItem ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                </svg>
                {isLikedItem ? 'Liked' : 'Like'}
              </button>
              
              <button
                className={`detail-btn btn-secondary ${isWatchedItem ? 'watched' : ''}`}
                onClick={handleWatchedClick}
              >
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
                  {isWatchedItem ? (
                    <path d="M20 6L9 17l-5-5" />
                  ) : (
                    <>
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </>
                  )}
                </svg>
                {isWatchedItem ? 'Watched' : 'Mark Watched'}
              </button>
            </div>

            {/* Overview */}
            <div className="detail-section">
              <h3 className="section-title">Overview</h3>
              <p className="detail-overview">
                {movie.overview || 'No overview description available for this movie.'}
              </p>
            </div>

            {isMobile && renderSidebarBoxes()}

            {/* Cast Section */}
            {cast.length > 0 && (
              <div className="detail-section">
                <h3 className="section-title">Full Cast</h3>
                <div className="cast-grid">
                  {cast.map((person) => (
                    <div key={person.id} className="cast-card">
                      <div className="cast-avatar">
                        {person.profilePath ? (
                          <img src={person.profilePath} alt={person.name} loading="lazy" />
                        ) : (
                          <div className="cast-avatar-fallback">{person.name.charAt(0)}</div>
                        )}
                      </div>
                      <div className="cast-info">
                        <p className="cast-name">{person.name}</p>
                        <p className="cast-character">{person.character}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Reviews Section */}
            {reviews.length > 0 && (
              <div className="detail-section">
                <h3 className="section-title">Reviews</h3>
                <div className="reviews-list">
                  {reviews.slice(0, 3).map((review) => (
                    <div key={review.id} className="review-card">
                      <div className="review-header">
                        <div className="review-avatar">
                          {review.author_details?.avatar_path ? (
                            <img 
                              src={review.author_details.avatar_path.startsWith('/') 
                                ? `https://image.tmdb.org/t/p/w200${review.author_details.avatar_path}` 
                                : review.author_details.avatar_path.slice(1)} 
                              alt={review.author} 
                              onError={(e) => { e.target.style.display = 'none'; }}
                            />
                          ) : (
                            <span>{review.author.charAt(0).toUpperCase()}</span>
                          )}
                        </div>
                        <div className="review-meta">
                          <h4>A review by {review.author}</h4>
                          {review.author_details?.rating && (
                            <span className="review-rating">★ {review.author_details.rating}</span>
                          )}
                        </div>
                      </div>
                      <div className="review-content">
                        <p>{review.content.length > 300 ? `${review.content.slice(0, 300)}...` : review.content}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* TV Seasons Section */}
            {movie.mediaType === 'tv' && movie.seasons && movie.seasons.length > 0 && (
              <div className="detail-section">
                <div className="season-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <h3 className="section-title" style={{ marginBottom: 0 }}>Episodes</h3>
                    <select 
                      value={selectedSeason} 
                      onChange={(e) => setSelectedSeason(Number(e.target.value))}
                      className="season-selector"
                      style={{ padding: '8px 12px', borderRadius: '8px', background: 'rgba(255,255,255,0.1)', color: 'white', border: '1px solid rgba(255,255,255,0.2)' }}
                    >
                      {movie.seasons.filter(s => s.season_number > 0).map(s => (
                        <option key={s.season_number} value={s.season_number} style={{ color: 'black' }}>
                          Season {s.season_number}
                        </option>
                      ))}
                    </select>
                  </div>
                  <button onClick={handleMarkSeasonWatched} className="btn-secondary" style={{ padding: '8px 16px', fontSize: '0.9rem', gap: '8px' }}>
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 6L9 17l-5-5" /></svg>
                    Mark Season as Watched
                  </button>
                </div>
                
                {seasonDetails && seasonDetails.episodes && (
                  <div className="episodes-list" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {seasonDetails.episodes.map(ep => (
                      <div 
                        key={ep.id} 
                        className="episode-card" 
                        onClick={() => setSelectedEpisode(ep)}
                        style={{ display: 'flex', gap: '1rem', background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '12px', cursor: 'pointer', transition: 'background 0.2s' }}
                        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                      >
                        {ep.still_path ? (
                           <img src={`https://image.tmdb.org/t/p/w300${ep.still_path}`} alt={ep.name} style={{ width: '160px', height: '90px', objectFit: 'cover', borderRadius: '8px', flexShrink: 0 }} />
                        ) : (
                           <div style={{ width: '160px', height: '90px', background: 'rgba(255,255,255,0.1)', borderRadius: '8px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>No Image</div>
                        )}
                        <div>
                          <h4 style={{ margin: '0 0 4px 0', fontSize: '1.1rem' }}>{ep.episode_number}. {ep.name}</h4>
                          <div style={{ display: 'flex', gap: '1rem', fontSize: '0.85rem', color: '#aaa', marginBottom: '8px' }}>
                            <span>{new Date(ep.air_date).getFullYear()}</span>
                            <span>{ep.runtime}m</span>
                            <span>★ {ep.vote_average?.toFixed(1)}</span>
                          </div>
                          <p style={{ margin: 0, fontSize: '0.9rem', color: '#ccc', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                            {ep.overview}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

          </div>
        </div>
      </div>

      {/* Single Unified & Centered Related Content Row */}
      {relatedMovies.length > 0 && (
        <div className="detail-similar-container">
          <MovieRow title="More Like This" movies={relatedMovies} />
        </div>
      )}

      {/* ── Trailer Video Modal ── */}
      {showTrailerModal && trailerKey && (
        <div className="trailer-modal-overlay" onClick={() => setShowTrailerModal(false)}>
          <div className="trailer-modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close-btn" onClick={() => setShowTrailerModal(false)} aria-label="Close trailer">
              &times;
            </button>
            <div className="iframe-wrapper">
              <iframe
                src={`https://www.youtube.com/embed/${trailerKey}?autoplay=1`}
                title={`${movie.title} Official Trailer`}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              ></iframe>
            </div>
          </div>
        </div>
      )}
      
      {/* ── Episode Modal ── */}
      {selectedEpisode && (
        <div className="trailer-modal-overlay" onClick={() => setSelectedEpisode(null)}>
          <div 
            style={{ 
              position: 'relative',
              background: '#0f172a', 
              borderRadius: '20px', 
              maxWidth: '620px', 
              width: '90vw',
              maxHeight: '90vh',
              overflowY: 'auto',
              border: '1px solid rgba(255,255,255,0.1)',
              boxShadow: '0 24px 80px rgba(0,0,0,0.8)'
            }} 
            onClick={(e) => e.stopPropagation()}
          >
            <button 
              className="modal-close-btn" 
              onClick={() => setSelectedEpisode(null)} 
              aria-label="Close modal"
              style={{ position: 'absolute', top: '1rem', right: '1rem', zIndex: 2 }}
            >
              &times;
            </button>
            {selectedEpisode.still_path ? (
              <img 
                src={`https://image.tmdb.org/t/p/w780${selectedEpisode.still_path}`} 
                alt={selectedEpisode.name} 
                style={{ width: '100%', height: '300px', objectFit: 'cover', borderRadius: '20px 20px 0 0', display: 'block' }} 
              />
            ) : (
              <div style={{ width: '100%', height: '200px', background: 'linear-gradient(135deg, rgba(229,9,20,0.2), rgba(99,102,241,0.2))', borderRadius: '20px 20px 0 0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '3rem' }}>🎬</div>
            )}
            <div style={{ padding: '1.75rem' }}>
              <p style={{ margin: '0 0 0.4rem', fontSize: '0.85rem', color: '#e50914', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Season {selectedSeason} · Episode {selectedEpisode.episode_number}
              </p>
              <h2 style={{ margin: '0 0 0.75rem', fontSize: '1.6rem', lineHeight: 1.2, color: '#fff' }}>
                {selectedEpisode.name}
              </h2>
              <div style={{ display: 'flex', gap: '1rem', fontSize: '0.9rem', color: '#aaa', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
                {selectedEpisode.air_date && <span>📅 {selectedEpisode.air_date}</span>}
                {selectedEpisode.runtime && <span>⏱ {selectedEpisode.runtime}m</span>}
                {selectedEpisode.vote_average > 0 && <span style={{ color: '#fbbf24' }}>★ {selectedEpisode.vote_average?.toFixed(1)}</span>}
              </div>
              <p style={{ lineHeight: '1.7', color: '#c4c4c4', marginBottom: '1.75rem', fontSize: '0.97rem' }}>
                {selectedEpisode.overview || 'No overview available for this episode.'}
              </p>
              <button 
                className="detail-btn btn-primary"
                style={{ width: '100%', justifyContent: 'center' }}
                onClick={() => {
                  window.location.hash = `episode/tv/${movieId}/season/${selectedSeason}/episode/${selectedEpisode.episode_number}`;
                  setSelectedEpisode(null);
                }}
              >
                <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
                Open Full Episode Page
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MovieDetail;
