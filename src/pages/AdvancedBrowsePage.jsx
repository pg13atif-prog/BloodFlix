import { useState, useEffect } from 'react';
import MovieCard from '../components/MovieCard';
import { discoverMovies, genres } from '../services/tmdb';
import './AdvancedBrowsePage.css';

const AdvancedBrowsePage = () => {
  const [items, setItems] = useState([]);
  const [status, setStatus] = useState('loading');
  const [selectedGenre, setSelectedGenre] = useState('');
  const [selectedYear, setSelectedYear] = useState('');

  // Generate an array of years from current year down to 1950
  const currentYear = new Date().getFullYear();
  const years = Array.from(new Array(currentYear - 1950 + 1), (val, index) => currentYear - index);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    const controller = new AbortController();
    setStatus('loading');

    discoverMovies({ genreId: selectedGenre, year: selectedYear }, controller.signal)
      .then((data) => {
        setItems(data);
        setStatus('success');
      })
      .catch((error) => {
        if (error.name !== 'AbortError') {
          console.error(error);
          setStatus('error');
        }
      });

    return () => controller.abort();
  }, [selectedGenre, selectedYear]);

  return (
    <div className="advanced-browse-page">
      <div className="advanced-browse-header">
        <h1 className="advanced-browse-title">Discover Movies</h1>
        
        <div className="filters-container">
          <div className="filter-group">
            <label htmlFor="genre-select">Genre</label>
            <select 
              id="genre-select" 
              value={selectedGenre} 
              onChange={(e) => setSelectedGenre(e.target.value)}
              className="filter-select"
            >
              <option value="">All Genres</option>
              {Object.entries(genres).map(([id, name]) => (
                <option key={id} value={id}>{name}</option>
              ))}
            </select>
          </div>
          
          <div className="filter-group">
            <label htmlFor="year-select">Release Year</label>
            <select 
              id="year-select" 
              value={selectedYear} 
              onChange={(e) => setSelectedYear(e.target.value)}
              className="filter-select"
            >
              <option value="">All Years</option>
              {years.map((year) => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {status === 'loading' && (
        <div className="media-state">
          <div className="spinner"></div>
          <p>Loading movies...</p>
        </div>
      )}

      {status === 'error' && (
        <div className="media-state error">
          <h2>Oops!</h2>
          <p>We couldn't load movies right now. Please try again later.</p>
        </div>
      )}

      {status === 'success' && items.length === 0 && (
        <div className="media-state">
          <h2>No results found</h2>
          <p>Try adjusting your filters.</p>
        </div>
      )}

      {status === 'success' && items.length > 0 && (
        <div className="media-grid">
          {items.map((item) => (
            <MovieCard key={item.id} {...item} />
          ))}
        </div>
      )}
    </div>
  );
};

export default AdvancedBrowsePage;
