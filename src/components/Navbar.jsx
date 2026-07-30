import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import AuthModal from './AuthModal';
import { searchMedia } from '../services/tmdb';
import './Navbar.css';

const Navbar = () => {
  const [scrolled, setScrolled] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [currentPath, setCurrentPath] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [discoverDropdown, setDiscoverDropdown] = useState(false);

  // Autocomplete state
  const [suggestions, setSuggestions] = useState([]);
  const [recentSearches, setRecentSearches] = useState(() => {
    const saved = localStorage.getItem('cinescope_recent_searches');
    return saved ? JSON.parse(saved) : [];
  });
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);

  const dropdownRef = useRef(null);
  const searchContainerRef = useRef(null);
  const { currentUser, logout } = useAuth();

  useEffect(() => {
    localStorage.setItem('cinescope_recent_searches', JSON.stringify(recentSearches));
  }, [recentSearches]);

  useEffect(() => {
    if (searchQuery.trim().length > 1 && isSearchActive) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        searchMedia(searchQuery.trim(), controller.signal).then(data => {
          setSuggestions(data.slice(0, 5));
          setShowSuggestions(true);
        }).catch(err => console.error(err));
      }, 300);
      return () => {
        clearTimeout(timeoutId);
        controller.abort();
      };
    } else {
      setSuggestions([]);
      if (searchQuery.trim().length === 0) {
        setShowSuggestions(true); // Show recent searches
      } else {
        setShowSuggestions(false);
      }
    }
  }, [searchQuery, isSearchActive]);

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
        setShowSuggestions(false);
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
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target)) {
        setShowSuggestions(false);
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

  const executeSearch = (query) => {
    if (!query.trim()) return;
    const cleanQuery = query.trim();
    if (!recentSearches.includes(cleanQuery)) {
      setRecentSearches(prev => [cleanQuery, ...prev].slice(0, 5));
    }
    setShowSuggestions(false);
    window.location.hash = `search?q=${encodeURIComponent(cleanQuery)}`;
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (focusedIndex >= 0 && suggestions.length > 0) {
      const item = suggestions[focusedIndex];
      window.location.hash = `${item.mediaType || 'movie'}/${item.id}`;
      setShowSuggestions(false);
    } else {
      executeSearch(searchQuery);
    }
  };

  const handleSearchKeyDown = (e) => {
    if (!showSuggestions) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFocusedIndex(prev => (prev < suggestions.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocusedIndex(prev => (prev > -1 ? prev - 1 : prev));
    }
  };

  const handleNavClick = (e, targetHash) => {
    if (e) e.preventDefault();
    setIsMobileMenuOpen(false);
    setIsDropdownOpen(false);
    
    const normalizedTarget = targetHash === '#' ? '' : targetHash;
    const currentHash = window.location.hash || '';
    
    if (currentHash === normalizedTarget || (normalizedTarget === '' && (currentHash === '' || currentHash === '#'))) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      window.location.hash = normalizedTarget;
    }
  };

  const toggleSearch = () => {
    setIsSearchActive(!isSearchActive);
    setShowSuggestions(!isSearchActive);
    if (isSearchActive) setSearchQuery('');
  };

  const email = currentUser?.email || '';
  const avatarLetter = email ? email.charAt(0).toUpperCase() : '?';

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

          <a href="#" onClick={(e) => handleNavClick(e, '#')} className="navbar__logo" id="navbar-logo" aria-label="CineScope Home">
            <span className="navbar__logo-text">
              <span className="logo-cine">Cine</span><span className="logo-scope">Scope</span>
            </span>
          </a>
          <span className="navbar__tagline">Search Less. Watch Better.</span>
        </div>

        {/* Centered navigation */}
        <ul className={`navbar__nav ${isMobileMenuOpen ? 'navbar__nav--open' : ''}`} id="navbar-links">
          <li className="mobile-drawer-header">
            <span className="navbar__logo-text">
              <span className="logo-cine">Cine</span><span className="logo-scope">Scope</span>
            </span>
            <button className="mobile-drawer-close" onClick={() => setIsMobileMenuOpen(false)} aria-label="Close menu">
              &times;
            </button>
          </li>
          <li className="navbar__dropdown-container" onMouseEnter={() => setDiscoverDropdown(true)} onMouseLeave={() => setDiscoverDropdown(false)}>
            <a href="#discover/movies" onClick={(e) => handleNavClick(e, '#discover/movies')} className={`navbar__link ${currentPath.startsWith('#discover') || currentPath === '#movies' || currentPath === '#tvshows' ? 'navbar__link--active' : ''}`}>
              Discover <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: '4px', verticalAlign: 'middle', transition: 'transform 0.2s', transform: discoverDropdown ? 'rotate(180deg)' : 'none' }}><polyline points="6 9 12 15 18 9"></polyline></svg>
            </a>
            {discoverDropdown && (
              <div className="navbar__submenu">
                <a href="#discover/movies" onClick={(e) => handleNavClick(e, '#discover/movies')} className="submenu-item">Movies</a>
                <a href="#discover/tv" onClick={(e) => handleNavClick(e, '#discover/tv')} className="submenu-item">TV Shows</a>
                <a href="#discover/trending" onClick={(e) => handleNavClick(e, '#discover/trending')} className="submenu-item">Trending</a>
              </div>
            )}
          </li>
          <li>
            <a href="#cineai" onClick={(e) => handleNavClick(e, '#cineai')} className={`navbar__link ${currentPath.startsWith('#cineai') ? 'navbar__link--active' : ''}`}>
              CineAI
            </a>
          </li>
          <li>
            <a href="#social" onClick={(e) => handleNavClick(e, '#social')} className={`navbar__link ${currentPath === '#social' ? 'navbar__link--active' : ''}`}>
              Social
            </a>
          </li>
          <li>
            <a href="#watchlist" onClick={(e) => handleNavClick(e, '#watchlist')} className={`navbar__link ${currentPath === '#watchlist' ? 'navbar__link--active' : ''}`}>
              Watchlist
            </a>
          </li>
        </ul>

        <div className="navbar__actions" id="navbar-actions">
          <div className="navbar__search-wrapper" ref={searchContainerRef}>
            <form className={`navbar__search-form ${isSearchActive ? 'active' : ''}`} onSubmit={handleSearchSubmit}>
              <button
                type="button"
                className="navbar__action-btn"
                onClick={() => {
                  if (isSearchActive && searchQuery) {
                    handleSearchSubmit(new Event('submit'));
                  } else {
                    toggleSearch();
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
                placeholder="Titles, people, genres..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setShowSuggestions(true);
                  setFocusedIndex(-1);
                }}
                onFocus={() => setShowSuggestions(true)}
                onKeyDown={handleSearchKeyDown}
              />
            </form>

            {/* Autocomplete Dropdown */}
            {isSearchActive && showSuggestions && (
              (searchQuery.trim().length > 1) || 
              (searchQuery.trim().length === 0 && recentSearches.length > 0)
            ) && (
              <div className="autocomplete-dropdown glass-panel">
                {searchQuery.trim().length === 0 && recentSearches.length > 0 && (
                  <div className="autocomplete-section">
                    <h4>Recent Searches</h4>
                    {recentSearches.map((term, i) => (
                      <div key={i} className="autocomplete-item" onClick={() => executeSearch(term)}>
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                        <span>{term}</span>
                      </div>
                    ))}
                  </div>
                )}
                {searchQuery.trim().length > 1 && suggestions.length > 0 && (
                  <div className="autocomplete-section">
                    {suggestions.map((item, i) => (
                      <div
                        key={item.id}
                        className={`autocomplete-item ${focusedIndex === i ? 'focused' : ''}`}
                        onClick={() => {
                          window.location.hash = `${item.mediaType || 'movie'}/${item.id}`;
                          setShowSuggestions(false);
                        }}
                      >
                        {item.poster ? (
                          <img src={item.poster} alt="" />
                        ) : (
                          <div className="autocomplete-no-img"></div>
                        )}
                        <div className="autocomplete-info">
                          <span>{item.title}</span>
                          <small>{item.year} • {item.category}</small>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {searchQuery.trim().length > 1 && suggestions.length === 0 && (
                  <div className="autocomplete-section">
                    <div className="autocomplete-item no-results">No results found for "{searchQuery}"</div>
                  </div>
                )}
              </div>
            )}
          </div>

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
                  <button type="button" className="dropdown-item" onClick={(e) => handleNavClick(e, '#profile')}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                    View Profile
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

      {/* Mobile Bottom Navigation Bar */}
      <nav className="mobile-bottom-nav" aria-label="Mobile Navigation">
        <a 
          href="#discover/movies" 
          onClick={(e) => handleNavClick(e, '#discover/movies')} 
          className={`mobile-nav-item ${currentPath.startsWith('#discover') || currentPath === '#' || currentPath === '' ? 'active' : ''}`}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
            <polyline points="9 22 9 12 15 12 15 22"></polyline>
          </svg>
          <span>Discover</span>
        </a>

        <a 
          href="#cineai" 
          onClick={(e) => handleNavClick(e, '#cineai')} 
          className={`mobile-nav-item ${currentPath.startsWith('#cineai') ? 'active' : ''}`}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"></path>
          </svg>
          <span>CineAI</span>
        </a>

        <a 
          href="#social" 
          onClick={(e) => handleNavClick(e, '#social')} 
          className={`mobile-nav-item ${currentPath === '#social' ? 'active' : ''}`}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
            <circle cx="9" cy="7" r="4"></circle>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
            <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
          </svg>
          <span>Social</span>
        </a>

        <a 
          href="#watchlist" 
          onClick={(e) => handleNavClick(e, '#watchlist')} 
          className={`mobile-nav-item ${currentPath === '#watchlist' ? 'active' : ''}`}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
          </svg>
          <span>Watchlist</span>
        </a>

        <a 
          href="#profile" 
          onClick={(e) => handleNavClick(e, '#profile')} 
          className={`mobile-nav-item ${currentPath === '#profile' ? 'active' : ''}`}
        >
          {currentUser ? (
            <div className="mobile-nav-avatar">{avatarLetter}</div>
          ) : (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
              <circle cx="12" cy="7" r="4"></circle>
            </svg>
          )}
          <span>Profile</span>
        </a>
      </nav>

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />
    </>
  );
};

export default Navbar;
