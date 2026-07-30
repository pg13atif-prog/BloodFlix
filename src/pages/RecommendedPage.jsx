import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getLiked, getWatched, getWatchlist } from '../services/firestore';
import { getRecommendations, getSimilarMovies } from '../services/tmdb';
import MovieCard from '../components/MovieCard';
import { CardSkeleton } from '../components/SkeletonLoader';
import './MediaBrowsePage.css';

const RecommendedPage = () => {
  const { currentUser } = useAuth();
  const [movies, setMovies] = useState([]);
  const [status, setStatus] = useState('loading');

  useEffect(() => {
    if (!currentUser) {
      setStatus('unauthenticated');
      return;
    }

    const controller = new AbortController();
    setStatus('loading');

    const fetchRecommendations = async () => {
      try {
        const [liked, watched, watchlist] = await Promise.all([
          getLiked(currentUser.uid),
          getWatched(currentUser.uid),
          getWatchlist(currentUser.uid),
        ]);

        // Combine all sources, deduplicate, pick up to 6 seeds (prioritise liked)
        const seen = new Set();
        const unique = [...liked, ...watched, ...watchlist].filter(m => {
          if (seen.has(m.id)) return false;
          seen.add(m.id);
          return true;
        });

        if (unique.length === 0) {
          setMovies([]);
          setStatus('empty');
          return;
        }

        const seeds = unique.slice(0, 6);

        // Fetch recommendations for each seed in parallel
        const allResults = await Promise.all(
          seeds.map(seed =>
            getRecommendations(seed.id, seed.mediaType || 'movie', controller.signal)
              .catch(() => getSimilarMovies(seed.id, seed.mediaType || 'movie', controller.signal).catch(() => []))
          )
        );

        // Flatten, deduplicate, and exclude seeds already in user's lists
        const userIds = new Set(unique.map(m => m.id));
        const deduped = new Map();
        allResults.flat().forEach(m => {
          if (!userIds.has(m.id) && !deduped.has(m.id) && m.poster) {
            deduped.set(m.id, m);
          }
        });

        const result = Array.from(deduped.values()).slice(0, 40);
        setMovies(result);
        setStatus(result.length === 0 ? 'empty' : 'success');
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.error(err);
          setStatus('error');
        }
      }
    };

    fetchRecommendations();
    return () => controller.abort();
  }, [currentUser]);

  return (
    <div className="media-browse-page">
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>

        {/* Header */}
        <div style={{ marginBottom: '2.5rem' }}>
          <h1 style={{
            fontSize: 'clamp(1.8rem, 4vw, 2.8rem)',
            fontWeight: 700,
            color: '#fff',
            marginBottom: '0.5rem',
            lineHeight: 1.2,
          }}>
            Picked for you
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '1rem', margin: 0 }}>
            Based on your likes, watch history, and watchlist
          </p>
        </div>

        {/* States */}
        {status === 'unauthenticated' && (
          <div style={{ textAlign: 'center', paddingTop: '5rem' }}>
            <div style={{ fontSize: '4rem', marginBottom: '1.5rem' }}>🎬</div>
            <h2 style={{ color: '#fff', marginBottom: '0.75rem' }}>Sign in to see recommendations</h2>
            <p style={{ color: 'rgba(255,255,255,0.45)', marginBottom: '2rem' }}>
              Like movies, mark titles as watched, or save to your watchlist and we'll curate picks just for you.
            </p>
            <button
              onClick={() => window.location.hash = 'profile'}
              style={{ padding: '0.75rem 2rem', background: '#e50914', color: '#fff', border: 'none', borderRadius: '30px', fontSize: '1rem', fontWeight: 600, cursor: 'pointer' }}
            >
              Sign In
            </button>
          </div>
        )}

        {status === 'loading' && (
          <div className="media-grid">
            {Array.from({ length: 20 }).map((_, i) => <CardSkeleton key={i} />)}
          </div>
        )}

        {status === 'empty' && (
          <div style={{ textAlign: 'center', paddingTop: '5rem' }}>
            <div style={{ fontSize: '4rem', marginBottom: '1.5rem' }}>🌟</div>
            <h2 style={{ color: '#fff', marginBottom: '0.75rem' }}>Nothing to recommend yet</h2>
            <p style={{ color: 'rgba(255,255,255,0.45)', maxWidth: '420px', margin: '0 auto 2rem' }}>
              Start by liking a movie, marking something as watched, or adding titles to your watchlist.
            </p>
            <button
              onClick={() => window.location.hash = ''}
              style={{ padding: '0.75rem 2rem', background: '#e50914', color: '#fff', border: 'none', borderRadius: '30px', fontSize: '1rem', fontWeight: 600, cursor: 'pointer' }}
            >
              Browse Titles
            </button>
          </div>
        )}

        {status === 'error' && (
          <div style={{ textAlign: 'center', paddingTop: '5rem', color: 'rgba(255,255,255,0.5)' }}>
            <p>Something went wrong. Please try again later.</p>
          </div>
        )}

        {status === 'success' && (
          <div className="media-grid">
            {movies.map(movie => (
              <MovieCard key={movie.id} {...movie} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default RecommendedPage;
