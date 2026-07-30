import { useState, useEffect } from 'react';
import {
  getMovieDetails,
  getMovieCredits,
  getMovieVideos,
  getSimilarMovies,
} from '../services/tmdb';
import { addToWatchlist, removeFromWatchlist, isInWatchlist } from '../services/firestore';
import { useAuth } from '../context/AuthContext';
import MovieRow from '../components/MovieRow';
import './MovieDetail.css';

const MovieDetail = ({ movieId, mediaType = 'movie', onBack }) => {
  const [movie, setMovie] = useState(null);
  const [cast, setCast] = useState([]);
  const [trailerKey, setTrailerKey] = useState(null);
  const [similarMovies, setSimilarMovies] = useState([]);
  const [status, setStatus] = useState('loading');
  const [showTrailerModal, setShowTrailerModal] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  
  const { currentUser } = useAuth();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    const controller = new AbortController();
    setStatus('loading');

    Promise.all([
      getMovieDetails(movieId, mediaType, controller.signal),
      getMovieCredits(movieId, mediaType, controller.signal),
      getMovieVideos(movieId, mediaType, controller.signal),
      getSimilarMovies(movieId, mediaType, controller.signal),
    ])
      .then(([detailsData, castData, videosData, similarData]) => {
        setMovie(detailsData);
        setCast(castData);
        setTrailerKey(videosData[0]?.key || null);
        setSimilarMovies(similarData);
        setStatus('success');
      })
      .catch((err) => {
        if (err.name !== 'AbortError') {
          console.error('Error fetching movie details:', err);
          setStatus('error');
        }
      });

    return () => controller.abort();
  }, [movieId, mediaType]);

  // Check if movie is in watchlist when user or movieId changes
  useEffect(() => {
    if (currentUser && movieId) {
      isInWatchlist(currentUser.uid, movieId)
        .then(saved => {
          setIsSaved(saved);
        })
        .catch(err => {
          console.error("Error checking watchlist status:", err);
          setIsSaved(false);
        });
    } else {
      setIsSaved(false);
    }
  }, [currentUser, movieId]);

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
      }
    } catch (err) {
      console.error('Error updating watchlist:', err);
      alert(`Failed to update watchlist: ${err.message}`);
    }
  };

  const getGenreColor = (genre) => {
    const safeGenre = genre.toLowerCase().replace(/[^a-z0-9-]/g, '-');
    return `var(--color-genre-${safeGenre}, var(--color-genre-default))`;
  };

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
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
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
                <span className="badge year-badge">{movie.year}</span>
                <span className="badge runtime-badge">{movie.runtime}</span>
                {movie.genres.map((g) => (
                  <span 
                    key={g} 
                    className="badge genre-badge" 
                    style={{ backgroundColor: getGenreColor(g) }}
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
                  onClick={() => setShowTrailerModal(true)}
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
                {isSaved ? 'In Watchlist' : 'Add to Watchlist'}
              </button>
            </div>

            {/* Overview */}
            <div className="detail-section">
              <h3 className="section-title">Overview</h3>
              <p className="detail-overview">
                {movie.overview || 'No overview description available for this movie.'}
              </p>
            </div>

            {/* Cast Section */}
            {cast.length > 0 && (
              <div className="detail-section">
                <h3 className="section-title">Top Billed Cast</h3>
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
          </div>
        </div>

      </div>

      {/* Similar Movies Row (Outside container for full width edge-to-edge alignment) */}
      {similarMovies.length > 0 && (
        <div className="detail-similar-section">
          <MovieRow title="More Like This" movies={similarMovies} />
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
    </div>
  );
};

export default MovieDetail;
