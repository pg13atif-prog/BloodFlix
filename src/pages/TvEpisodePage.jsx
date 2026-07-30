import { useState, useEffect } from 'react';
import { getTvEpisode, getMovieDetails } from '../services/tmdb';
import { useAuth } from '../context/AuthContext';
import { addToWatched, isWatched, removeFromWatched } from '../services/firestore';
import './MovieDetail.css';

const TvEpisodePage = ({ seriesId, seasonNumber, episodeNumber, onBack }) => {
  const [episode, setEpisode] = useState(null);
  const [series, setSeries] = useState(null);
  const [status, setStatus] = useState('loading');
  const [isWatchedItem, setIsWatchedItem] = useState(false);
  const { currentUser } = useAuth();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    const controller = new AbortController();
    setStatus('loading');

    Promise.all([
      getTvEpisode(seriesId, seasonNumber, episodeNumber, controller.signal),
      getMovieDetails(seriesId, 'tv', controller.signal),
    ])
      .then(([episodeData, seriesData]) => {
        setEpisode(episodeData);
        setSeries(seriesData);
        setStatus('success');
      })
      .catch((err) => {
        if (err.name !== 'AbortError') {
          setStatus('error');
        }
      });

    return () => controller.abort();
  }, [seriesId, seasonNumber, episodeNumber]);

  useEffect(() => {
    if (currentUser && episode) {
      const episodeKey = `${seriesId}_s${seasonNumber}e${episodeNumber}`;
      isWatched(currentUser.uid, episodeKey).then(setIsWatchedItem).catch(console.error);
    }
  }, [currentUser, episode, seriesId, seasonNumber, episodeNumber]);

  const handleMarkWatched = async () => {
    if (!currentUser) return alert('Please log in to mark episodes as watched.');
    const episodeKey = `${seriesId}_s${seasonNumber}e${episodeNumber}`;
    const runtime = episode?.runtime || 45;

    if (isWatchedItem) {
      await removeFromWatched(currentUser.uid, episodeKey);
      setIsWatchedItem(false);
    } else {
      await addToWatched(
        currentUser.uid,
        {
          id: episodeKey,
          title: `${series?.title} – S${seasonNumber}E${episodeNumber}: ${episode?.name}`,
          poster: episode?.still_path ? `https://image.tmdb.org/t/p/w500${episode.still_path}` : series?.poster,
          category: series?.category || 'TV Show',
          year: episode?.air_date?.slice(0, 4) || '—',
          rating: episode?.vote_average?.toFixed(1) || '—',
          mediaType: 'tv',
        },
        runtime
      );
      setIsWatchedItem(true);
    }
  };

  if (status === 'loading') {
    return (
      <div className="movie-detail-page" style={{ minHeight: '100vh', paddingTop: '120px' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto', padding: '0 2rem' }}>
          <div className="skeleton skeleton-backdrop" style={{ height: '400px', borderRadius: '16px' }} />
          <div className="skeleton skeleton-title" style={{ marginTop: '2rem' }} />
          <div className="skeleton skeleton-overview" style={{ marginTop: '1rem' }} />
        </div>
      </div>
    );
  }

  if (status === 'error' || !episode) {
    return (
      <div className="movie-detail-state error-state">
        <h2 className="error-title">Episode Not Found</h2>
        <p className="error-desc">We couldn't load this episode. It may be unavailable.</p>
        <button className="btn-primary error-btn" onClick={onBack}>Go Back</button>
      </div>
    );
  }

  return (
    <div className="movie-detail-page">
      <div className="detail-header-nav">
        <button className="btn-back" onClick={onBack} aria-label="Go back">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Back to Series
        </button>
      </div>

      {/* Hero Image */}
      {episode.still_path && (
        <div style={{ width: '100%', maxHeight: '480px', overflow: 'hidden', position: 'relative' }}>
          <img
            src={`https://image.tmdb.org/t/p/original${episode.still_path}`}
            alt={episode.name}
            style={{ width: '100%', height: '480px', objectFit: 'cover', display: 'block' }}
          />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, #0f0f1a 20%, transparent 70%)' }} />
        </div>
      )}

      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '2rem', position: 'relative', zIndex: 1 }}>
        {/* Breadcrumb */}
        <p style={{ color: '#e50914', fontWeight: 600, marginBottom: '0.5rem', fontSize: '0.95rem' }}>
          <span
            style={{ cursor: 'pointer', textDecoration: 'underline' }}
            onClick={() => window.location.hash = `tv/${seriesId}`}
          >
            {series?.title}
          </span>
          {' '}&rsaquo;{' '}Season {seasonNumber} &rsaquo; Episode {episodeNumber}
        </p>

        <h1 style={{ fontSize: 'clamp(1.8rem, 4vw, 2.8rem)', marginBottom: '0.5rem', lineHeight: 1.2 }}>
          {episode.name}
        </h1>

        {/* Meta Row */}
        <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', color: '#aaa', marginBottom: '2rem', fontSize: '1rem', alignItems: 'center' }}>
          <span>S{seasonNumber} E{episodeNumber}</span>
          <span>Aired: {episode.air_date || 'Unknown'}</span>
          {episode.runtime && <span>⏱ {episode.runtime}m</span>}
          {episode.vote_average > 0 && (
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#fbbf24' }}>
              ★ {episode.vote_average?.toFixed(1)}
              <span style={{ color: '#aaa', fontSize: '0.85rem' }}>({episode.vote_count} votes)</span>
            </span>
          )}
        </div>

        {/* Actions */}
        <div className="detail-actions" style={{ marginBottom: '2.5rem' }}>
          <button
            className={`detail-btn btn-secondary ${isWatchedItem ? 'watched' : ''}`}
            onClick={handleMarkWatched}
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
            {isWatchedItem ? 'Marked as Watched' : 'Mark as Watched'}
          </button>
        </div>

        {/* Overview */}
        <div style={{ marginBottom: '2rem' }}>
          <h3 style={{ fontSize: '1.3rem', marginBottom: '1rem', color: '#fff' }}>Overview</h3>
          <p style={{ lineHeight: '1.8', color: '#ccc', fontSize: '1.05rem' }}>
            {episode.overview || 'No overview available for this episode.'}
          </p>
        </div>

        {/* Guest Stars */}
        {episode.guest_stars && episode.guest_stars.length > 0 && (
          <div>
            <h3 style={{ fontSize: '1.3rem', marginBottom: '1rem', color: '#fff' }}>Guest Stars</h3>
            <div className="cast-grid">
              {episode.guest_stars.slice(0, 8).map((star) => (
                <div key={star.id} className="cast-card">
                  <div className="cast-avatar">
                    {star.profile_path ? (
                      <img src={`https://image.tmdb.org/t/p/w185${star.profile_path}`} alt={star.name} loading="lazy" />
                    ) : (
                      <div className="cast-avatar-fallback">{star.name.charAt(0)}</div>
                    )}
                  </div>
                  <div className="cast-info">
                    <p className="cast-name">{star.name}</p>
                    <p className="cast-character">{star.character}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Crew */}
        {episode.crew && episode.crew.filter(c => ['Director', 'Writer'].includes(c.job)).length > 0 && (
          <div style={{ marginTop: '2rem' }}>
            <h3 style={{ fontSize: '1.3rem', marginBottom: '1rem', color: '#fff' }}>Key Crew</h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
              {episode.crew.filter(c => ['Director', 'Writer'].includes(c.job)).map((person) => (
                <div key={`${person.id}-${person.job}`} style={{ background: 'rgba(255,255,255,0.05)', padding: '0.75rem 1.25rem', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.1)' }}>
                  <p style={{ margin: 0, fontWeight: 600, color: '#fff' }}>{person.name}</p>
                  <p style={{ margin: 0, fontSize: '0.85rem', color: '#aaa' }}>{person.job}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TvEpisodePage;
