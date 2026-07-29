import { useEffect, useState } from "react";
import Navbar from "./components/Navbar";
import Hero from "./components/Hero";
import MovieRow from "./components/MovieRow";
import MovieDetail from "./pages/MovieDetail";
import MediaBrowsePage from "./pages/MediaBrowsePage";
import AdvancedBrowsePage from "./pages/AdvancedBrowsePage";
import SearchPage from "./pages/SearchPage";
import ProfilePage from "./pages/ProfilePage";
import { getPopularMovies, getPopularTvShows, getTrending, getSimilarMovies } from "./services/tmdb";
import { useAuth } from "./context/AuthContext";
import { getWatchlist } from "./services/firestore";

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

      switch (hash) {
        case '#movies':
          setCurrentRoute('movies');
          setCurrentParams(null);
          break;
        case '#tvshows':
          setCurrentRoute('tvshows');
          setCurrentParams(null);
          break;
        case '#profile':
          setCurrentRoute('profile');
          setCurrentParams(null);
          break;
        case '#trending-movies':
          setCurrentRoute('trending-movies');
          setCurrentParams(null);
          break;
        case '#trending-tv':
          setCurrentRoute('trending-tv');
          setCurrentParams(null);
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
      case 'movie-detail':
        return <MovieDetail movieId={currentParams.id} mediaType={currentParams.type} onBack={() => { window.location.hash = ""; }} />;
      
      case 'movies':
        return <AdvancedBrowsePage />;
        
      case 'tvshows':
        return <MediaBrowsePage title="Popular TV Shows" fetchMethod={getPopularTvShows} />;
        
      case 'trending-movies':
        return <MediaBrowsePage title="Trending Movies" fetchMethod={(signal) => getTrending('movie', 'day', signal)} />;
        
      case 'trending-tv':
        return <MediaBrowsePage title="Trending TV Shows" fetchMethod={(signal) => getTrending('tv', 'day', signal)} />;
        
      case 'search':
        return <SearchPage query={currentParams?.query || ''} />;
        
      case 'profile':
        return <ProfilePage />;
        
      case 'home':
      default:
        return (
          <>
            <Hero movie={movies[0]} />
            <main>
              {status === "loading" && <p className="movie-status">Loading popular movies…</p>}
              {status === "error" && (
                <p className="movie-status">We couldn’t load content right now.</p>
              )}
              {status === "success" && (
                <>
                  {recommended.length > 0 && (
                    <MovieRow title={`Because you liked "${likedTitle}"`} movies={recommended} />
                  )}
                  <MovieRow title="Popular Movies" movies={movies} />
                  <MovieRow title="Trending TV Shows" movies={tvShows} />
                  <MovieRow title="Trending Movies This Week" movies={trending} />
                </>
              )}
            </main>
          </>
        );
    }
  };

  return (
    <>
      <Navbar />
      {renderContent()}
    </>
  );
}

export default App;
