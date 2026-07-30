import { useState, useEffect } from 'react';
import { getAiRecommendations } from '../services/gemini';
import { searchMedia } from '../services/tmdb';
import MovieCard from '../components/MovieCard';
import { Skeleton } from '../components/SkeletonLoader';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { incrementStat } from '../services/achievements';
import './AiDiscoveryPage.css';

const SEARCH_CAPTIONS = [
  "Analyzing your request and scanning the cinematic universe...",
  "Consulting movie critics across space and time...",
  "Matching themes, plot twists, and character tropes...",
  "Brewing personalized recommendations for you...",
  "Polishing your custom watchlist..."
];

const AiResultSkeleton = () => (
  <div className="ai-result-item glass-panel" style={{ opacity: 0.65 }}>
    <div className="ai-result-poster">
      <Skeleton height="240px" borderRadius="12px" />
    </div>
    <div className="ai-result-content" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
      <Skeleton width="45%" height="2.2rem" borderRadius="8px" />
      <div style={{ display: 'flex', gap: '0.8rem' }}>
        <Skeleton width="70px" height="1.4rem" borderRadius="4px" />
        <Skeleton width="50px" height="1.4rem" borderRadius="4px" />
        <Skeleton width="60px" height="1.4rem" borderRadius="4px" />
      </div>
      <Skeleton width="100%" height="4.5rem" borderRadius="12px" />
    </div>
  </div>
);

const AiDiscoveryPage = () => {
  const [prompt, setPrompt] = useState(() => sessionStorage.getItem('cinescope_ai_prompt') || '');
  const [results, setResults] = useState(() => {
    const saved = sessionStorage.getItem('cinescope_ai_results');
    return saved ? JSON.parse(saved) : [];
  });
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [captionIndex, setCaptionIndex] = useState(0);

  useEffect(() => {
    if (!loading) {
      setCaptionIndex(0);
      return;
    }
    const interval = setInterval(() => {
      setCaptionIndex((prev) => (prev + 1) % SEARCH_CAPTIONS.length);
    }, 2200);
    return () => clearInterval(interval);
  }, [loading]);

  useEffect(() => {
    sessionStorage.setItem('cinescope_ai_prompt', prompt);
  }, [prompt]);

  useEffect(() => {
    sessionStorage.setItem('cinescope_ai_results', JSON.stringify(results));
  }, [results]);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    if (currentUser) {
      incrementStat(currentUser.uid, 'aiSearchesCount');
    }

    setLoading(true);
    setError(null);
    setResults([]);

    try {
      // 1. Get raw JSON recommendations from Gemini
      const aiRecs = await getAiRecommendations(prompt);
      
      // 2. Fetch TMDB details for each recommendation
      const tmdbPromises = aiRecs.map(async (rec) => {
        try {
          const searchData = await searchMedia(rec.title);
          // Try to find the exact match, prioritizing by mediaType if possible
          const match = searchData.find(item => item.mediaType === rec.mediaType) || searchData[0];
          
          if (match) {
            return {
              ...match,
              rationale: rec.rationale
            };
          }
          return null;
        } catch (err) {
          console.error(`Error fetching TMDB for ${rec.title}:`, err);
          return null;
        }
      });

      const hydratedRecs = (await Promise.all(tmdbPromises)).filter(Boolean);
      
      if (hydratedRecs.length === 0) {
        setError("We couldn't find matches for the AI's recommendations. Try another prompt.");
      } else {
        setResults(hydratedRecs);
      }
    } catch (err) {
      console.error(err);
      setError("AI Discovery is currently unavailable or there was an error with your prompt. Details: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="ai-discovery-page">
      <div className="ai-header">
        <h1 className="ai-title">What Should I Watch?</h1>
        <p className="ai-subtitle">Describe your mood, a scenario, or specific tropes and our AI will curate the perfect watchlist.</p>
        
        <form onSubmit={handleSearch} className="ai-search-form">
          <input 
            type="text" 
            placeholder="e.g. A psychological thriller set in space with a mind-bending twist..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            className="ai-search-input"
            disabled={loading}
          />
          <button type="submit" className="ai-search-btn" disabled={loading || !prompt.trim()}>
            {loading ? 'Thinking...' : 'Inspire Me'}
          </button>
        </form>
      </div>

      <div className="ai-results-container">
        {loading && (
          <div className="ai-loading-state">
            <div className="ai-pulse"></div>
            <div style={{ height: '2.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <AnimatePresence mode="wait">
                <motion.p
                  key={captionIndex}
                  className="ai-loading-text"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.3 }}
                >
                  {SEARCH_CAPTIONS[captionIndex]}
                </motion.p>
              </AnimatePresence>
            </div>
            <div className="ai-results-list" style={{ marginTop: '2rem', width: '100%' }}>
              {Array.from({ length: 3 }).map((_, i) => (
                <AiResultSkeleton key={i} />
              ))}
            </div>
          </div>
        )}

        {error && (
          <div className="empty-state error-state">
            <p>{error}</p>
          </div>
        )}

        {!loading && !error && results.length > 0 && (
          <div className="ai-results">
            <motion.div 
              className="ai-results-list"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              {results.map((movie, index) => (
                <motion.div 
                  key={movie.id} 
                  className="ai-result-item glass-panel"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  onClick={() => window.location.hash = `${movie.mediaType || 'movie'}/${movie.id}`}
                  style={{ cursor: 'pointer' }}
                >
                  <div className="ai-result-poster">
                    <div className="ai-poster-container">
                      {movie.poster ? (
                        <img src={movie.poster} alt={`${movie.title} poster`} className="ai-poster-img" loading="lazy" />
                      ) : (
                        <div className="ai-poster-fallback">
                          <span>{movie.title}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="ai-result-content">
                    <h2>{movie.title}</h2>
                    <div className="ai-result-meta">
                      <span className="ai-result-badge">{movie.mediaType === 'tv' ? 'TV Series' : 'Movie'}</span>
                      <span className="ai-result-year">{movie.year}</span>
                      <span className="ai-result-rating">★ {movie.rating}</span>
                    </div>
                    <p className="ai-result-rationale">
                      <span className="ai-sparkle">✨</span> 
                      {movie.rationale}
                    </p>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AiDiscoveryPage;
