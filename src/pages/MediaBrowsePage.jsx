import { useState, useEffect } from 'react';
import MovieCard from '../components/MovieCard';
import './MediaBrowsePage.css';

const MediaBrowsePage = ({ title, fetchMethod }) => {
  const [items, setItems] = useState([]);
  const [status, setStatus] = useState('loading');

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    const controller = new AbortController();
    setStatus('loading');

    fetchMethod(controller.signal)
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
  }, [fetchMethod]);

  return (
    <div className="media-browse-page">
      <div className="media-browse-header">
        <h1 className="media-browse-title">{title}</h1>
      </div>

      {status === 'loading' && (
        <div className="media-state">
          <div className="spinner"></div>
          <p>Loading {title.toLowerCase()}...</p>
        </div>
      )}

      {status === 'error' && (
        <div className="media-state error">
          <h2>Oops!</h2>
          <p>We couldn't load {title.toLowerCase()} right now. Please try again later.</p>
        </div>
      )}

      {status === 'success' && (
        <div className="media-grid">
          {items.map((item) => (
            <MovieCard key={item.id} {...item} />
          ))}
        </div>
      )}
    </div>
  );
};

export default MediaBrowsePage;
