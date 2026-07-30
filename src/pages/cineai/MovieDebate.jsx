import { useState } from 'react';
import { getAiMovieDebate } from '../../services/gemini';
import './CineAiTools.css';

const MovieDebate = () => {
  const [movieA, setMovieA] = useState('');
  const [movieB, setMovieB] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

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
      setError("The debate got too heated! Something went wrong.");
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
            <input 
              type="text" 
              placeholder="First Movie..." 
              value={movieA} 
              onChange={e => setMovieA(e.target.value)}
              required
            />
            <div className="vs-badge">VS</div>
            <input 
              type="text" 
              placeholder="Second Movie..." 
              value={movieB} 
              onChange={e => setMovieB(e.target.value)}
              required
            />
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
            
            <div className="ai-actions" style={{ marginTop: '2rem', justifyContent: 'center' }}>
                <button className="btn-secondary" onClick={() => {
                  const temp = movieA;
                  setMovieA(movieB);
                  setMovieB(temp);
                  setResult(null);
                }}>Reverse Debate</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MovieDebate;
