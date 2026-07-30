import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getUserStats, ACHIEVEMENTS_LIST } from '../services/achievements';
import { getWatchlist, getLiked, getWatched } from '../services/firestore';
import { ref, get } from 'firebase/database';
import { db } from '../services/firebase';
import './AchievementsPage.css';

const AchievementsPage = () => {
  const { currentUser } = useAuth();
  const [unlockedAchievements, setUnlockedAchievements] = useState({});
  const [stats, setStats] = useState({});
  const [watchlist, setWatchlist] = useState([]);
  const [liked, setLiked] = useState([]);
  const [watched, setWatched] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // 'all' | 'unlocked' | 'locked'

  useEffect(() => {
    if (!currentUser) {
      setLoading(false);
      window.location.hash = '#profile';
      return;
    }

    Promise.all([
      getWatchlist(currentUser.uid),
      getLiked(currentUser.uid),
      getWatched(currentUser.uid),
      getUserStats(currentUser.uid),
      get(ref(db, `users/${currentUser.uid}/unlockedAchievements`))
    ]).then(([wl, lk, wa, userStats, unlockedSnap]) => {
      setWatchlist(wl || []);
      setLiked(lk || []);
      setWatched(wa || []);
      setStats(userStats || {});
      setUnlockedAchievements(unlockedSnap.exists() ? unlockedSnap.val() : {});
      setLoading(false);
    }).catch(err => {
      console.error(err);
      setLoading(false);
    });
  }, [currentUser]);

  const totalMinutes = watched.reduce((sum, m) => {
    const mins = parseInt(m.runtime, 10);
    return sum + (isNaN(mins) ? 0 : mins);
  }, 0);
  const totalHours = Math.floor(totalMinutes / 60);

  const unlockedCount = Object.keys(unlockedAchievements).length;
  const totalCount = ACHIEVEMENTS_LIST.length;
  const overallProgressPct = Math.round((unlockedCount / totalCount) * 100);

  const filteredAchievements = ACHIEVEMENTS_LIST.filter(ach => {
    const isUnlocked = !!unlockedAchievements[ach.id];
    if (filter === 'unlocked') return isUnlocked;
    if (filter === 'locked') return !isUnlocked;
    return true;
  });

  if (loading) {
    return (
      <div className="page-container achievements-page" style={{ paddingTop: '100px', textAlign: 'center' }}>
        <h2>Loading Achievements...</h2>
      </div>
    );
  }

  return (
    <div className="achievements-page page-container">
      {/* Navigation Header */}
      <div className="achievements-header-nav">
        <button className="btn-back" onClick={() => window.location.hash = '#profile'}>
          ← Back to Profile
        </button>
      </div>

      <div className="achievements-hero">
        <h1>🏆 CineScope Achievements</h1>
        <p>Unlock badges by watching, saving, exploring, and using CineAI features.</p>
        
        {/* Overall Progress Bar */}
        <div className="overall-progress-card glass-panel">
          <div className="overall-progress-header">
            <span>Overall Progress</span>
            <span className="overall-progress-val">{unlockedCount} / {totalCount} Unlocked ({overallProgressPct}%)</span>
          </div>
          <div className="overall-track">
            <div className="overall-fill" style={{ width: `${overallProgressPct}%` }} />
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="achievements-filter-bar">
        <button className={`filter-btn ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')}>
          All ({totalCount})
        </button>
        <button className={`filter-btn ${filter === 'unlocked' ? 'active' : ''}`} onClick={() => setFilter('unlocked')}>
          Unlocked ({unlockedCount})
        </button>
        <button className={`filter-btn ${filter === 'locked' ? 'active' : ''}`} onClick={() => setFilter('locked')}>
          Locked ({totalCount - unlockedCount})
        </button>
      </div>

      {/* Grid */}
      <div className="achievements-full-grid">
        {filteredAchievements.map(ach => {
          const isUnlocked = !!unlockedAchievements[ach.id];
          
          let progressText = '';
          let pct = 0;
          if (!isUnlocked && ach.maxProgress) {
            let currentVal = 0;
            if (ach.category === 'Watchlist') {
              currentVal = watchlist.length;
            } else if (ach.category === 'Hours Watched') {
              currentVal = totalHours;
            } else if (ach.id === 'explorer') {
              currentVal = stats.uniqueViewedIds?.length || 0;
            } else if (ach.id === 'world_explorer') {
              currentVal = stats.viewedCountries?.length || 0;
            } else if (ach.id === 'genre_hopper') {
              const genresSet = new Set();
              [...watchlist, ...liked, ...watched].forEach(m => {
                if (m.category) genresSet.add(m.category);
              });
              currentVal = genresSet.size;
            } else if (ach.id === 'prompt_master') {
              currentVal = stats.aiSearchesCount || 0;
            }
            
            pct = Math.min((currentVal / ach.maxProgress) * 100, 100);
            progressText = `${Math.floor(currentVal)} / ${ach.maxProgress} ${ach.category === 'Hours Watched' ? 'Hours' : ach.id === 'world_explorer' ? 'Countries' : ach.id === 'genre_hopper' ? 'Genres' : 'Titles'}`;
          }

          return (
            <div key={ach.id} className={`achievement-card-full glass-panel ${isUnlocked ? 'unlocked' : 'locked'}`}>
              <div className="ach-card-top">
                <span className="ach-card-icon">{ach.icon}</span>
                <span className="ach-card-category">{ach.category}</span>
              </div>
              <h3 className="ach-card-name">{ach.name}</h3>
              <p className="ach-card-desc">{ach.description}</p>
              
              {!isUnlocked && ach.maxProgress ? (
                <div className="ach-progress-section">
                  <div className="ach-progress-bar-wrap">
                    <div className="ach-progress-bar" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="ach-progress-text">{progressText}</span>
                </div>
              ) : null}

              <div className={`ach-status-badge ${isUnlocked ? 'unlocked' : 'locked'}`}>
                {isUnlocked ? '✓ Unlocked' : '🔒 Locked'}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default AchievementsPage;
