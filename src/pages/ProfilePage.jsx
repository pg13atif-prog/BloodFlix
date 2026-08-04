import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  getWatchlist, removeFromWatchlist,
  getWatched, removeFromWatched,
  getLiked, removeFromLiked
} from '../services/firestore';
import MovieCard from '../components/MovieCard';
import './ProfilePage.css';

import { getUserStats, ACHIEVEMENTS_LIST } from '../services/achievements';
import { ensureFriendCode } from '../services/friends';
import { ref, get } from 'firebase/database';
import { db } from '../services/firebase';

import AuthModal from '../components/AuthModal';

// ── Compact List Card with Remove button ──────────────────────────────────────
const MediaListItem = ({ movie, onRemove, onNavigate }) => {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      className="profile-list-item"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => onNavigate(movie)}
    >
      <div className="profile-list-poster">
        {movie.poster ? (
          <img src={movie.poster} alt={movie.title} />
        ) : (
          <div className="profile-list-poster-fallback">{movie.title?.charAt(0)}</div>
        )}
        {hovered && (
          <button
            className="profile-list-remove"
            title="Remove"
            onClick={(e) => { e.stopPropagation(); onRemove(movie.id); }}
          >
            ✕
          </button>
        )}
      </div>
      <div className="profile-list-info">
        <h4>{movie.title}</h4>
        <p>{movie.year} · {movie.category} · {movie.mediaType === 'tv' ? 'TV' : 'Movie'}</p>
      </div>
      <div className="profile-list-rating">★ {movie.rating}</div>
    </div>
  );
};

// ── Main Profile Page ─────────────────────────────────────────────────────────
const ProfilePage = () => {
  const { currentUser, logout, linkGuestAccount } = useAuth();

  const [linkEmail, setLinkEmail] = useState('');
  const [linkPassword, setLinkPassword] = useState('');
  const [linkError, setLinkError] = useState('');
  const [isLinking, setIsLinking] = useState(false);

  const [watchlist, setWatchlist]   = useState([]);
  const [liked,     setLiked]       = useState([]);
  const [watched,   setWatched]     = useState([]);
  const [stats,     setStats]       = useState({
    aiSearchesCount: 0,
    trailersWatchedCount: 0,
    detailViewsCount: 0,
    uniqueViewedIds: [],
    viewedCountries: [],
    searchesCount: 0
  });
  const [unlockedAchievements, setUnlockedAchievements] = useState({});
  const [loading,   setLoading]     = useState(true);
  const [activeTab, setActiveTab]   = useState('liked');
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [sortBy, setSortBy] = useState('recent'); // 'recent' | 'title' | 'rating'
  const [friendCode, setFriendCode] = useState('');

  useEffect(() => {
    if (!currentUser) { setLoading(false); return; }
    Promise.all([
      getWatchlist(currentUser.uid),
      getLiked(currentUser.uid),
      getWatched(currentUser.uid),
      getUserStats(currentUser.uid),
      get(ref(db, `users/${currentUser.uid}/unlockedAchievements`)),
      ensureFriendCode(currentUser.uid, currentUser.email)
    ]).then(([wl, lk, wa, userStats, unlockedSnap, code]) => {
      setWatchlist(wl || []);
      setLiked(lk || []);
      setWatched(wa || []);
      setStats(userStats || {
        aiSearchesCount: 0,
        trailersWatchedCount: 0,
        detailViewsCount: 0,
        uniqueViewedIds: [],
        viewedCountries: [],
        searchesCount: 0
      });
      setUnlockedAchievements(unlockedSnap.exists() ? unlockedSnap.val() : {});
      setFriendCode(code || '');
      setLoading(false);
    }).catch(err => { console.error(err); setLoading(false); });
  }, [currentUser]);

  // Total watch time from "Already Watched" list only
  const totalMinutes = useMemo(() => watched.reduce((sum, m) => {
    const mins = parseInt(m.runtime, 10);
    return sum + (isNaN(mins) ? 0 : mins);
  }, 0), [watched]);
  const totalHours   = Math.floor(totalMinutes / 60);
  const totalDays    = Math.floor(totalHours / 24);
  const remHours     = totalHours % 24;

  // Top genre across all lists
  const topGenre = useMemo(() => {
    const counts = {};
    [...liked, ...watched, ...watchlist].forEach(m => {
      if (m.category) counts[m.category] = (counts[m.category] || 0) + 1;
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || '—';
  }, [liked, watched, watchlist]);

  const currentList = useMemo(() => {
    let list = [...({ liked, watchlist, watched }[activeTab] || [])];
    if (sortBy === 'title') {
      list.sort((a, b) => (a.title || a.name || '').localeCompare(b.title || b.name || ''));
    } else if (sortBy === 'rating') {
      list.sort((a, b) => (parseFloat(b.rating) || 0) - (parseFloat(a.rating) || 0));
    }
    return list;
  }, [liked, watchlist, watched, activeTab, sortBy]);

  const handleNavigate = (movie) => {
    window.location.hash = `${movie.mediaType || 'movie'}/${movie.id}`;
  };

  const handleRemoveWatchlist = async (id) => {
    await removeFromWatchlist(currentUser.uid, id);
    setWatchlist(p => p.filter(m => m.id !== id));
  };
  const handleRemoveLiked = async (id) => {
    await removeFromLiked(currentUser.uid, id);
    setLiked(p => p.filter(m => m.id !== id));
  };
  const handleRemoveWatched = async (id) => {
    await removeFromWatched(currentUser.uid, id);
    setWatched(p => p.filter(m => m.id !== id));
  };

  const handleLinkAccount = async (e) => {
    e.preventDefault();
    setLinkError('');
    setIsLinking(true);
    try {
      await linkGuestAccount(linkEmail, linkPassword);
      // Optional: alert or toast here
    } catch (err) {
      console.error(err);
      if (err.code === 'auth/email-already-in-use') {
        setLinkError('This email is already in use by another account.');
      } else if (err.code === 'auth/weak-password') {
        setLinkError('Password should be at least 6 characters.');
      } else {
        setLinkError(err.message);
      }
    }
    setIsLinking(false);
  };

  if (loading) {
    return <div className="page-container" style={{ paddingTop: '100px', textAlign: 'center', color: '#fff' }}>Loading Profile...</div>;
  }

  if (!currentUser) {
    return (
      <div className="profile-page page-container" style={{ paddingTop: '120px', paddingBottom: '4rem' }}>
        <div style={{ maxWidth: '440px', margin: '0 auto', background: 'rgba(15, 23, 42, 0.85)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '24px', padding: '3rem 2rem', backdropFilter: 'blur(16px)', textAlign: 'center', boxShadow: '0 20px 40px rgba(0,0,0,0.6)' }}>
          <div style={{ width: '68px', height: '68px', background: 'rgba(229, 9, 20, 0.15)', border: '1.5px solid rgba(229, 9, 20, 0.4)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', color: '#e50914' }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
          </div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '0.75rem', color: '#fff' }}>Welcome to CineScope</h2>
          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.95rem', marginBottom: '2rem', lineHeight: 1.5 }}>Sign in to view your personalized profile, save favorite movies, track watch time, and earn achievements.</p>
          <button style={{ width: '100%', padding: '0.85rem', fontSize: '1rem', fontWeight: 700, borderRadius: '30px', background: 'linear-gradient(135deg, #e50914 0%, #ff3b47 100%)', border: 'none', color: '#fff', cursor: 'pointer', boxShadow: '0 4px 15px rgba(229, 9, 20, 0.4)' }} onClick={() => setIsAuthModalOpen(true)}>
            Sign In / Register
          </button>
        </div>
        <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
      </div>
    );
  }

  const email = currentUser.email || '';
  const username = email ? email.split('@')[0] : 'Guest';
  const avatarLetter = email ? email.charAt(0).toUpperCase() : '?';

  // Circular arc helper (svg-based watchtime ring)
  const ringPct = Math.min(totalDays / 30, 1); // max ring fill = 30 days
  const r = 70, cx = 90, cy = 90, circ = 2 * Math.PI * r;
  const dash = ringPct * circ;

  const tabs = [
    { key: 'liked',     label: 'Liked',          count: liked.length     },
    { key: 'watchlist', label: 'Watchlist',       count: watchlist.length },
    { key: 'watched',   label: 'Already Watched', count: watched.length   },
  ];


  const removeMap = { liked: handleRemoveLiked, watchlist: handleRemoveWatchlist, watched: handleRemoveWatched };
  const unlockedCount = Object.keys(unlockedAchievements).length;
  const totalAchievements = ACHIEVEMENTS_LIST.length;

  return (
    <div className="profile-page profile-v2">

      {/* ── Hero / Cover ─────────────────────────────────────────── */}
      <div className="profile-hero">
        <div className="profile-hero-overlay" />
        <div className="profile-hero-content">
          <div className="profile-avatar-xl">{avatarLetter}</div>
          <div>
            <h1 className="profile-hero-name">{username}</h1>
            <p className="profile-hero-email">{email}</p>
            {friendCode && (
              <div className="profile-friend-code-display">
                <span className="fc-label">Friend Code:</span>
                <span className="fc-code">{friendCode}</span>
                <button 
                  className="fc-copy-btn" 
                  onClick={() => navigator.clipboard.writeText(friendCode)}
                  title="Copy Friend Code"
                >
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                </button>
              </div>
            )}
          </div>
          <button className="profile-logout-btn" onClick={() => { logout(); window.location.hash = ''; }}>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
            </svg>
            Log Out
          </button>
        </div>
      </div>

      <div className="profile-v2-body">

        {currentUser.isAnonymous && (
          <div className="guest-link-banner glass-panel">
            <div className="guest-link-info">
              <h3>Secure Your Guest Account</h3>
              <p>Link your account to an email and password to permanently save your watch history, lists, and achievements.</p>
            </div>
            <form className="guest-link-form" onSubmit={handleLinkAccount}>
              {linkError && <p className="link-error">{linkError}</p>}
              <div className="link-inputs">
                <input 
                  type="email" 
                  placeholder="Email Address" 
                  value={linkEmail}
                  onChange={e => setLinkEmail(e.target.value)}
                  required
                />
                <input 
                  type="password" 
                  placeholder="Password (Min 6)" 
                  value={linkPassword}
                  onChange={e => setLinkPassword(e.target.value)}
                  required
                />
                <button type="submit" className="btn-primary" disabled={isLinking}>
                  {isLinking ? 'Linking...' : 'Link Account'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ── Compact Watch Time & Stats Box ──────────────────────── */}
        <div className="watchtime-card compact-stats">
          <div className="watchtime-badge">
            <div className="watchtime-badge-inner">
              <div className="watchtime-badge-val">{totalHours}h</div>
              <div className="watchtime-badge-lbl">watched</div>
            </div>
          </div>
          <div className="watchtime-stats">
            <h2 className="watchtime-title">Your Watch Stats</h2>
            <div className="watchtime-breakdown">
              <div className="wt-stat">
                <span className="wt-val">{watchlist.length}</span>
                <span className="wt-label">Saved</span>
              </div>
              <div className="wt-stat">
                <span className="wt-val">{watched.length}</span>
                <span className="wt-label">Watched</span>
              </div>
              <div className="wt-stat">
                <span className="wt-val">{liked.length}</span>
                <span className="wt-label">Liked</span>
              </div>
              <div className="wt-stat">
                <span className="wt-val">{topGenre}</span>
                <span className="wt-label">Top Genre</span>
              </div>
              <div className="wt-stat">
                <span className="wt-val">{stats.aiSearchesCount}</span>
                <span className="wt-label">AI Searches</span>
              </div>
              <div className="wt-stat">
                <span className="wt-val">{stats.trailersWatchedCount}</span>
                <span className="wt-label">Trailers</span>
              </div>
              <div className="wt-stat">
                <span className="wt-val">{unlockedCount}</span>
                <span className="wt-label">Earned</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Achievements Banner (Links to #achievements) ───────── */}
        <div className="profile-achievements-banner glass-panel" onClick={() => window.location.hash = 'achievements'}>
          <div className="ach-banner-left">
            <span className="ach-banner-icon">🏆</span>
            <div>
              <h3>Achievements &amp; Badges</h3>
              <p>{unlockedCount} of {totalAchievements} Unlocked ({Math.round((unlockedCount / totalAchievements) * 100)}%)</p>
            </div>
          </div>
          <button className="btn-secondary ach-banner-btn" onClick={(e) => { e.stopPropagation(); window.location.hash = 'achievements'; }}>
            View Achievements →
          </button>
        </div>

        {/* ── Tabs & Sort Controls ─────────────────────────────────── */}
        <div className="profile-controls-bar">
          <div className="profile-tabs-bar">
            {tabs.map(t => (
              <button
                key={t.key}
                className={`profile-tab-btn ${activeTab === t.key ? 'active' : ''}`}
                onClick={() => setActiveTab(t.key)}
              >
                {t.label}
                <span className="profile-tab-count">{t.count}</span>
              </button>
            ))}
          </div>

          <div className="profile-sort-container">
            <label htmlFor="profile-sort">Sort by:</label>
            <select
              id="profile-sort"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="profile-sort-select"
            >
              <option value="recent">Recently Added</option>
              <option value="title">Title (A-Z)</option>
              <option value="rating">Rating (High to Low)</option>
            </select>
          </div>
        </div>

        {/* ── Tab Content ──────────────────────────────────────────── */}
        {loading ? (
          <div className="profile-list-grid">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="skeleton" style={{ height: '90px', borderRadius: '12px' }} />
            ))}
          </div>
        ) : currentList.length === 0 ? (
          <div className="profile-empty-state">
            <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>
              { activeTab === 'liked' ? '❤️' : activeTab === 'watchlist' ? '🔖' : '✅' }
            </div>
            <h3>Nothing here yet</h3>
            <p>
              { activeTab === 'liked' ? 'Like titles to see them here.' 
              : activeTab === 'watchlist' ? 'Add titles to your watchlist.'
              : 'Mark titles as Already Watched.' }
            </p>
            <button className="btn-primary" onClick={() => window.location.hash = ''}>Browse Titles</button>
          </div>
        ) : (
          <div className="profile-list-grid">
            {currentList.map(movie => (
              <MediaListItem
                key={movie.id}
                movie={movie}
                onNavigate={handleNavigate}
                onRemove={removeMap[activeTab]}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfilePage;
