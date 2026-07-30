import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getWatchlist } from '../services/firestore';
import MovieCard from '../components/MovieCard';
import './ProfilePage.css';

const ProfilePage = () => {
  const { currentUser, logout } = useAuth();
  const [watchlist, setWatchlist] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (currentUser) {
      getWatchlist(currentUser.uid)
        .then((data) => {
          setWatchlist(data);
          setLoading(false);
        })
        .catch((err) => {
          console.error("Error fetching watchlist:", err);
          setLoading(false);
        });
    } else {
      setLoading(false);
      window.location.hash = ''; // Redirect to home if not logged in
    }
  }, [currentUser]);

  if (!currentUser) return null;

  const email = currentUser.email;
  const username = email ? email.split('@')[0] : 'User';
  const avatarLetter = email ? email.charAt(0).toUpperCase() : '?';

  const handleLogout = async () => {
    await logout();
    window.location.hash = '';
  };

  return (
    <div className="profile-page">
      <div className="profile-header">
        <div className="profile-avatar-large">{avatarLetter}</div>
        <div className="profile-info">
          <h1 className="profile-name">{username}</h1>
          <p className="profile-email">{email}</p>
          <span className="profile-badge">CineScope Member</span>
        </div>
      </div>
      
      <div className="profile-content">
        <section className="profile-section">
          <h2>My Watchlist</h2>
          
          {loading ? (
            <div className="empty-state">
              <div className="spinner"></div>
              <p>Loading your watchlist...</p>
            </div>
          ) : watchlist.length > 0 ? (
            <div className="search-grid"> {/* Reusing grid styles from SearchPage / MediaBrowsePage */}
              {watchlist.map((movie) => (
                <MovieCard key={movie.id} {...movie} />
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <p>Your watchlist is empty.</p>
              <a href="#movies" className="browse-link">Browse Movies</a>
            </div>
          )}
        </section>
        
        <button className="logout-btn" onClick={handleLogout}>Log Out</button>
      </div>
    </div>
  );
};

export default ProfilePage;
