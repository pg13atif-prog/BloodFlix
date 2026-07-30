import { ref, set, remove, get } from 'firebase/database';
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
    return Object.values(data).filter(Boolean);
  }
  return [];
};

// ── Recently Viewed ──
const getRecentlyViewedRef = (userId) => ref(db, `users/${userId}/recentlyViewed`);

export const addRecentlyViewed = async (userId, movie) => {
  if (!userId || !movie) return;
  const historyRef = getRecentlyViewedRef(userId);
  const snapshot = await get(historyRef);
  let history = snapshot.exists() ? snapshot.val() : [];
  
  // Remove if it already exists to put it at the top
  history = history.filter(item => item.id !== movie.id);
  
  // Add to top
  history.unshift({
    id: movie.id,
    title: movie.title || movie.originalTitle || 'Unknown Title',
    poster: movie.poster !== undefined ? movie.poster : null,
    category: movie.category || 'Movie',
    year: movie.year || '—',
    rating: movie.rating || '—',
    mediaType: movie.mediaType || 'movie',
    viewedAt: new Date().toISOString()
  });
  
  // Limit to 20
  history = history.slice(0, 20);
  
  await set(historyRef, history);
};

export const getRecentlyViewed = async (userId) => {
  if (!userId) return [];
  const historyRef = getRecentlyViewedRef(userId);
  const snapshot = await get(historyRef);
  if (snapshot.exists()) {
    return snapshot.val();
  }
  return [];
};

// ── Watched ──
const getWatchedRef = (userId) => ref(db, `users/${userId}/watched`);
const getWatchedDocRef = (userId, movieId) => ref(db, `users/${userId}/watched/${movieId}`);

export const addToWatched = async (userId, movie, runtime = 0) => {
  if (!userId || !movie) return;
  const movieRef = getWatchedDocRef(userId, movie.id);
  await set(movieRef, {
    id: movie.id,
    title: movie.title || movie.originalTitle || 'Unknown Title',
    poster: movie.poster !== undefined ? movie.poster : null,
    category: movie.category || 'Movie',
    year: movie.year || '—',
    rating: movie.rating || '—',
    mediaType: movie.mediaType || 'movie',
    runtime: runtime || 0,
    addedAt: new Date().toISOString()
  });
};

export const removeFromWatched = async (userId, movieId) => {
  if (!userId || !movieId) return;
  const movieRef = getWatchedDocRef(userId, movieId);
  await remove(movieRef);
};

export const isWatched = async (userId, movieId) => {
  if (!userId || !movieId) return false;
  const movieRef = getWatchedDocRef(userId, movieId);
  const snapshot = await get(movieRef);
  return snapshot.exists();
};

export const getWatched = async (userId) => {
  if (!userId) return [];
  const watchedRef = getWatchedRef(userId);
  const snapshot = await get(watchedRef);
  if (snapshot.exists()) {
    return Object.values(snapshot.val()).filter(Boolean);
  }
  return [];
};

// ── Liked ──
const getLikedRef = (userId) => ref(db, `users/${userId}/liked`);
const getLikedDocRef = (userId, movieId) => ref(db, `users/${userId}/liked/${movieId}`);

export const addToLiked = async (userId, movie) => {
  if (!userId || !movie) return;
  const movieRef = getLikedDocRef(userId, movie.id);
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

export const removeFromLiked = async (userId, movieId) => {
  if (!userId || !movieId) return;
  const movieRef = getLikedDocRef(userId, movieId);
  await remove(movieRef);
};

export const isLiked = async (userId, movieId) => {
  if (!userId || !movieId) return false;
  const movieRef = getLikedDocRef(userId, movieId);
  const snapshot = await get(movieRef);
  return snapshot.exists();
};

export const getLiked = async (userId) => {
  if (!userId) return [];
  const likedRef = getLikedRef(userId);
  const snapshot = await get(likedRef);
  if (snapshot.exists()) {
    return Object.values(snapshot.val()).filter(Boolean);
  }
  return [];
};
