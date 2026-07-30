import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  getWatchlist, removeFromWatchlist,
  getWatched, removeFromWatched,
  getLiked, removeFromLiked
} from '../services/firestore';
import MovieCard from '../components/MovieCard';
import './ProfilePage.css';

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
  const { currentUser, logout } = useAuth();

  const [watchlist, setWatchlist]   = useState([]);
  const [liked,     setLiked]       = useState([]);
  const [watched,   setWatched]     = useState([]);
  const [loading,   setLoading]     = useState(true);
  const [activeTab, setActiveTab]   = useState('liked');

  useEffect(() => {
    if (!currentUser) { setLoading(false); window.location.hash = ''; return; }
    Promise.all([
      getWatchlist(currentUser.uid),
      getLiked(currentUser.uid),
      getWatched(currentUser.uid),
    ]).then(([wl, lk, wa]) => {
      setWatchlist(wl || []);
      setLiked(lk || []);
      setWatched(wa || []);
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

  if (!currentUser) return null;

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

  const currentList  = { liked, watchlist, watched }[activeTab];
  const removeMap    = { liked: handleRemoveLiked, watchlist: handleRemoveWatchlist, watched: handleRemoveWatched };

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

        {/* ── Watch Time Box ────────────────────────────────────────── */}
        <div className="watchtime-card">
          <div className="watchtime-ring-wrap">
            <svg width="180" height="180" viewBox="0 0 180 180">
              <defs>
                <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#e50914" />
                  <stop offset="100%" stopColor="#ff6b35" />
                </linearGradient>
              </defs>
              {/* Track */}
              <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="12" />
              {/* Progress */}
              <circle
                cx={cx} cy={cy} r={r}
                fill="none"
                stroke="url(#ringGrad)"
                strokeWidth="12"
                strokeLinecap="round"
                strokeDasharray={`${dash} ${circ}`}
                strokeDashoffset={circ / 4}
                style={{ transition: 'stroke-dasharray 1s ease' }}
              />
              <text x={cx} y={cy - 10} textAnchor="middle" fill="#fff" fontSize="28" fontWeight="700">{totalHours}h</text>
              <text x={cx} y={cy + 18} textAnchor="middle" fill="#aaa" fontSize="13">watched</text>
            </svg>
          </div>
          <div className="watchtime-stats">
            <h2 className="watchtime-title">Your Watch Time</h2>
            <p className="watchtime-subtitle">Based on movies &amp; episodes marked as Already Watched</p>
            <div className="watchtime-breakdown">
              <div className="wt-stat">
                <span className="wt-val">{totalDays}</span>
                <span className="wt-label">Days</span>
              </div>
              <div className="wt-divider" />
              <div className="wt-stat">
                <span className="wt-val">{remHours}</span>
                <span className="wt-label">Hours</span>
              </div>
              <div className="wt-divider" />
              <div className="wt-stat">
                <span className="wt-val">{watched.length}</span>
                <span className="wt-label">Titles</span>
              </div>
              <div className="wt-divider" />
              <div className="wt-stat">
                <span className="wt-val">{topGenre}</span>
                <span className="wt-label">Top Genre</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Tabs ─────────────────────────────────────────────────── */}
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
