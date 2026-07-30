import { useState, useEffect } from 'react';
import { getMovieVideos } from '../services/tmdb';
import './Hero.css';
import heroBg from '../assets/hero-bg-B0GMlozk.png';

/**
 * Hero Component
 * Full-viewport cinematic hero section featuring a movie backdrop,
 * dark gradient overlays, title, rating, genres, description, and CTA buttons.
 * All content uses staggered fade-in-up entrance animations.
 */
const Hero = ({ movie }) => {
  const featuredId = movie?.id || 157336; // Interstellar ID or custom movie
  const [showTrailerModal, setShowTrailerModal] = useState(false);
  const [trailerKey, setTrailerKey] = useState(null);

  useEffect(() => {
    let isMounted = true;
    const fetchTrailer = async () => {
      try {
        const videos = await getMovieVideos(featuredId, movie?.mediaType || 'movie');
        if (videos.length > 0 && isMounted) {
          setTrailerKey(videos[0].key);
        }
      } catch (err) {
        console.error("Failed to fetch trailer for Hero", err);
      }
    };
    if (featuredId) {
      fetchTrailer();
    }
    return () => { isMounted = false; };
  }, [featuredId, movie?.mediaType]);

  // Handle ESC key for modal
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && showTrailerModal) {
        setShowTrailerModal(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showTrailerModal]);

  const handleNavigate = () => {
    window.location.hash = `movie/${featuredId}`;
  };

  return (
    <section className="hero" id="hero-section" aria-label="Featured Movie">
      {/* ── Background Image ── */}
      <div className="hero__backdrop" aria-hidden="true">
        <img
          src={movie?.backdrop || heroBg}
          alt=""
          loading="eager"
          draggable="false"
        />
      </div>

      {/* ── Gradient Overlay ── */}
      <div className="hero__overlay" aria-hidden="true" />

      {/* ── Content ── */}
      <div className="hero__content">
        {/* Title */}
        <h1 className="hero__title stagger-1" id="hero-title">
          {movie?.title || 'Interstellar'}
        </h1>

        {/* Star Rating */}
        <div className="hero__rating stagger-2" id="hero-rating" aria-label="Rating: 5 out of 5 stars">
          {[1, 2, 3, 4, 5].map((star) => (
            <span key={star} className="hero__star" aria-hidden="true">
              ★
            </span>
          ))}
          <span className="hero__rating-text">{movie?.rating || '9.2'} / 10</span>
        </div>

        {/* Genres */}
        <div className="hero__genres stagger-3" id="hero-genres">
          <span className="hero__genre">{movie?.category || 'Sci-Fi'}</span>
          <span className="hero__genre-dot" aria-hidden="true" />
          <span className="hero__genre">Drama</span>
          <span className="hero__genre-dot" aria-hidden="true" />
          <span className="hero__genre">Adventure</span>
        </div>

        {/* Description */}
        <p className="hero__description stagger-4" id="hero-description">
          {movie?.overview ||
            "A team of explorers travel through a wormhole in space in an attempt to ensure humanity's survival. When Earth becomes uninhabitable, a group of astronauts ventures beyond our solar system in search of a new home."}
        </p>

        {/* CTA Buttons */}
        <div className="hero__actions stagger-5" id="hero-actions">
          {/* Watch Trailer Button */}
          {trailerKey ? (
            <button className="hero__btn hero__btn--play" id="btn-play" type="button" onClick={() => setShowTrailerModal(true)}>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M8 5v14l11-7z" />
              </svg>
              Watch Official Trailer
            </button>
          ) : (
            <button className="hero__btn hero__btn--play disabled" id="btn-play-disabled" type="button" disabled>
              Trailer Unavailable
            </button>
          )}

          {/* View Details Button */}
          <button className="hero__btn hero__btn--info" id="btn-more-info" type="button" onClick={handleNavigate}>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="16" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
            View Details
          </button>
        </div>
      </div>

      {/* ── Bottom Vignette ── */}
      <div className="hero__vignette" aria-hidden="true" />

      {/* Trailer Modal */}
      {showTrailerModal && trailerKey && (
        <div className="trailer-modal-overlay" onClick={() => setShowTrailerModal(false)}>
          <div className="trailer-modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close-btn" onClick={() => setShowTrailerModal(false)} aria-label="Close trailer">
              &times;
            </button>
            <div className="video-responsive">
              <iframe
                src={`https://www.youtube.com/embed/${trailerKey}?autoplay=1`}
                title="Official Trailer"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              ></iframe>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default Hero;
