import { useState, useEffect } from 'react';
import MovieCard from '../components/MovieCard';
import { searchMedia } from '../services/tmdb';
import './SearchPage.css';

const SearchPage = ({ query }) => {
  const [results, setResults] = useState([]);
  const [status, setStatus] = useState('loading');

  useEffect(() => {
    if (!query) {
      setResults([]);
      setStatus('success');
      return;
    }

    const controller = new AbortController();
    setStatus('loading');

    searchMedia(query, controller.signal)
      .then((data) => {
        setResults(data);
        setStatus('success');
      })
      .catch((error) => {
        if (error.name !== 'AbortError') {
          console.error(error);
          setStatus('error');
        }
      });

    return () => controller.abort();
  }, [query]);

  return (
    <div className="search-page">
      <div className="search-header">
        <h1 className="search-title">
          {query ? `Search Results for "${query}"` : 'Search CineScope'}
        </h1>
      </div>

      {!query && (
        <div className="search-state">
          <p>Type something in the search bar to find movies and TV shows.</p>
        </div>
      )}

      {query && status === 'loading' && (
        <div className="search-state">
          <div className="spinner"></div>
          <p>Searching...</p>
        </div>
      )}

      {query && status === 'error' && (
        <div className="search-state error">
          <h2>Oops!</h2>
          <p>We encountered an error while searching. Please try again.</p>
        </div>
      )}

      {query && status === 'success' && results.length === 0 && (
        <div className="search-state">
          <h2>No results found</h2>
          <p>We couldn't find any matches for "{query}". Try a different spelling or keyword.</p>
        </div>
      )}

      {query && status === 'success' && results.length > 0 && (
        <div className="search-grid">
          {results.map((item) => (
            <MovieCard key={item.id} {...item} />
          ))}
        </div>
      )}
    </div>
  );
};

export default SearchPage;
