import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { getWatchlist, removeFromWatchlist } from '../services/firestore';
import MovieCard from '../components/MovieCard';
import './WatchlistPage.css';

const WatchlistPage = () => {
  const { currentUser } = useAuth();
  const [watchlist, setWatchlist] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'list'
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState('all'); // 'all' | 'movies' | 'tv'
  const [sortBy, setSortBy] = useState('recent'); // 'recent' | 'alpha'

  useEffect(() => {
    if (!currentUser) {
      setLoading(false);
      window.location.hash = '#profile'; // redirect to login
      return;
    }
    
    const loadData = async () => {
      try {
        const wl = await getWatchlist(currentUser.uid);
        // Reverse array to show recently added first
        setWatchlist((wl || []).reverse());
      } catch (err) {
        console.error("Failed to load watchlist:", err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [currentUser]);

  const handleRemove = async (e, id) => {
    e.stopPropagation();
    e.preventDefault();
    if (!currentUser) return;
    await removeFromWatchlist(currentUser.uid, id);
    setWatchlist(prev => prev.filter(m => m.id !== id));
  };

  const filteredAndSortedList = useMemo(() => {
    let list = [...watchlist];
    
    // 1. Search filtering
    if (searchQuery.trim()) {
      const lowerQ = searchQuery.toLowerCase();
      list = list.filter(m => (m.title || m.name)?.toLowerCase().includes(lowerQ));
    }
    
    // 2. Type filtering
    if (filter === 'movies') {
      list = list.filter(m => m.mediaType === 'movie');
    } else if (filter === 'tv') {
      list = list.filter(m => m.mediaType === 'tv');
    }

    // 3. Sorting
    if (sortBy === 'alpha') {
      list.sort((a, b) => (a.title || a.name || '').localeCompare(b.title || b.name || ''));
    }
    // if 'recent', it's already in that order because of the initial reverse()

    return list;
  }, [watchlist, searchQuery, filter, sortBy]);

  if (loading) {
    return <div className="page-container" style={{ paddingTop: '100px', textAlign: 'center' }}>Loading Watchlist...</div>;
  }

  if (!currentUser) return null;

  return (
    <div className="watchlist-page page-container">
      <div className="watchlist-header">
        <h1>My Watchlist <span>({watchlist.length})</span></h1>
        
        <div className="watchlist-controls">
          <input 
            type="text" 
            placeholder="Search your watchlist..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="watchlist-search"
          />
          
          <select value={filter} onChange={(e) => setFilter(e.target.value)} className="watchlist-select">
            <option value="all">All Items</option>
            <option value="movies">Movies</option>
            <option value="tv">TV Shows</option>
          </select>

          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="watchlist-select">
            <option value="recent">Recently Added</option>
            <option value="alpha">Alphabetical</option>
          </select>

          <div className="view-toggles">
            <button 
              className={`view-toggle-btn ${viewMode === 'grid' ? 'active' : ''}`}
              onClick={() => setViewMode('grid')}
              aria-label="Grid View"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
            </button>
            <button 
              className={`view-toggle-btn ${viewMode === 'list' ? 'active' : ''}`}
              onClick={() => setViewMode('list')}
              aria-label="List View"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>
            </button>
          </div>
        </div>
      </div>

      {filteredAndSortedList.length === 0 ? (
        <div className="watchlist-empty">
          <h2>No items found</h2>
          <p>You haven't added anything matching this criteria yet.</p>
        </div>
      ) : (
        <div className={`watchlist-container ${viewMode}`}>
          {filteredAndSortedList.map(movie => (
            <div key={movie.id} className="watchlist-item-wrapper">
              {viewMode === 'grid' ? (
                <div className="watchlist-card-wrapper">
                  <MovieCard {...movie} />
                  <button className="watchlist-remove-btn" onClick={(e) => handleRemove(e, movie.id)} title="Remove from Watchlist" aria-label="Remove">✕</button>
                </div>
              ) : (
                <div className="watchlist-list-item" onClick={() => window.location.hash = `${movie.mediaType || 'movie'}/${movie.id}`}>
                  <div className="wl-poster">
                    {movie.poster ? <img src={movie.poster} alt={movie.title} /> : <div className="wl-no-poster">{movie.title?.charAt(0)}</div>}
                  </div>
                  <div className="wl-info">
                    <h3>{movie.title}</h3>
                    <p>{movie.year} • {movie.category} • {movie.mediaType === 'tv' ? 'TV' : 'Movie'}</p>
                    <div className="wl-rating">★ {movie.rating}</div>
                  </div>
                  <button className="wl-list-remove" onClick={(e) => handleRemove(e, movie.id)}>Remove</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default WatchlistPage;
