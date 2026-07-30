import { useState } from 'react';
import { getAiPickForMe } from '../../services/gemini';
import { searchMedia } from '../../services/tmdb';
import MovieCard from '../../components/MovieCard';
import './CineAiTools.css';

const PickForMe = () => {
  const [loading, setLoading] = useState(false);
  const [movie, setMovie] = useState(null);
  const [error, setError] = useState(null);

  const handlePick = async () => {
    setLoading(true);
    setError(null);
    try {
      const aiPick = await getAiPickForMe();
      if (!aiPick || !aiPick.title) throw new Error("AI returned empty result");
      
      const tmdbResults = await searchMedia(aiPick.title);
      const match = tmdbResults.find(m => m.mediaType === aiPick.mediaType) || tmdbResults[0];
      
      if (!match) throw new Error("Could not find movie on TMDB");
      
      setMovie({ ...match, rationale: aiPick.rationale });
    } catch (err) {
      console.error(err);
      setError("Oops. Our AI got stage fright. Try again!");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="cineai-tool-page page-container">
      <div className="cineai-tool-header">
        <h1>Pick For Me</h1>
        <p>The fastest way to pick a movie. Press the button, get a certified banger instantly.</p>
      </div>

      <div className="pick-for-me-container">
        {!movie && !loading && (
          <button className="massive-pick-btn" onClick={handlePick}>
            Find A Movie
          </button>
        )}

        {loading && (
          <div className="ai-loading-state">
            <div className="ai-spinner"></div>
            <p>Our Sommelier is searching...</p>
          </div>
        )}

        {error && <div className="error-message">{error}</div>}

        {movie && !loading && (
          <div className="ai-result-card animated-entrance">
            <div className="ai-result-poster">
              <MovieCard movie={movie} />
            </div>
            <div className="ai-result-info">
              <h2>{movie.title} <span>({movie.year})</span></h2>
              <p className="ai-rationale">"{movie.rationale}"</p>
              <div className="ai-actions">
                <button className="btn-primary" onClick={() => window.location.hash = `${movie.mediaType || 'movie'}/${movie.id}`}>View Details</button>
                <button className="btn-secondary" onClick={handlePick}>Pick Another</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PickForMe;
