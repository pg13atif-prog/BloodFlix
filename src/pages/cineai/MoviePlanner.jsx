import { useState } from 'react';
import { getAiPlannerRecommendation } from '../../services/gemini';
import { searchMedia } from '../../services/tmdb';
import MovieCard from '../../components/MovieCard';
import './CineAiTools.css';

const QUESTIONS = [
  { id: 'mood', label: 'What is your mood right now?', options: ['Happy', 'Sad', 'Excited', 'Tired', 'Thoughtful'] },
  { id: 'genre', label: 'Any specific genre preference?', options: ['Action', 'Comedy', 'Drama', 'Sci-Fi', 'Horror', 'Surprise Me'] },
  { id: 'company', label: 'Who are you watching with?', options: ['Alone', 'Partner', 'Friends', 'Family with Kids'] },
  { id: 'timeline', label: 'How much time do you have?', options: ['Under 90 mins', 'Around 2 hours', 'Give me an epic (2.5hr+)'] },
];

const MoviePlanner = () => {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(false);
  const [movie, setMovie] = useState(null);
  const [error, setError] = useState(null);

  const handleAnswer = async (answer) => {
    const currentQ = QUESTIONS[step];
    const newAnswers = { ...answers, [currentQ.id]: answer };
    setAnswers(newAnswers);

    if (step < QUESTIONS.length - 1) {
      setStep(step + 1);
    } else {
      // Submit
      setLoading(true);
      setError(null);
      try {
        const aiPick = await getAiPlannerRecommendation(newAnswers);
        const tmdbResults = await searchMedia(aiPick.title);
        const match = tmdbResults.find(m => m.mediaType === aiPick.mediaType) || tmdbResults[0];
        
        if (!match) throw new Error("Could not find movie on TMDB");
        
        setMovie({ ...match, rationale: aiPick.rationale });
      } catch (err) {
        console.error(err);
        setError("Our sommelier got confused. Details: " + err.message);
      } finally {
        setLoading(false);
      }
    }
  };

  const resetPlanner = () => {
    setStep(0);
    setAnswers({});
    setMovie(null);
    setError(null);
  };

  return (
    <div className="cineai-tool-page page-container">
      <div className="cineai-tool-header">
        <h1>Movie Night Planner</h1>
        <p>Answer a few questions and get the absolute perfect movie for tonight.</p>
      </div>

      <div className="planner-container">
        {!movie && !loading && (
          <div className="planner-step animated-entrance">
            <h2>{QUESTIONS[step].label}</h2>
            <div className="planner-options">
              {QUESTIONS[step].options.map(opt => (
                <button key={opt} className="planner-option-btn" onClick={() => handleAnswer(opt)}>
                  {opt}
                </button>
              ))}
            </div>
            <div className="planner-progress">
              Step {step + 1} of {QUESTIONS.length}
            </div>
          </div>
        )}

        {loading && (
          <div className="ai-loading-state">
            <div className="ai-spinner"></div>
            <p>Analyzing your preferences...</p>
          </div>
        )}

        {error && (
          <div className="error-message">
            {error}
            <button className="btn-secondary" onClick={resetPlanner} style={{marginTop: '1rem'}}>Restart Planner</button>
          </div>
        )}

        {movie && !loading && (
          <div className="ai-result-card animated-entrance">
            <div className="ai-result-poster">
              <MovieCard {...movie} />
            </div>
            <div className="ai-result-info">
              <div className="perfect-match-badge">Perfect Match</div>
              <h2>{movie.title} <span>({movie.year})</span></h2>
              <p className="ai-rationale">"{movie.rationale}"</p>
              <div className="ai-actions">
                <button className="btn-primary" onClick={() => window.location.hash = `${movie.mediaType || 'movie'}/${movie.id}`}>View Details</button>
                <button className="btn-secondary" onClick={resetPlanner}>Plan Another Night</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MoviePlanner;
