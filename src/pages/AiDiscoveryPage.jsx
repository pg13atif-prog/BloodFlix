import { useState, useEffect } from 'react';
import { getAiRecommendations } from '../services/gemini';
import { searchMedia } from '../services/tmdb';
import MovieCard from '../components/MovieCard';
import { CardSkeleton } from '../components/SkeletonLoader';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { incrementStat } from '../services/achievements';
import './AiDiscoveryPage.css';

const AiDiscoveryPage = () => {
  const [prompt, setPrompt] = useState(() => sessionStorage.getItem('cinescope_ai_prompt') || '');
  const [results, setResults] = useState(() => {
    const saved = sessionStorage.getItem('cinescope_ai_results');
    return saved ? JSON.parse(saved) : [];
  });
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

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
      setError("AI Discovery is currently unavailable or there was an error with your prompt.");
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
            <p>Analyzing your request and searching the cinematic universe...</p>
            <div className="search-grid" style={{ marginTop: '2rem' }}>
              {Array.from({ length: 5 }).map((_, i) => (
                <CardSkeleton key={i} />
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
