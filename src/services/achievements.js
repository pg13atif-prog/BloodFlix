import { ref, set, get } from 'firebase/database';
import { db } from './firebase';
import { getWatchlist, getLiked, getWatched } from './firestore';

// ── Achievement Definitions ───────────────────────────────────────────
export const ACHIEVEMENTS_LIST = [
  // First-time achievements
  {
    id: 'first_steps',
    name: 'First Steps',
    description: 'Unlock when you sign up.',
    category: 'First-time',
    icon: '🎉',
  },
  {
    id: 'first_pick',
    name: 'First Pick',
    description: 'Save your first movie to Watchlist.',
    category: 'First-time',
    icon: '⭐',
  },
  {
    id: 'first_favorite',
    name: 'First Favorite',
    description: 'Like your first movie.',
    category: 'First-time',
    icon: '❤️',
  },
  {
    id: 'first_discovery',
    name: 'First Discovery',
    description: 'Open your first movie details page.',
    category: 'First-time',
    icon: '🎬',
  },
  {
    id: 'trailer_seeker',
    name: 'Trailer Seeker',
    description: 'Watch your first official trailer.',
    category: 'First-time',
    icon: '▶️',
  },
  {
    id: 'ai_explorer',
    name: 'AI Explorer',
    description: 'Use AI recommendations for the first time.',
    category: 'First-time',
    icon: '🤖',
  },
  {
    id: 'curious_mind',
    name: 'Curious Mind',
    description: 'Perform your first search.',
    category: 'First-time',
    icon: '🔍',
  },

  // Watchlist achievements
  {
    id: 'collector',
    name: 'Collector',
    description: 'Save 10 movies to your watchlist.',
    category: 'Watchlist',
    icon: '📚',
    maxProgress: 10,
  },
  {
    id: 'archivist',
    name: 'Archivist',
    description: 'Save 50 movies to your watchlist.',
    category: 'Watchlist',
    icon: '🗂',
    maxProgress: 50,
  },
  {
    id: 'curator',
    name: 'Curator',
    description: 'Save 100 movies to your watchlist.',
    category: 'Watchlist',
    icon: '🏛',
    maxProgress: 100,
  },

  // Movie explorer achievements
  {
    id: 'explorer',
    name: 'Explorer',
    description: 'View 25 unique movies.',
    category: 'Movie Explorer',
    icon: '🧭',
    maxProgress: 25,
  },
  {
    id: 'world_explorer',
    name: 'World Explorer',
    description: 'View movies from 10 different countries.',
    category: 'Movie Explorer',
    icon: '🌍',
    maxProgress: 10,
  },
  {
    id: 'genre_hopper',
    name: 'Genre Hopper',
    description: 'Explore 8 major genres.',
    category: 'Movie Explorer',
    icon: '🎭',
    maxProgress: 8,
  },

  // Hours watched achievements
  {
    id: 'moviegoer',
    name: 'Moviegoer',
    description: '10 hours watched.',
    category: 'Hours Watched',
    icon: '🍿',
    maxProgress: 10,
  },
  {
    id: 'film_buff',
    name: 'Film Buff',
    description: '25 hours watched.',
    category: 'Hours Watched',
    icon: '🎬',
    maxProgress: 25,
  },
  {
    id: 'screen_enthusiast',
    name: 'Screen Enthusiast',
    description: '50 hours watched.',
    category: 'Hours Watched',
    icon: '🎞',
    maxProgress: 50,
  },
  {
    id: 'cinephile',
    name: 'Cinephile',
    description: '100 hours watched.',
    category: 'Hours Watched',
    icon: '🌟',
    maxProgress: 100,
  },
  {
    id: 'cinema_addict',
    name: 'Cinema Addict',
    description: '200 hours watched.',
    category: 'Hours Watched',
    icon: '🎥',
    maxProgress: 200,
  },
  {
    id: 'silver_screen_veteran',
    name: 'Silver Screen Veteran',
    description: '350 hours watched.',
    category: 'Hours Watched',
    icon: '🏆',
    maxProgress: 350,
  },
  {
    id: 'master_of_movies',
    name: 'Master of Movies',
    description: '500 hours watched.',
    category: 'Hours Watched',
    icon: '👑',
    maxProgress: 500,
  },
  {
    id: 'legend_of_cinema',
    name: 'Legend of Cinema',
    description: '750 hours watched.',
    category: 'Hours Watched',
    icon: '💎',
    maxProgress: 750,
  },
  {
    id: 'cinema_immortal',
    name: 'Cinema Immortal',
    description: '1000 hours watched.',
    category: 'Hours Watched',
    icon: '🎭',
    maxProgress: 1000,
  },

  // AI achievements
  {
    id: 'prompt_master',
    name: 'Prompt Master',
    description: 'Use AI recommendations 10 times.',
    category: 'AI',
    icon: '🧠',
    maxProgress: 10,
  },
];

// Helper to get stats reference
const getStatsRef = (userId) => ref(db, `users/${userId}/stats`);
const getUnlockedRef = (userId) => ref(db, `users/${userId}/unlockedAchievements`);

// Get user stats from database
export const getUserStats = async (userId) => {
  if (!userId) return null;
  const snapshot = await get(getStatsRef(userId));
  if (snapshot.exists()) {
    const val = snapshot.val();
    return {
      aiSearchesCount: val.aiSearchesCount || 0,
      trailersWatchedCount: val.trailersWatchedCount || 0,
      detailViewsCount: val.detailViewsCount || 0,
      uniqueViewedIds: val.uniqueViewedIds || [],
      viewedCountries: val.viewedCountries || [],
      searchesCount: val.searchesCount || 0,
    };
  }
  return {
    aiSearchesCount: 0,
    trailersWatchedCount: 0,
    detailViewsCount: 0,
    uniqueViewedIds: [],
    viewedCountries: [],
    searchesCount: 0,
  };
};

// Increment simple counter stats
export const incrementStat = async (userId, statName) => {
  if (!userId) return;
  const stats = await getUserStats(userId);
  stats[statName] = (stats[statName] || 0) + 1;
  await set(getStatsRef(userId), stats);
  // Auto check achievements
  await checkAndUnlockAchievements(userId);
};

// Track specific detail view actions
export const trackDetailView = async (userId, movieId, productionCountries = []) => {
  if (!userId || !movieId) return;
  const stats = await getUserStats(userId);
  
  stats.detailViewsCount += 1;
  
  const viewedIds = new Set(stats.uniqueViewedIds);
  viewedIds.add(movieId);
  stats.uniqueViewedIds = Array.from(viewedIds);

  if (productionCountries && productionCountries.length > 0) {
    const countries = new Set(stats.viewedCountries);
    productionCountries.forEach(c => countries.add(c));
    stats.viewedCountries = Array.from(countries);
  }

  await set(getStatsRef(userId), stats);
  await checkAndUnlockAchievements(userId);
};

// Fire custom event to show achievement toast
const triggerUnlockToast = (achievement) => {
  const event = new CustomEvent('achievement-unlocked', {
    detail: { name: achievement.name, desc: achievement.description }
  });
  window.dispatchEvent(event);
};

// Master function to check and unlock achievements
export const checkAndUnlockAchievements = async (userId) => {
  if (!userId) return;

  try {
    const [stats, watchlist, liked, watched, unlockedSnapshot] = await Promise.all([
      getUserStats(userId),
      getWatchlist(userId),
      getLiked(userId),
      getWatched(userId),
      get(getUnlockedRef(userId)),
    ]);

    const unlockedMap = unlockedSnapshot.exists() ? unlockedSnapshot.val() : {};
    const newUnlocked = { ...unlockedMap };
    let hasNewUnlock = false;

    // Helper: calculate total hours watched
    const totalMinutes = watched.reduce((sum, m) => sum + (parseInt(m.runtime, 10) || 0), 0);
    const totalHours = totalMinutes / 60;

    // Helper: calculate unique genres
    const uniqueGenres = new Set();
    [...watchlist, ...liked, ...watched].forEach(m => {
      if (m.category) uniqueGenres.add(m.category);
    });

    ACHIEVEMENTS_LIST.forEach(ach => {
      // Skip if already unlocked
      if (unlockedMap[ach.id]) return;

      let conditionMet = false;

      switch (ach.id) {
        case 'first_steps':
          conditionMet = true; // Logged in, checking achievements validates this
          break;
        case 'first_pick':
          conditionMet = watchlist.length >= 1;
          break;
        case 'first_favorite':
          conditionMet = liked.length >= 1;
          break;
        case 'first_discovery':
          conditionMet = stats.detailViewsCount >= 1 || stats.uniqueViewedIds.length >= 1;
          break;
        case 'trailer_seeker':
          conditionMet = stats.trailersWatchedCount >= 1;
          break;
        case 'ai_explorer':
          conditionMet = stats.aiSearchesCount >= 1;
          break;
        case 'curious_mind':
          conditionMet = stats.searchesCount >= 1;
          break;
        case 'collector':
          conditionMet = watchlist.length >= 10;
          break;
        case 'archivist':
          conditionMet = watchlist.length >= 50;
          break;
        case 'curator':
          conditionMet = watchlist.length >= 100;
          break;
        case 'explorer':
          conditionMet = stats.uniqueViewedIds.length >= 25;
          break;
        case 'world_explorer':
          conditionMet = stats.viewedCountries.length >= 10;
          break;
        case 'genre_hopper':
          conditionMet = uniqueGenres.size >= 8;
          break;
        case 'moviegoer':
          conditionMet = totalHours >= 10;
          break;
        case 'film_buff':
          conditionMet = totalHours >= 25;
          break;
        case 'screen_enthusiast':
          conditionMet = totalHours >= 50;
          break;
        case 'cinephile':
          conditionMet = totalHours >= 100;
          break;
        case 'cinema_addict':
          conditionMet = totalHours >= 200;
          break;
        case 'silver_screen_veteran':
          conditionMet = totalHours >= 350;
          break;
        case 'master_of_movies':
          conditionMet = totalHours >= 500;
          break;
        case 'legend_of_cinema':
          conditionMet = totalHours >= 750;
          break;
        case 'cinema_immortal':
          conditionMet = totalHours >= 1000;
          break;
        case 'prompt_master':
          conditionMet = stats.aiSearchesCount >= 10;
          break;
        default:
          break;
      }

      if (conditionMet) {
        newUnlocked[ach.id] = {
          unlockedAt: new Date().toISOString()
        };
        hasNewUnlock = true;
        triggerUnlockToast(ach);
      }
    });

    if (hasNewUnlock) {
      await set(getUnlockedRef(userId), newUnlocked);
    }
  } catch (err) {
    console.error('Error checking achievements:', err);
  }
};
