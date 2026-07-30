import { useEffect, useState } from "react";
import Navbar from "./components/Navbar";
import Hero from "./components/Hero";
import { checkAndUnlockAchievements } from "./services/achievements";
import MovieRow from "./components/MovieRow";
import MovieDetail from "./pages/MovieDetail";
import MediaBrowsePage from "./pages/MediaBrowsePage";
import SearchPage from "./pages/SearchPage";
import ProfilePage from "./pages/ProfilePage";
import { getPopularMovies, getPopularTvShows, getTrending, getSimilarMovies } from "./services/tmdb";
import { useAuth } from "./context/AuthContext";
import { getWatchlist } from "./services/firestore";
import { MovieRowSkeleton } from "./components/SkeletonLoader";
import AiDiscoveryPage from "./pages/AiDiscoveryPage";
import TvEpisodePage from "./pages/TvEpisodePage";
import RecommendedPage from "./pages/RecommendedPage";
import DiscoverPage from "./pages/DiscoverPage";
import CineAiPage from "./pages/CineAiPage";
import SocialPage from "./pages/SocialPage";
import AchievementsPage from "./pages/AchievementsPage";
import WatchlistPage from "./pages/WatchlistPage";

// CineAI Tools
import MoviePlanner from "./pages/cineai/MoviePlanner";
import PickForMe from "./pages/cineai/PickForMe";
import MovieDebate from "./pages/cineai/MovieDebate";

function App() {
  const [movies, setMovies] = useState([]);
  const [tvShows, setTvShows] = useState([]);
  const [trending, setTrending] = useState([]);
  const [status, setStatus] = useState("loading");
  
  // Recommendation state
  const [recommended, setRecommended] = useState([]);
  const [likedTitle, setLikedTitle] = useState("");
  const { currentUser } = useAuth();
  
  // Routing state
  const [currentRoute, setCurrentRoute] = useState('home'); // home, movies, tvshows, search, profile, movie-detail, trending-movies, trending-tv
  const [currentParams, setCurrentParams] = useState(null);

  useEffect(() => {
    const parseHash = () => {
      const hash = window.location.hash;
      
      const episodeMatch = hash.match(/^#episode\/tv\/(\d+)\/season\/(\d+)\/episode\/(\d+)/);
      if (episodeMatch) {
        setCurrentRoute('episode-detail');
        setCurrentParams({ seriesId: episodeMatch[1], seasonNumber: episodeMatch[2], episodeNumber: episodeMatch[3] });
        return;
      }

      const detailMatch = hash.match(/^#(movie|tv)\/(\d+)/);
      if (detailMatch) {
        setCurrentRoute('movie-detail');
        setCurrentParams({ type: detailMatch[1], id: detailMatch[2] });
        return;
      }
      
      const searchMatch = hash.match(/^#search\?q=(.*)/);
      if (searchMatch) {
        setCurrentRoute('search');
        setCurrentParams({ query: decodeURIComponent(searchMatch[1]) });
        return;
      }

      const discoverMatch = hash.match(/^#discover\/(movies|tv|trending)/);
      if (discoverMatch) {
        setCurrentRoute('discover');
        setCurrentParams({ tab: discoverMatch[1] });
        return;
      }
      
      const cineAiMatch = hash.match(/^#cineai\/(what-to-watch|planner|pick-for-me|debate)/);
      if (cineAiMatch) {
        setCurrentRoute('cineai-tool');
        setCurrentParams({ tool: cineAiMatch[1] });
        return;
      }

      switch (hash) {
        case '#discover':
          setCurrentRoute('discover');
          setCurrentParams({ tab: 'movies' });
          break;
        case '#cineai':
          setCurrentRoute('cineai');
          setCurrentParams(null);
          break;
        case '#social':
          setCurrentRoute('social');
          setCurrentParams(null);
          break;
        case '#watchlist':
          setCurrentRoute('watchlist');
          setCurrentParams(null);
          break;
        case '#profile':
          setCurrentRoute('profile');
          setCurrentParams(null);
          break;
        case '#achievements':
          setCurrentRoute('achievements');
          setCurrentParams(null);
          break;
        case '#movies':
          setCurrentRoute('discover');
          setCurrentParams({ tab: 'movies' });
          break;
        case '#tvshows':
          setCurrentRoute('discover');
          setCurrentParams({ tab: 'tv' });
          break;
        case '#trending-tv':
        case '#trending-movies':
          setCurrentRoute('discover');
          setCurrentParams({ tab: 'trending' });
          break;
        default:
          setCurrentRoute('home');
          setCurrentParams(null);
      }
    };

    parseHash();
    window.addEventListener("hashchange", parseHash);
    return () => window.removeEventListener("hashchange", parseHash);
  }, []);

  useEffect(() => {
    // Only load home page data if we're on the home page or haven't loaded it yet
    if (movies.length > 0) return;
    
    const controller = new AbortController();

    Promise.all([
      getPopularMovies(controller.signal),
      getTrending('tv', 'day', controller.signal),
      getTrending('movie', 'week', controller.signal)
    ])
      .then(([popularMovies, trendingTv, trendingMovies]) => {
        setMovies(popularMovies);
        setTvShows(trendingTv);
        setTrending(trendingMovies);
        setStatus("success");
      })
      .catch((error) => {
        if (error.name !== "AbortError") {
          console.error(error);
          setStatus("error");
        }
      });

    return () => controller.abort();
  }, [movies.length]);

  // Fetch recommendations based on watchlist
  useEffect(() => {
    if (!currentUser) {
      setRecommended([]);
      setLikedTitle("");
      return;
    }

    const fetchRecommendations = async () => {
      try {
        const watchlist = await getWatchlist(currentUser.uid);
        if (watchlist.length > 0) {
          // Pick a random movie from watchlist
          const randomMovie = watchlist[Math.floor(Math.random() * watchlist.length)];
          const similar = await getSimilarMovies(randomMovie.id, randomMovie.mediaType || 'movie');
          
          if (similar.length > 0) {
            setLikedTitle(randomMovie.title);
            setRecommended(similar);
          }
        }
      } catch (err) {
        console.error("Failed to load recommendations", err);
      }
    };

    // Only fetch if we are on the home page
    if (currentRoute === 'home') {
      fetchRecommendations();
    }
  }, [currentUser, currentRoute]);

  const renderContent = () => {
    switch (currentRoute) {
      case 'episode-detail':
        return <TvEpisodePage
          seriesId={currentParams.seriesId}
          seasonNumber={currentParams.seasonNumber}
          episodeNumber={currentParams.episodeNumber}
          onBack={() => window.history.length > 2 ? window.history.back() : window.location.hash = ''}
        />;
      
      case 'movie-detail':
        return <MovieDetail movieId={currentParams.id} mediaType={currentParams.type} onBack={() => { 
          if (window.history.length > 2) {
            window.history.back();
          } else {
            window.location.hash = ""; 
          }
        }} />;
      
      case 'movies':
      case 'tvshows':
      case 'trending-tv':
      case 'trending-movies':
      case 'discover':
        return <DiscoverPage activeTab={currentParams?.tab || 'movies'} />;

      case 'cineai':
        return <CineAiPage />;

      case 'cineai-tool':
        if (currentParams?.tool === 'what-to-watch') return <AiDiscoveryPage />;
        if (currentParams?.tool === 'planner') return <MoviePlanner />;
        if (currentParams?.tool === 'pick-for-me') return <PickForMe />;
        if (currentParams?.tool === 'debate') return <MovieDebate />;
        return <div className="page-container"><h1>{currentParams.tool} coming soon</h1></div>;

      case 'social':
        return <SocialPage />;

      case 'watchlist':
        return <WatchlistPage />;

      case 'recommended':
        return <RecommendedPage />;
        
      case 'home':
      default:
        return (
          <>
            <Hero movies={movies.slice(0, 5)} loading={status === "loading"} />
            <main>
              {status === "loading" && (
                <>
                  <MovieRowSkeleton />
                  <MovieRowSkeleton />
                  <MovieRowSkeleton />
                </>
              )}
              {status === "error" && (
                <p className="movie-status">We couldn’t load content right now.</p>
              )}
              {status === "success" && (
                <>
                  {recommended.length > 0 && (
                    <MovieRow title={`Because you liked "${likedTitle}"`} movies={recommended} />
                  )}
                  <MovieRow title="Popular Movies" movies={movies} link="#movies" />
                  <MovieRow title="Trending TV Shows" movies={tvShows} link="#trending-tv" />
                  <MovieRow title="Trending Movies This Week" movies={trending} link="#trending-movies" />
                </>
              )}
            </main>
          </>
        );
    }
  };

  useEffect(() => {
    if (currentUser) {
      checkAndUnlockAchievements(currentUser.uid);
    }
  }, [currentUser]);

  return (
    <>
      <Navbar />
      {renderContent()}
      <AchievementToasts />
    </>
  );
}

const AchievementToasts = () => {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    const handleUnlock = (e) => {
      const { name, desc } = e.detail;
      const newToast = { id: Date.now(), name, desc };
      setToasts(prev => [...prev, newToast]);
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== newToast.id));
      }, 4000);
    };

    window.addEventListener('achievement-unlocked', handleUnlock);
    return () => window.removeEventListener('achievement-unlocked', handleUnlock);
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div className="achievement-toast-container">
      {toasts.map(t => (
        <div key={t.id} className="achievement-toast">
          <div className="toast-trophy">🏆</div>
          <div className="toast-body">
            <div className="toast-title">🏆 Achievement Unlocked!</div>
            <div className="toast-name">{t.name}</div>
            <div className="toast-desc">"{t.desc}"</div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default App;
