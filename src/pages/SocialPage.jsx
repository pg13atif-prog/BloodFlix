import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { ref, get, set } from 'firebase/database';
import { db } from '../services/firebase';
import { getWatchlist, getLiked, getWatched } from '../services/firestore';
import { getFriendCompatibilityRecs } from '../services/gemini';
import { searchMedia } from '../services/tmdb';
import MovieCard from '../components/MovieCard';
import './SocialPage.css';

const generateFriendCode = () => {
  return 'CS-' + Math.random().toString(36).substring(2, 8).toUpperCase();
};

const SocialPage = () => {
  const { currentUser } = useAuth();
  const [friendCode, setFriendCode] = useState('');
  const [searchCode, setSearchCode] = useState('');
  const [loading, setLoading] = useState(true);
  const [matchLoading, setMatchLoading] = useState(false);
  const [matchError, setMatchError] = useState(null);
  const [matchResult, setMatchResult] = useState(null);
  
  const [loadingCaption, setLoadingCaption] = useState("Comparing Watchlists...");

  useEffect(() => {
    if (!matchLoading) return;
    
    const captions = [
      "Fetching friend's watchlist...",
      "Analyzing movie tastes...",
      "Comparing genres and ratings...",
      "Calculating compatibility score...",
      "Consulting CineAI for recommendations...",
      "Wrapping up results..."
    ];
    
    let index = 0;
    setLoadingCaption(captions[0]);
    
    const interval = setInterval(() => {
      index = (index + 1) % captions.length;
      setLoadingCaption(captions[index]);
    }, 2000);
    
    return () => clearInterval(interval);
  }, [matchLoading]);

  useEffect(() => {
    if (!currentUser) {
      window.location.hash = '#profile';
      return;
    }

    const initUser = async () => {
      const codeRef = ref(db, `users/${currentUser.uid}/friendCode`);
      const snap = await get(codeRef);
      if (snap.exists()) {
        setFriendCode(snap.val());
      } else {
        const newCode = generateFriendCode();
        await set(codeRef, newCode);
        await set(ref(db, `friendCodes/${newCode}`), currentUser.uid);
        setFriendCode(newCode);
      }
      setLoading(false);
    };

    initUser();
  }, [currentUser]);

  const handleMatch = async (e) => {
    e.preventDefault();
    if (!searchCode.trim()) return;
    
    setMatchLoading(true);
    setMatchError(null);
    setMatchResult(null);

    try {
      const codeToSearch = searchCode.trim().toUpperCase();
      if (codeToSearch === friendCode) {
        throw new Error("You can't match with yourself!");
      }

      // 1. Find Friend's UID
      const codeRef = ref(db, `friendCodes/${codeToSearch}`);
      const snap = await get(codeRef);
      
      if (!snap.exists()) {
        throw new Error("Invalid Friend Code");
      }
      const friendUid = snap.val();

      // 2. Fetch Both Users' Data
      const [myWl, myLiked, myWatched, fWl, fLiked, fWatched] = await Promise.all([
        getWatchlist(currentUser.uid), getLiked(currentUser.uid), getWatched(currentUser.uid),
        getWatchlist(friendUid), getLiked(friendUid), getWatched(friendUid)
      ]);

      const myTitles = [...myLiked, ...myWatched].map(m => m.title);
      const fTitles = [...fLiked, ...fWatched].map(m => m.title);
      
      const sharedFavorites = myLiked.filter(m => fLiked.find(fm => fm.id === m.id));

      // Calculate Compatibility (naive overlap)
      const totalUnique = new Set([...myTitles, ...fTitles]).size;
      const overlap = new Set(myTitles.filter(t => fTitles.includes(t))).size;
      const compatibility = totalUnique === 0 ? 0 : Math.round((overlap / totalUnique) * 100);

      // 3. Ask OpenRouter for Recommendations & Score
      const compatibilityData = await getFriendCompatibilityRecs(myTitles, fTitles);

      // Fetch TMDB details for each recommendation
      const tmdbPromises = compatibilityData.recommendations.map(async (rec) => {
        try {
          const searchData = await searchMedia(rec.title);
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

      setMatchResult({
        compatibility: compatibilityData.compatibility,
        sharedFavorites,
        recommendations: hydratedRecs
      });

    } catch (err) {
      console.error(err);
      setMatchError(err.message || "Something went wrong.");
    } finally {
      setMatchLoading(false);
    }
  };

  if (loading) return null;

  return (
    <div className="social-page page-container">
      <div className="social-header">
        <h1>Movie Match</h1>
        <p>Compare tastes with friends and find the perfect movie to watch together.</p>
      </div>

      <div className="social-content">
        <div className="friend-code-card">
          <h2>Your Friend Code</h2>
          <div className="code-display">{friendCode}</div>
          <p>Share this code with a friend so they can match with you.</p>
        </div>

        <div className="match-card">
          <h2>Match with a Friend</h2>
          <form onSubmit={handleMatch} className="match-form">
            <input 
              type="text" 
              placeholder="Enter Friend Code (e.g. CS-123456)" 
              value={searchCode}
              onChange={(e) => setSearchCode(e.target.value)}
              required
            />
            <button type="submit" className="match-btn" disabled={matchLoading}>
              {matchLoading ? 'Comparing...' : 'Compare Watchlists'}
            </button>
          </form>
          {matchError && <p className="error-text" style={{ marginTop: '1rem' }}>{matchError}</p>}
        </div>
      </div>

      {matchLoading && (
        <div className="ai-loading-state" style={{ marginTop: '3rem' }}>
          <div className="ai-spinner"></div>
          <p>{loadingCaption}</p>
        </div>
      )}

      {matchResult && (
        <div className="match-results animated-entrance">
          <div className="compatibility-score">
            <h3>Compatibility Score</h3>
            <div className="score-circle">
              <span>{matchResult.compatibility}%</span>
            </div>
          </div>

          {matchResult.sharedFavorites.length > 0 && (
            <div className="shared-favorites">
              <h3>You Both Loved</h3>
              <div className="social-grid">
                {matchResult.sharedFavorites.map(movie => (
                  <MovieCard key={movie.id} {...movie} />
                ))}
              </div>
            </div>
          )}

          <div className="ai-recommendations">
            <h3>AI Top Picks For Both Of You</h3>
            <div className="social-grid">
              {matchResult.recommendations.map((movie) => (
                <div key={movie.id} className="social-rec-card-wrapper" style={{ position: 'relative', display: 'flex', flexDirection: 'column' }}>
                  <MovieCard {...movie} />
                  <div className="social-rec-rationale" style={{
                    marginTop: '0.75rem',
                    fontSize: '0.85rem',
                    lineHeight: '1.4',
                    color: 'rgba(255, 255, 255, 0.7)',
                    fontStyle: 'italic',
                    background: 'rgba(255, 255, 255, 0.03)',
                    padding: '0.75rem',
                    borderRadius: '8px',
                    borderLeft: '3px solid var(--color-accent, #e50914)'
                  }}>
                    "{movie.rationale}"
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SocialPage;
