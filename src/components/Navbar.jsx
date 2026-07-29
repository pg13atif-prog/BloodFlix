import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import AuthModal from './AuthModal';
import './Navbar.css';

const Navbar = () => {
  const [scrolled, setScrolled] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  
  const { currentUser } = useAuth();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };

    // Keep search query in sync with URL if navigated directly
    const handleHashChange = () => {
      const hash = window.location.hash;
      if (hash.startsWith('#search?q=')) {
        const query = decodeURIComponent(hash.split('=')[1]);
        setSearchQuery(query);
        setIsSearchActive(true);
      } else if (!hash.startsWith('#search')) {
        setSearchQuery('');
        setIsSearchActive(false);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('hashchange', handleHashChange);
    
    // Initial check
    handleHashChange();

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, []);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      window.location.hash = `search?q=${encodeURIComponent(searchQuery.trim())}`;
    }
  };

  const handleProfileClick = () => {
    if (currentUser) {
      window.location.hash = 'profile';
    } else {
      setIsAuthModalOpen(true);
    }
  };

  // Get first letter of email for avatar
  const avatarLetter = currentUser ? currentUser.email.charAt(0).toUpperCase() : '?';

  return (
    <>
      <nav
        id="navbar"
        className={`navbar${scrolled ? ' scrolled' : ''}`}
        role="navigation"
        aria-label="Main Navigation"
      >
        {/* ── Logo ── */}
        <a href="#" onClick={(e) => { e.preventDefault(); window.location.hash = ''; }} className="navbar__logo" id="navbar-logo" aria-label="BloodFlix Home">
          <span className="navbar__logo-text">BloodFlix</span>
        </a>

        {/* ── Navigation Links ── */}
        <ul className="navbar__nav" id="navbar-links">
          <li>
            <a href="#" onClick={(e) => { e.preventDefault(); window.location.hash = ''; }} className="navbar__link">
              Home
            </a>
          </li>
          <li>
            <a href="#" onClick={(e) => { e.preventDefault(); window.location.hash = 'movies'; }} className="navbar__link">
              Movies
            </a>
          </li>
          <li>
            <a href="#" onClick={(e) => { e.preventDefault(); window.location.hash = 'tvshows'; }} className="navbar__link">
              TV Shows
            </a>
          </li>
        </ul>

        {/* ── Right: Search + Profile ── */}
        <div className="navbar__actions" id="navbar-actions">
          {/* Search */}
          <form className={`navbar__search-form ${isSearchActive ? 'active' : ''}`} onSubmit={handleSearchSubmit}>
            <button
              type="button"
              className="navbar__action-btn"
              onClick={() => {
                if (isSearchActive && searchQuery) {
                  handleSearchSubmit(new Event('submit'));
                } else {
                  setIsSearchActive(!isSearchActive);
                }
              }}
              aria-label="Search"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </button>
            <input
              type="text"
              className="navbar__search-input"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onBlur={() => {
                if (!searchQuery) setIsSearchActive(false);
              }}
            />
          </form>

          {/* Profile Avatar */}
          <button
            className="navbar__profile"
            onClick={handleProfileClick}
            aria-label="Profile"
            type="button"
            title={currentUser ? "Go to Profile" : "Log In"}
          >
            {avatarLetter}
          </button>
        </div>
      </nav>
      
      <AuthModal 
        isOpen={isAuthModalOpen} 
        onClose={() => setIsAuthModalOpen(false)} 
      />
    </>
  );
};

export default Navbar;
