import { useState, useEffect, useCallback } from 'react';
import MovieCard from '../components/MovieCard';
import { CardSkeleton } from '../components/SkeletonLoader';
import CustomSelect from '../components/CustomSelect';
import { discoverMedia, genres } from '../services/tmdb';
import { motion, AnimatePresence } from 'framer-motion';
import './AdvancedBrowsePage.css';

const DECADES = [
  { label: '2020s', value: '2020-2029' },
  { label: '2010s', value: '2010-2019' },
  { label: '2000s', value: '2000-2009' },
  { label: '90s', value: '1990-1999' },
  { label: '80s', value: '1980-1989' },
  { label: 'Classics', value: '1900-1979' },
];

const RATING_OPTIONS = [
  { label: 'Any', value: 0 },
  { label: '6+ ★', value: 6 },
  { label: '7+ ★', value: 7 },
  { label: '8+ ★', value: 8 },
];

const SORT_OPTIONS = [
  { label: 'Most Popular', value: 'popularity.desc' },
  { label: 'Highest Rated', value: 'vote_average.desc' },
  { label: 'Newest Releases', value: 'primary_release_date.desc' },
];

const AdvancedBrowsePage = ({ initialMediaType = 'movie', hideHeaderTitle = false }) => {
  const [mediaType, setMediaType] = useState(initialMediaType);
  const [selectedGenres, setSelectedGenres] = useState([]);
  const [selectedDecade, setSelectedDecade] = useState('');
  const [selectedYears, setSelectedYears] = useState([]);
  const [minRating, setMinRating] = useState(0);
  const [sortBy, setSortBy] = useState('popularity.desc');
  const [isFilterOpen, setIsFilterOpen] = useState(true);

  // Sync initialMediaType when prop changes
  useEffect(() => {
    setMediaType(initialMediaType);
  }, [initialMediaType]);

  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalResults, setTotalResults] = useState(0);
  const [status, setStatus] = useState('loading');
  const [loadingMore, setLoadingMore] = useState(false);

  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from(new Array(currentYear - 1980 + 1), (_, index) => currentYear - index);

  // Fetch initial page or when filters change
  const fetchFilterResults = useCallback(async (isLoadMore = false, targetPage = 1) => {
    if (!isLoadMore) {
      setStatus('loading');
    } else {
      setLoadingMore(true);
    }

    try {
      let yearsParam = [];
      if (selectedDecade) {
        yearsParam = selectedDecade;
      } else if (selectedYears.length > 0) {
        yearsParam = selectedYears;
      }

      const response = await discoverMedia({
        mediaType,
        genreIds: selectedGenres,
        years: yearsParam,
        minRating,
        sortBy,
        page: targetPage,
      });

      if (isLoadMore) {
        setItems(prev => [...prev, ...response.results]);
      } else {
        setItems(response.results);
      }

      setTotalPages(response.totalPages);
      setTotalResults(response.totalResults);
      setPage(response.page);
      setStatus('success');
    } catch (err) {
      console.error('Error discovering content:', err);
      if (!isLoadMore) setStatus('error');
    } finally {
      setLoadingMore(false);
    }
  }, [mediaType, selectedGenres, selectedDecade, selectedYears, minRating, sortBy]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setPage(1);
    fetchFilterResults(false, 1);
  }, [mediaType, selectedGenres, selectedDecade, selectedYears, minRating, sortBy, fetchFilterResults]);

  const handleLoadMore = () => {
    if (page < totalPages && !loadingMore) {
      const nextPage = page + 1;
      fetchFilterResults(true, nextPage);
    }
  };

  const toggleGenre = (genreId) => {
    const id = Number(genreId);
    setSelectedGenres(prev =>
      prev.includes(id) ? prev.filter(g => g !== id) : [...prev, id]
    );
  };

  const toggleYear = (year) => {
    setSelectedDecade('');
    const y = Number(year);
    setSelectedYears(prev =>
      prev.includes(y) ? prev.filter(item => item !== y) : [...prev, y]
    );
  };

  const selectDecade = (value) => {
    setSelectedYears([]);
    setSelectedDecade(prev => (prev === value ? '' : value));
  };

  const handleResetFilters = () => {
    setMediaType('movie');
    setSelectedGenres([]);
    setSelectedDecade('');
    setSelectedYears([]);
    setMinRating(0);
    setSortBy('popularity.desc');
  };

  const activeFiltersCount =
    selectedGenres.length +
    (selectedDecade ? 1 : 0) +
    selectedYears.length +
    (minRating > 0 ? 1 : 0) +
    (sortBy !== 'popularity.desc' ? 1 : 0);

  return (
    <div className="advanced-browse-page">
      <div className="advanced-browse-header">
        <div className="title-row">
          {!hideHeaderTitle && (
            <div>
              <h1 className="advanced-browse-title">Discover</h1>
              <p className="advanced-browse-subtitle">
                Filter movies and TV shows by genre, release era, and rating.
              </p>
            </div>
          )}

          <div className="header-actions">
            {/* Media Type Switcher */}
            <div className="media-type-toggle">
              <button
                className={`type-btn ${mediaType === 'movie' ? 'active' : ''}`}
                onClick={() => setMediaType('movie')}
              >
                Movies
              </button>
              <button
                className={`type-btn ${mediaType === 'tv' ? 'active' : ''}`}
                onClick={() => setMediaType('tv')}
              >
                TV Shows
              </button>
            </div>

            {/* Filter Drawer Toggle Button */}
            <button
              className={`filter-toggle-btn ${isFilterOpen ? 'active' : ''} ${activeFiltersCount > 0 ? 'has-active' : ''}`}
              onClick={() => setIsFilterOpen(!isFilterOpen)}
            >
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
              </svg>
              <span>Filters</span>
              {activeFiltersCount > 0 && <span className="filter-count-badge">{activeFiltersCount}</span>}
              <svg className={`chevron-icon ${isFilterOpen ? 'open' : ''}`} viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
            </button>
          </div>
        </div>

        {/* Collapsible Filter Panel */}
        <AnimatePresence>
          {isFilterOpen && (
            <motion.div
              className="filter-panel-wrapper"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
            >
              <div className="filter-panel glass-panel">
                {/* Genre Multi-Select Pills */}
                <div className="filter-section">
                  <div className="filter-section-header">
                    <label>Genres {selectedGenres.length > 0 && <span className="badge">{selectedGenres.length} selected</span>}</label>
                    {selectedGenres.length > 0 && (
                      <button className="clear-mini-btn" onClick={() => setSelectedGenres([])}>
                        Clear genres
                      </button>
                    )}
                  </div>
                  <div className="chips-container">
                    {Object.entries(genres).map(([id, name]) => {
                      const numId = Number(id);
                      const isSelected = selectedGenres.includes(numId);
                      return (
                        <button
                          key={id}
                          className={`chip ${isSelected ? 'chip--active' : ''}`}
                          onClick={() => toggleGenre(numId)}
                        >
                          {name}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Decades & Multi-Year Selector */}
                <div className="filter-section">
                  <div className="filter-section-header">
                    <label>Eras & Release Years</label>
                    {(selectedDecade || selectedYears.length > 0) && (
                      <button className="clear-mini-btn" onClick={() => { setSelectedDecade(''); setSelectedYears([]); }}>
                        Clear eras
                      </button>
                    )}
                  </div>
                  <div className="chips-container">
                    {DECADES.map(d => (
                      <button
                        key={d.value}
                        className={`chip ${selectedDecade === d.value ? 'chip--active' : ''}`}
                        onClick={() => selectDecade(d.value)}
                      >
                        {d.label}
                      </button>
                    ))}
                  </div>

                  {/* Specific Year Pills */}
                  <div className="years-scroll-row">
                    <span className="sub-label">Specific Years:</span>
                    <div className="years-chips">
                      {yearOptions.slice(0, 15).map(yr => {
                        const isSelected = selectedYears.includes(yr);
                        return (
                          <button
                            key={yr}
                            className={`chip chip--sm ${isSelected ? 'chip--active' : ''}`}
                            onClick={() => toggleYear(yr)}
                          >
                            {yr}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Bottom Controls Row: Rating, Sort & Reset */}
                <div className="filter-bottom-row">
                  {/* Minimum Rating */}
                  <div className="filter-group">
                    <label>Minimum Rating</label>
                    <div className="rating-buttons">
                      {RATING_OPTIONS.map(opt => (
                        <button
                          key={opt.value}
                          className={`rating-btn ${minRating === opt.value ? 'active' : ''}`}
                          onClick={() => setMinRating(opt.value)}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Sort By */}
                  <div className="filter-group">
                    <label htmlFor="sort-select">Sort By</label>
                    <CustomSelect
                      id="sort-select"
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                      className="filter-select"
                      options={SORT_OPTIONS}
                    />
                  </div>

                  {/* Reset All */}
                  {activeFiltersCount > 0 && (
                    <button className="reset-all-btn" onClick={handleResetFilters}>
                      ✕ Reset All ({activeFiltersCount})
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Active Filters Summary Bar */}
        <div className="results-meta-bar">
          <span className="results-count">
            Showing <strong>{items.length}</strong> of <strong>{totalResults.toLocaleString()}</strong> titles
          </span>

          {activeFiltersCount > 0 && !isFilterOpen && (
            <div className="active-filters-preview">
              <span className="preview-label">Active:</span>
              {selectedGenres.length > 0 && (
                <span className="active-pill">{selectedGenres.length} Genres</span>
              )}
              {(selectedDecade || selectedYears.length > 0) && (
                <span className="active-pill">Era Filtered</span>
              )}
              {minRating > 0 && (
                <span className="active-pill">{minRating}+ ★</span>
              )}
              <button className="reset-inline-btn" onClick={handleResetFilters}>
                Clear
              </button>
            </div>
          )}
        </div>
      </div>

      {/* States & Grid */}
      {status === 'loading' && (
        <div className="media-grid">
          {Array.from({ length: 12 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      )}

      {status === 'error' && (
        <div className="media-state error">
          <h2>Unable to Load Catalog</h2>
          <p>We encountered a connection issue. Please check your network and try again.</p>
        </div>
      )}

      {status === 'success' && items.length === 0 && (
        <div className="media-state">
          <h2>No Titles Match Your Filters</h2>
          <p>Try removing a genre or selecting a broader era range.</p>
          <button className="reset-all-btn" onClick={handleResetFilters} style={{ marginTop: '1rem' }}>
            Clear All Filters
          </button>
        </div>
      )}

      {status === 'success' && items.length > 0 && (
        <>
          <div className="media-grid">
            <AnimatePresence>
              {items.map((item, index) => (
                <motion.div
                  key={`${item.id}-${index}`}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.2 }}
                >
                  <MovieCard {...item} />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {/* Load More Button */}
          {page < totalPages && (
            <div className="load-more-container">
              <button
                className="load-more-btn"
                onClick={handleLoadMore}
                disabled={loadingMore}
              >
                {loadingMore ? (
                  <span className="btn-loading">
                    <span className="spinner-sm"></span> Loading More...
                  </span>
                ) : (
                  'Load More Titles'
                )}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default AdvancedBrowsePage;
