import { useState } from 'react';
import { getAiMovieDebate } from '../../services/gemini';
import { searchMedia } from '../../services/tmdb';
import './CineAiTools.css';

const MovieDebate = () => {
  const [movieA, setMovieA] = useState('');
  const [movieB, setMovieB] = useState('');
  const [suggestionsA, setSuggestionsA] = useState([]);
  const [suggestionsB, setSuggestionsB] = useState([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleInputChange = async (value, type) => {
    if (type === 'A') {
      setMovieA(value);
      if (value.trim().length > 1) {
        try {
          const results = await searchMedia(value);
          setSuggestionsA(results.slice(0, 5));
        } catch (err) {
          console.error(err);
        }
      } else {
        setSuggestionsA([]);
      }
    } else {
      setMovieB(value);
      if (value.trim().length > 1) {
        try {
          const results = await searchMedia(value);
          setSuggestionsB(results.slice(0, 5));
        } catch (err) {
          console.error(err);
        }
      } else {
        setSuggestionsB([]);
      }
    }
  };

  const handleDebate = async (e) => {
    e.preventDefault();
    if (!movieA.trim() || !movieB.trim()) return;
    
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const debateResult = await getAiMovieDebate(movieA, movieB);
      setResult(debateResult);
    } catch (err) {
      console.error(err);
      setError("The debate got too heated! Details: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="cineai-tool-page page-container">
      <div className="cineai-tool-header">
        <h1>Movie Debate</h1>
        <p>Can't decide? Let AI compare them across 9 categories.</p>
      </div>

      <div className="debate-container">
        <form onSubmit={handleDebate} className="debate-form">
          <div className="versus-inputs">
            <div className="input-suggest-wrapper">
              <input 
                type="text" 
                placeholder="First Movie..." 
                value={movieA} 
                onChange={e => handleInputChange(e.target.value, 'A')}
                onBlur={() => setTimeout(() => setSuggestionsA([]), 200)}
                required
              />
              {suggestionsA.length > 0 && (
                <div className="suggestions-dropdown">
                  {suggestionsA.map((movie) => (
                    <div 
                      key={movie.id} 
                      className="suggestion-item" 
                      onClick={() => {
                        setMovieA(movie.title);
                        setSuggestionsA([]);
                      }}
                    >
                      {movie.poster ? (
                        <img src={movie.poster} alt={movie.title} className="suggest-poster" />
                      ) : (
                        <div className="suggest-poster-placeholder">🎬</div>
                      )}
                      <div className="suggest-info">
                        <span className="suggest-title">{movie.title}</span>
                        <span className="suggest-meta">{movie.year} • {movie.category}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div className="vs-badge">VS</div>
            
            <div className="input-suggest-wrapper">
              <input 
                type="text" 
                placeholder="Second Movie..." 
                value={movieB} 
                onChange={e => handleInputChange(e.target.value, 'B')}
                onBlur={() => setTimeout(() => setSuggestionsB([]), 200)}
                required
              />
              {suggestionsB.length > 0 && (
                <div className="suggestions-dropdown">
                  {suggestionsB.map((movie) => (
                    <div 
                      key={movie.id} 
                      className="suggestion-item" 
                      onClick={() => {
                        setMovieB(movie.title);
                        setSuggestionsB([]);
                      }}
                    >
                      {movie.poster ? (
                        <img src={movie.poster} alt={movie.title} className="suggest-poster" />
                      ) : (
                        <div className="suggest-poster-placeholder">🎬</div>
                      )}
                      <div className="suggest-info">
                        <span className="suggest-title">{movie.title}</span>
                        <span className="suggest-meta">{movie.year} • {movie.category}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <button type="submit" className="btn-primary debate-submit" disabled={loading}>
            {loading ? 'Judging...' : 'Start Debate'}
          </button>
        </form>

        {error && <div className="error-message">{error}</div>}

        {result && !loading && (
          <div className="debate-results animated-entrance">
            <div className="debate-winner-banner">
              <h2>Winner: {result.overallWinner}</h2>
              <p>"{result.verdict}"</p>
            </div>

            <div className="debate-categories">
              {result.categories?.map((cat, idx) => (
                <div key={idx} className="debate-category-row">
                  <div className="cat-name">{cat.name}</div>
                  <div className="cat-winner">{cat.winner}</div>
                  <div className="cat-reason">{cat.reason}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MovieDebate;
