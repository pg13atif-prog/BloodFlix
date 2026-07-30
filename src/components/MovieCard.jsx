import { memo } from 'react';
import './MovieCard.css';

const MovieCard = memo(({ id, title, year, rating, poster, category, mediaType, onClick }) => {
  const handleClick = () => {
    if (onClick) {
      onClick(id);
    } else if (id) {
      window.location.hash = `${mediaType || 'movie'}/${id}`;
    }
  };

  return (
    <article
      className="movie-card"
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick();
        }
      }}
      style={{ cursor: 'pointer' }}
    >
      <div className="poster-container">
        <img src={poster} alt={`${title} poster`} className="movie-poster" loading="lazy" />
        <div className="poster-overlay">
          <span className="play-button" aria-label={`View ${title} details`}>
            <span aria-hidden="true">&#9654;</span>
          </span>
          <span className="movie-rating"><span className="star" aria-hidden="true">&#9733;</span> {rating}</span>
          <span className="movie-year">{year}</span>
        </div>
      </div>
      <div className="movie-info-outside">
        <h3 className="movie-title">{title}</h3>
        <p className="movie-genre">{category} &bull; {mediaType === 'tv' ? 'TV Show' : 'Movie'}</p>
      </div>
    </article>
  );
});

export default MovieCard;

