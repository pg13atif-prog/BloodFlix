import { useState, useEffect } from 'react';
import { fetchList, getTrending } from '../services/tmdb';
import MovieRow from '../components/MovieRow';
import { MovieRowSkeleton } from '../components/SkeletonLoader';
import './DiscoverPage.css';

const DiscoverPage = ({ activeTab = 'movies' }) => {
  const [data, setData] = useState({
    movies: { popular: [], topRated: [], upcoming: [], nowPlaying: [] },
    tv: { popular: [], topRated: [], airingToday: [], onTheAir: [] },
    trending: { today: [], week: [] }
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();

    const loadData = async () => {
      setLoading(true);
      try {
        if (activeTab === 'movies') {
          if (data.movies.popular.length === 0) {
            const [popular, topRated, upcoming, nowPlaying] = await Promise.all([
              fetchList('movie/popular?language=en-US&page=1', controller.signal),
              fetchList('movie/top_rated?language=en-US&page=1', controller.signal),
              fetchList('movie/upcoming?language=en-US&page=1', controller.signal),
              fetchList('movie/now_playing?language=en-US&page=1', controller.signal),
            ]);
            if (isMounted) setData(prev => ({ ...prev, movies: { popular, topRated, upcoming, nowPlaying } }));
          }
        } else if (activeTab === 'tv') {
          if (data.tv.popular.length === 0) {
            const [popular, topRated, airingToday, onTheAir] = await Promise.all([
              fetchList('tv/popular?language=en-US&page=1', controller.signal),
              fetchList('tv/top_rated?language=en-US&page=1', controller.signal),
              fetchList('tv/airing_today?language=en-US&page=1', controller.signal),
              fetchList('tv/on_the_air?language=en-US&page=1', controller.signal),
            ]);
            if (isMounted) setData(prev => ({ ...prev, tv: { popular, topRated, airingToday, onTheAir } }));
          }
        } else if (activeTab === 'trending') {
          if (data.trending.today.length === 0) {
            const [today, week] = await Promise.all([
              getTrending('all', 'day', controller.signal),
              getTrending('all', 'week', controller.signal)
            ]);
            if (isMounted) setData(prev => ({ ...prev, trending: { today, week } }));
          }
        }
      } catch (err) {
        if (err.name !== 'AbortError') console.error("Discover load error:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadData();

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [activeTab]);

  return (
    <div className="discover-page page-container">
      <div className="discover-header">
        <div className="discover-header-top">
          <h1>Discover</h1>
          {(activeTab === 'movies' || activeTab === 'tv') && (
            <button className="advanced-filter-btn" onClick={() => window.location.hash = activeTab === 'movies' ? '#movies' : '#tvshows'}>
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
              </svg>
              Advanced Filters
            </button>
          )}
        </div>
        <div className="discover-tabs">
          <a href="#discover/movies" className={`discover-tab ${activeTab === 'movies' ? 'active' : ''}`}>Movies</a>
          <a href="#discover/tv" className={`discover-tab ${activeTab === 'tv' ? 'active' : ''}`}>TV Shows</a>
          <a href="#discover/trending" className={`discover-tab ${activeTab === 'trending' ? 'active' : ''}`}>Trending</a>
        </div>
      </div>

      <div className="discover-content">
        {loading ? (
          <>
            <MovieRowSkeleton />
            <MovieRowSkeleton />
            <MovieRowSkeleton />
            <MovieRowSkeleton />
          </>
        ) : (
          <>
            {activeTab === 'movies' && (
              <>
                <MovieRow title="Now Playing" movies={data.movies.nowPlaying} />
                <MovieRow title="Popular Movies" movies={data.movies.popular} />
                <MovieRow title="Top Rated" movies={data.movies.topRated} />
                <MovieRow title="Upcoming" movies={data.movies.upcoming} />
              </>
            )}

            {activeTab === 'tv' && (
              <>
                <MovieRow title="Airing Today" movies={data.tv.airingToday} />
                <MovieRow title="Popular TV Shows" movies={data.tv.popular} />
                <MovieRow title="Top Rated" movies={data.tv.topRated} />
                <MovieRow title="On The Air" movies={data.tv.onTheAir} />
              </>
            )}

            {activeTab === 'trending' && (
              <>
                <MovieRow title="Trending Today" movies={data.trending.today} />
                <MovieRow title="Trending This Week" movies={data.trending.week} />
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default DiscoverPage;
