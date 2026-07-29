import { ref, set, remove, get, child } from 'firebase/database';
import { db } from './firebase';

const getUserWatchlistRef = (userId) => ref(db, `users/${userId}/watchlist`);
const getMovieDocRef = (userId, movieId) => ref(db, `users/${userId}/watchlist/${movieId}`);

export const addToWatchlist = async (userId, movie) => {
  if (!userId || !movie) return;
  const movieRef = getMovieDocRef(userId, movie.id);
  
  // Store enough data to display it on the profile/watchlist page correctly
  await set(movieRef, {
    id: movie.id,
    title: movie.title || movie.originalTitle || 'Unknown Title',
    poster: movie.poster !== undefined ? movie.poster : null,
    category: movie.category || 'Movie',
    year: movie.year || '—',
    rating: movie.rating || '—',
    mediaType: movie.mediaType || 'movie',
    addedAt: new Date().toISOString()
  });
};

export const removeFromWatchlist = async (userId, movieId) => {
  if (!userId || !movieId) return;
  const movieRef = getMovieDocRef(userId, movieId);
  await remove(movieRef);
};

export const isInWatchlist = async (userId, movieId) => {
  if (!userId || !movieId) return false;
  const movieRef = getMovieDocRef(userId, movieId);
  const snapshot = await get(movieRef);
  return snapshot.exists();
};

export const getWatchlist = async (userId) => {
  if (!userId) return [];
  const watchlistRef = getUserWatchlistRef(userId);
  const snapshot = await get(watchlistRef);
  
  if (snapshot.exists()) {
    const data = snapshot.val();
    return Object.values(data);
  }
  return [];
};
