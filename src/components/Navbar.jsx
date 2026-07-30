import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import AuthModal from './AuthModal';
import './Navbar.css';

const Navbar = () => {
  const [scrolled, setScrolled] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [currentPath, setCurrentPath] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  
  const dropdownRef = useRef(null);
  const { currentUser, logout } = useAuth();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };

    const handleHashChange = () => {
      const hash = window.location.hash || '#';
      setCurrentPath(hash);
      
      if (hash.startsWith('#search?q=')) {
        const query = decodeURIComponent(hash.split('=')[1]);
        setSearchQuery(query);
        setIsSearchActive(true);
      } else if (!hash.startsWith('#search')) {
        setSearchQuery('');
        setIsSearchActive(false);
      }
      setIsMobileMenuOpen(false); // Close menu on navigation
    };

    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsDropdownOpen(false);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('hashchange', handleHashChange);
    document.addEventListener('mousedown', handleClickOutside);
    
    handleHashChange();

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('hashchange', handleHashChange);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      window.location.hash = `search?q=${encodeURIComponent(searchQuery.trim())}`;
    }
  };

  const avatarLetter = currentUser && currentUser.email ? currentUser.email.charAt(0).toUpperCase() : '?';

  return (
    <>
      <nav
        id="navbar"
        className={`navbar${scrolled ? ' scrolled' : ''}`}
        role="navigation"
        aria-label="Main Navigation"
      >
        <div className="navbar__left">
          {/* Hamburger Icon */}
          <button className="navbar__hamburger" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} aria-label="Menu">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="12" x2="21" y2="12"></line>
              <line x1="3" y1="6" x2="21" y2="6"></line>
              <line x1="3" y1="18" x2="21" y2="18"></line>
            </svg>
          </button>

          <a href="#" onClick={(e) => { e.preventDefault(); window.location.hash = ''; }} className="navbar__logo" id="navbar-logo" aria-label="CineScope Home">
            <span className="navbar__logo-text">
              <span className="logo-cine">Cine</span><span className="logo-scope">Scope</span>
            </span>
          </a>

          <ul className={`navbar__nav ${isMobileMenuOpen ? 'navbar__nav--open' : ''}`} id="navbar-links">
            <li>
              <a href="#" onClick={(e) => { e.preventDefault(); window.location.hash = ''; setIsMobileMenuOpen(false); }} className={`navbar__link ${currentPath === '#' || currentPath === '' ? 'navbar__link--active' : ''}`}>
                Home
              </a>
            </li>
            <li>
              <a href="#" onClick={(e) => { e.preventDefault(); window.location.hash = 'movies'; setIsMobileMenuOpen(false); }} className={`navbar__link ${currentPath === '#movies' ? 'navbar__link--active' : ''}`}>
                Movies
              </a>
            </li>
            <li>
              <a href="#" onClick={(e) => { e.preventDefault(); window.location.hash = 'tvshows'; setIsMobileMenuOpen(false); }} className={`navbar__link ${currentPath === '#tvshows' ? 'navbar__link--active' : ''}`}>
                TV Shows
              </a>
            </li>
          </ul>
        </div>

        <div className="navbar__actions" id="navbar-actions">
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

          {currentUser ? (
            <div className="navbar__profile-container" ref={dropdownRef}>
              <button
                className="navbar__profile"
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                aria-label="Profile Menu"
                aria-expanded={isDropdownOpen}
              >
                {avatarLetter}
              </button>
              
              {isDropdownOpen && (
                <div className="navbar__dropdown">
                  <div className="dropdown-header">
                    <p className="dropdown-email">{currentUser.isAnonymous ? 'Guest User' : currentUser.email}</p>
                  </div>
                  <div className="dropdown-divider"></div>
                  {!currentUser.isAnonymous && (
                    <button className="dropdown-item" onClick={() => { window.location.hash = 'profile'; setIsDropdownOpen(false); }}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                      Profile
                    </button>
                  )}
                  <button className="dropdown-item" onClick={() => { window.location.hash = 'profile'; setIsDropdownOpen(false); }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path></svg>
                    Watchlist
                  </button>
                  <div className="dropdown-divider"></div>
                  <button className="dropdown-item logout" onClick={() => { logout(); setIsDropdownOpen(false); }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
                    Logout
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              className="navbar__login-btn"
              onClick={() => setIsAuthModalOpen(true)}
            >
              Sign In
            </button>
          )}
        </div>
      </nav>
      
      {/* Mobile Menu Backdrop */}
      {isMobileMenuOpen && (
        <div className="navbar__backdrop" onClick={() => setIsMobileMenuOpen(false)}></div>
      )}

      <AuthModal 
        isOpen={isAuthModalOpen} 
        onClose={() => setIsAuthModalOpen(false)} 
      />
    </>
  );
};

export default Navbar;
