import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { ref, get, set, query, orderByChild, equalTo } from 'firebase/database';
import { db } from '../services/firebase';
import { getWatchlist, getLiked, getWatched } from '../services/firestore';
import { GoogleGenAI } from '@google/genai';
import MovieCard from '../components/MovieCard';
import './SocialPage.css';

const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
let ai;
if (apiKey) ai = new GoogleGenAI({ apiKey });

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
        // Also save a reverse lookup index
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

      // Calculate Compatibility (very naive overlap)
      const totalUnique = new Set([...myTitles, ...fTitles]).size;
      const overlap = new Set(myTitles.filter(t => fTitles.includes(t))).size;
      const compatibility = totalUnique === 0 ? 0 : Math.round((overlap / totalUnique) * 100);

      // 3. Ask Gemini for 5 Recommendations
      let recommendations = [];
      if (ai) {
        const prompt = `
          User A likes: ${myLiked.map(m=>m.title).slice(0, 10).join(', ')}.
          User B likes: ${fLiked.map(m=>m.title).slice(0, 10).join(', ')}.
          Based on the combined tastes of User A and User B, recommend exactly 5 movies they would BOTH enjoy watching together tonight.
          Return a JSON array of objects: { "title": "Exact Title", "rationale": "Why it's perfect for BOTH of them." }
          Return ONLY JSON.
        `;
        const res = await ai.models.generateContent({
          model: 'gemini-flash-latest',
          contents: prompt,
          config: { temperature: 0.7, responseMimeType: 'application/json' }
        });
        recommendations = JSON.parse(res.text.replace(/```json/g, '').replace(/```/g, '').trim());
      }

      setMatchResult({
        compatibility,
        sharedFavorites,
        recommendations
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
              {matchLoading ? 'Comparing Watchlists...' : '✨ Compare Watchlists'}
            </button>
          </form>
          {matchError && <p className="error-text">{matchError}</p>}
        </div>
      </div>

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
            <div className="recommendations-list">
              {matchResult.recommendations.map((rec, idx) => (
                <div key={idx} className="rec-item">
                  <h4>{rec.title}</h4>
                  <p>{rec.rationale}</p>
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
