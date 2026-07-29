import { useRef } from 'react';
import MovieCard from './MovieCard';
import './MovieRow.css';

const MovieRow = ({ title, movies, link }) => {
  const rowRef = useRef(null);

  const scroll = (direction) => {
    if (!rowRef.current) return;

    const { scrollLeft, clientWidth } = rowRef.current;
    const scrollTo = direction === 'left'
      ? scrollLeft - clientWidth + 200
      : scrollLeft + clientWidth - 200;

    rowRef.current.scrollTo({ left: scrollTo, behavior: 'smooth' });
  };

  const handleSeeAll = () => {
    if (link) {
      window.location.hash = link;
    }
  };

  return (
    <section className="movie-row-container" aria-labelledby={`${title}-heading`}>
      <div className="row-header">
        <h2 className="row-title" id={`${title}-heading`}>{title}</h2>
        {link && (
          <button className="row-see-all" type="button" onClick={handleSeeAll}>
            See All <span className="arrow" aria-hidden="true">&rsaquo;</span>
          </button>
        )}
      </div>

      <div className="row-wrapper">
        <button className="scroll-button left" type="button" aria-label={`Scroll ${title} left`} onClick={() => scroll('left')}>
          &lsaquo;
        </button>

        <div className="movie-row" ref={rowRef}>
          {movies.map((movie) => (
            <MovieCard key={movie.id} {...movie} />
          ))}
        </div>

        <button className="scroll-button right" type="button" aria-label={`Scroll ${title} right`} onClick={() => scroll('right')}>
          &rsaquo;
        </button>
      </div>
    </section>
  );
};

export default MovieRow;
