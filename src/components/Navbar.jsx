import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import AuthModal from './AuthModal';
import { searchMedia } from '../services/tmdb';
import { getNotifications, removeNotification } from '../services/friends';
import { addToWatchlist, addToLiked, addToWatched } from '../services/firestore';
import './Navbar.css';

/* ── Dropdown menu configs ─────────────────────────────────── */
const discoverItems = [
  { icon: '🎬', label: 'Movies', desc: 'Browse the complete movie library.', hash: '#discover/movies' },
  { icon: '📺', label: 'TV Shows', desc: 'Explore popular series.', hash: '#discover/tv' },
  { icon: '🔥', label: 'Trending', desc: "See what\u2019s popular today.", hash: '#discover/trending' },
];

const cineaiItems = [
  { icon: '✨', label: 'What Should I Watch?', desc: 'Describe your mood and let CineAI recommend.', hash: '#cineai/what-to-watch' },
  { icon: '🎬', label: 'Movie Night Planner', desc: 'Plan the perfect movie night.', hash: '#cineai/planner' },
  { icon: '🎲', label: 'Pick For Me', desc: 'One click. One recommendation.', hash: '#cineai/pick-for-me' },
  { icon: '⚔️', label: 'Movie Debate', desc: 'Compare two movies with AI.', hash: '#cineai/debate' },
];

const friendsItems = [
  { icon: '👥', label: 'My Friends', desc: 'View and manage your friends.', hash: '#friends' },
  { icon: '🤝', label: 'Movie Match', desc: 'Compare your movie taste with friends.', hash: '#social' },
];

/* ── Framer Motion variants ────────────────────────────────── */
const dropdownVariants = {
  hidden: { opacity: 0, y: -8, scale: 0.98, x: 0 },
  visible: { opacity: 1, y: 0, scale: 1, x: 0, transition: { duration: 0.18, ease: [0.16, 1, 0.3, 1] } },
  exit: { opacity: 0, y: -6, scale: 0.98, x: 0, transition: { duration: 0.12 } },
};

const Navbar = () => {
  const [scrolled, setScrolled] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [currentPath, setCurrentPath] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Desktop hover dropdowns
  const [openDropdown, setOpenDropdown] = useState(null); // 'discover' | 'cineai' | 'social' | null

  // Mobile accordion
  const [mobileAccordion, setMobileAccordion] = useState(null);
  
  // Notifications
  const [notifications, setNotifications] = useState([]);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const hasUnreadNotifications = notifications.length > 0;

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
    if (currentUser) {
      getNotifications(currentUser.uid).then(setNotifications).catch(console.error);
    } else {
      setNotifications([]);
    }
  }, [currentUser]);

  useEffect(() => {
    localStorage.setItem('cinescope_recent_searches', JSON.stringify(recentSearches));
  }, [recentSearches]);

  useEffect(() => {
    if (searchQuery.trim().length > 1 && isSearchActive) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        searchMedia(searchQuery.trim(), controller.signal).then(data => {
          setSuggestions(data.slice(0, 10));
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
        setShowSuggestions(true);
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
      setIsMobileMenuOpen(false);
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
    setOpenDropdown(null);

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

  const handleNotificationAction = async (notif, actionType) => {
    try {
      if (actionType === 'watchlist') {
        await addToWatchlist(currentUser.uid, notif.movie);
      } else if (actionType === 'liked') {
        await addToLiked(currentUser.uid, notif.movie);
      } else if (actionType === 'watched') {
        await addToWatched(currentUser.uid, notif.movie, 120); // Dummy runtime
      }
      await removeNotification(currentUser.uid, notif.id);
      setNotifications(prev => prev.filter(n => n.id !== notif.id));
    } catch (err) {
      console.error(err);
      alert('Failed to process recommendation.');
    }
  };

  const handleDismissNotification = async (notif) => {
    await removeNotification(currentUser.uid, notif.id);
    setNotifications(prev => prev.filter(n => n.id !== notif.id));
  };

  const email = currentUser?.email || '';
  const avatarLetter = email ? email.charAt(0).toUpperCase() : '?';

  /* ── Helper: render premium dropdown ──────────────────────── */
  const renderPremiumDropdown = (items) => (
    <motion.div
      className="nav-dropdown"
      variants={dropdownVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
    >
      {items.map((item) => (
        <a
          key={item.hash}
          href={item.hash}
          className="nav-dropdown__item"
          onClick={(e) => handleNavClick(e, item.hash)}
        >
          <span className="nav-dropdown__icon">{item.icon}</span>
          <div className="nav-dropdown__text">
            <span className="nav-dropdown__label">{item.label}</span>
            <span className="nav-dropdown__desc">{item.desc}</span>
          </div>
        </a>
      ))}
    </motion.div>
  );

  /* ── Helper: nav item with optional dropdown ─────────────── */
  const NavItem = ({ id, label, icon, hash, isActive, items, className }) => {
    const hasDropdown = items && items.length > 0;
    const isOpen = openDropdown === id;

    return (
      <li
        className={`navbar__nav-item ${hasDropdown ? 'navbar__dropdown-container' : ''}`}
        onMouseEnter={() => hasDropdown && setOpenDropdown(id)}
        onMouseLeave={() => hasDropdown && setOpenDropdown(null)}
      >
        <a
          href={hash}
          onClick={(e) => handleNavClick(e, hash)}
          className={`navbar__link ${isActive ? 'navbar__link--active' : ''} ${className || ''}`}
        >
          <span className="navbar__link-label">
            {id === 'cineai' ? <>Cine<span className="navbar__ai-text">AI</span></> : label}
          </span>
          {hasDropdown && (
            <svg className={`navbar__chevron ${isOpen ? 'navbar__chevron--open' : ''}`} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          )}
        </a>
        <AnimatePresence>
          {hasDropdown && isOpen && renderPremiumDropdown(items)}
        </AnimatePresence>
      </li>
    );
  };

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
          <span className="navbar__tagline">Discover Your Next Favorite.</span>
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

          {/* ── Desktop nav items ──────────────────────────── */}
          <NavItem
            id="home"
            label="Home"
            hash="#"
            isActive={currentPath === '' || currentPath === '#'}
          />
          <NavItem
            id="discover"
            label="Discover"
            hash="#discover/movies"
            isActive={currentPath.startsWith('#discover') || currentPath === '#movies' || currentPath === '#tvshows'}
            items={discoverItems}
          />
          <NavItem
            id="cineai"
            label="CineAI"
            hash="#cineai"
            isActive={currentPath.startsWith('#cineai')}
            items={cineaiItems}
            className="navbar__link--cineai"
          />
          <NavItem
            id="watchlist"
            label="Watchlist"
            hash="#watchlist"
            isActive={currentPath === '#watchlist'}
          />

          {/* ── Mobile Accordion Sections ─────────────────── */}
          <li className="mobile-accordion-section">
            <button className="mobile-accordion-trigger" onClick={() => setMobileAccordion(mobileAccordion === 'discover' ? null : 'discover')}>
              <span>Discover</span>
              <svg className={`mobile-accordion-chevron ${mobileAccordion === 'discover' ? 'open' : ''}`} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"></polyline></svg>
            </button>
            {mobileAccordion === 'discover' && (
              <div className="mobile-accordion-content">
                {discoverItems.map(item => (
                  <a key={item.hash} href={item.hash} className="mobile-accordion-item" onClick={(e) => handleNavClick(e, item.hash)}>
                    <span className="mobile-accordion-icon">{item.icon}</span>
                    <div><span className="mobile-accordion-label">{item.label}</span><br/><span className="mobile-accordion-desc">{item.desc}</span></div>
                  </a>
                ))}
              </div>
            )}
          </li>
          <li className="mobile-accordion-section">
            <button className="mobile-accordion-trigger" onClick={() => setMobileAccordion(mobileAccordion === 'cineai' ? null : 'cineai')}>
              <span>Cine<span className="navbar__ai-text">AI</span></span>
              <svg className={`mobile-accordion-chevron ${mobileAccordion === 'cineai' ? 'open' : ''}`} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"></polyline></svg>
            </button>
            {mobileAccordion === 'cineai' && (
              <div className="mobile-accordion-content">
                {cineaiItems.map(item => (
                  <a key={item.hash} href={item.hash} className="mobile-accordion-item" onClick={(e) => handleNavClick(e, item.hash)}>
                    <span className="mobile-accordion-icon">{item.icon}</span>
                    <div><span className="mobile-accordion-label">{item.label}</span><br/><span className="mobile-accordion-desc">{item.desc}</span></div>
                  </a>
                ))}
              </div>
            )}
          </li>
          <li className="mobile-accordion-section">
            <button className="mobile-accordion-trigger" onClick={() => setMobileAccordion(mobileAccordion === 'friends' ? null : 'friends')}>
              <span>Friends</span>
              <svg className={`mobile-accordion-chevron ${mobileAccordion === 'friends' ? 'open' : ''}`} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"></polyline></svg>
            </button>
            {mobileAccordion === 'friends' && (
              <div className="mobile-accordion-content">
                {friendsItems.map(item => (
                  <a key={item.hash} href={item.hash} className="mobile-accordion-item" onClick={(e) => handleNavClick(e, item.hash)}>
                    <span className="mobile-accordion-icon">{item.icon}</span>
                    <div><span className="mobile-accordion-label">{item.label}</span><br/><span className="mobile-accordion-desc">{item.desc}</span></div>
                  </a>
                ))}
              </div>
            )}
          </li>
          <li className="mobile-accordion-section mobile-accordion-single">
            <a href="#watchlist" className="mobile-accordion-trigger" onClick={(e) => handleNavClick(e, '#watchlist')}>
              <span>Watchlist</span>
            </a>
          </li>
        </ul>

        <div className="navbar__actions" id="navbar-actions">
          <div className="navbar__search-wrapper" ref={searchContainerRef}>
            <form className={`navbar__search-form ${isSearchActive ? 'active' : ''}`} onSubmit={handleSearchSubmit}>
              <button
                type="button"
                className="navbar__action-btn navbar__search-btn"
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
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <h4>Recent Searches</h4>
                      <button 
                        onClick={(e) => { e.stopPropagation(); setRecentSearches([]); }}
                        style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem', cursor: 'pointer', padding: '0 0.5rem' }}
                      >Clear All</button>
                    </div>
                    {recentSearches.map((term, i) => (
                      <div key={i} className="autocomplete-item" onClick={() => executeSearch(term)}>
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0 }}><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                        <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{term}</span>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setRecentSearches(prev => prev.filter(t => t !== term));
                          }}
                          style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', padding: '0.2rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                          title="Remove search"
                        >
                          ✕
                        </button>
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
                    <div
                      className="autocomplete-footer"
                      onClick={() => executeSearch(searchQuery)}
                    >
                      View all results for "{searchQuery}" &rarr;
                    </div>
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

              <AnimatePresence>
                {isDropdownOpen && (
                  <motion.div
                    className="navbar__dropdown"
                    variants={dropdownVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                  >
                    <div className="dropdown-header">
                      <p className="dropdown-email">{currentUser.isAnonymous ? 'Guest User' : currentUser.email}</p>
                    </div>
                    <div className="dropdown-divider"></div>
                    <button type="button" className="dropdown-item" onClick={(e) => handleNavClick(e, '#profile')}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                      My Profile
                    </button>
                    <button type="button" className="dropdown-item" onClick={(e) => handleNavClick(e, '#achievements')}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5C7 4 7 7 7 7"></path><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5C17 4 17 7 17 7"></path><path d="M4 22h16"></path><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20 7 22"></path><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20 17 22"></path><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"></path></svg>
                      Achievements
                    </button>
                    <button type="button" className="dropdown-item" onClick={(e) => handleNavClick(e, '#friends')}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                      Friends
                    </button>
                    <button type="button" className="dropdown-item" onClick={() => setIsNotificationsOpen(true)}>
                      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
                        {hasUnreadNotifications && <span style={{ position: 'absolute', top: '0px', right: '0px', width: '6px', height: '6px', background: '#e50914', borderRadius: '50%' }}></span>}
                      </div>
                      Notifications
                    </button>
                    <div className="dropdown-divider"></div>
                    <button className="dropdown-item logout" onClick={() => { logout(); setIsDropdownOpen(false); }}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
                      Log Out
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
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
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            className="navbar__backdrop"
            onClick={() => setIsMobileMenuOpen(false)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          />
        )}
      </AnimatePresence>

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
          href="#friends" 
          onClick={(e) => handleNavClick(e, '#friends')} 
          className={`mobile-nav-item ${currentPath === '#friends' || currentPath === '#social' ? 'active' : ''}`}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
            <circle cx="9" cy="7" r="4"></circle>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
            <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
          </svg>
          <span>Friends</span>
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

      {isNotificationsOpen && (
        <div className="modal-overlay" onClick={() => setIsNotificationsOpen(false)}>
          <div className="modal-content notifications-modal" onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setIsNotificationsOpen(false)}>✕</button>
            <h2>Notifications</h2>
            {notifications.length === 0 ? (
              <p style={{ color: 'rgba(255,255,255,0.5)', textAlign: 'center', padding: '2rem' }}>You have no notifications.</p>
            ) : (
              <div className="notifications-list" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1.5rem', maxHeight: '400px', overflowY: 'auto' }}>
                {notifications.map(notif => (
                  <div key={notif.id} style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '12px', padding: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                      <strong>{notif.fromName}</strong>
                      <button onClick={() => handleDismissNotification(notif)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer' }}>✕</button>
                    </div>
                    <p style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.8)', marginBottom: '1rem' }}>
                      recommended you <strong>{notif.movie.title}</strong>
                    </p>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button className="btn-secondary btn-sm" onClick={() => handleNotificationAction(notif, 'watchlist')}>+ Watchlist</button>
                      <button className="btn-secondary btn-sm" onClick={() => handleNotificationAction(notif, 'liked')}>❤️ Liked</button>
                      <button className="btn-secondary btn-sm" onClick={() => handleNotificationAction(notif, 'watched')}>👁️ Watched</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default Navbar;
