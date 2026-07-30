import { useState } from 'react';
import { getAiPickForMe } from '../../services/gemini';
import { searchMedia } from '../../services/tmdb';
import MovieCard from '../../components/MovieCard';
import './CineAiTools.css';

const PickForMe = () => {
  const [loading, setLoading] = useState(false);
  const [movie, setMovie] = useState(null);
  const [error, setError] = useState(null);
  const [seenTitles, setSeenTitles] = useState([]);

  const handlePick = async () => {
    setLoading(true);
    setError(null);
    try {
      const aiPick = await getAiPickForMe(seenTitles);
      if (!aiPick || !aiPick.title) throw new Error("AI returned empty result");
      
      let searchTitle = aiPick.title;
      // Guarantee no duplicate title in session
      if (seenTitles.map(t => t.toLowerCase()).includes(searchTitle.toLowerCase())) {
        const fallbacks = ["Inception", "Interstellar", "Pulp Fiction", "The Dark Knight", "Parasite", "Gladiator", "Whiplash", "Spirited Away", "Everything Everywhere All at Once", "Fight Club"];
        searchTitle = fallbacks.find(f => !seenTitles.map(t => t.toLowerCase()).includes(f.toLowerCase())) || searchTitle;
      }

      const tmdbResults = await searchMedia(searchTitle);
      const match = tmdbResults.find(m => m.mediaType === (aiPick.mediaType || 'movie')) || tmdbResults[0];
      
      if (!match) throw new Error("Could not find title on TMDB");
      
      setSeenTitles(prev => [...prev, match.title]);
      setMovie({ ...match, rationale: aiPick.rationale });
    } catch (err) {
      console.error(err);
      setError("Oops. Our AI got stage fright. Details: " + err.message);
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
              {movie.poster ? (
                <img src={movie.poster} alt={movie.title} className="pick-poster-img" />
              ) : (
                <div className="pick-poster-placeholder">{movie.title}</div>
              )}
            </div>
            <div className="ai-result-info">
              <h2>{movie.title} {movie.year && <span>({movie.year})</span>}</h2>
              <p className="ai-rationale">&ldquo;{movie.rationale}&rdquo;</p>
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
