import { ref, get, set, remove, update } from 'firebase/database';
import { db } from './firebase';

// Helper to generate a 6-character alphanumeric code
const generateCode = () => {
  return 'CS-' + Math.random().toString(36).substring(2, 8).toUpperCase();
};

export const ensureFriendCode = async (userId, email) => {
  if (!userId) return null;
  const userRef = ref(db, `users/${userId}`);
  const userSnap = await get(userRef);
  
  let userData = userSnap.exists() ? userSnap.val() : {};
  
  if (userData.friendCode) {
    return userData.friendCode;
  }

  // Generate unique code
  let newCode = '';
  let isUnique = false;
  while (!isUnique) {
    newCode = generateCode();
    const codeSnap = await get(ref(db, `friendCodes/${newCode}`));
    if (!codeSnap.exists()) {
      isUnique = true;
    }
  }

  // Set the code
  const updates = {};
  updates[`users/${userId}/friendCode`] = newCode;
  updates[`users/${userId}/email`] = email || 'Guest'; // Save email or fallback
  updates[`friendCodes/${newCode}`] = userId;

  await update(ref(db), updates);
  return newCode;
};

export const searchByFriendCode = async (code) => {
  const codeToSearch = code.trim().toUpperCase();
  const codeSnap = await get(ref(db, `friendCodes/${codeToSearch}`));
  if (!codeSnap.exists()) return null;
  
  const friendId = codeSnap.val();
  const userSnap = await get(ref(db, `users/${friendId}`));
  if (!userSnap.exists()) return null;
  
  const data = userSnap.val();
  return {
    uid: friendId,
    friendCode: data.friendCode,
    email: data.email,
    username: data.email ? data.email.split('@')[0] : 'Guest',
    favoriteGenre: data.favoriteGenre || 'Unknown',
    avatar: data.avatar || null
  };
};

export const getFriendData = async (userId) => {
  const userSnap = await get(ref(db, `users/${userId}`));
  if (!userSnap.exists()) return null;
  const data = userSnap.val();
  return {
    uid: userId,
    friendCode: data.friendCode,
    email: data.email,
    username: data.email ? data.email.split('@')[0] : 'Guest',
    favoriteGenre: data.favoriteGenre || 'Unknown',
    avatar: data.avatar || null
  };
};

export const sendFriendRequest = async (fromId, toId) => {
  if (!fromId || !toId || fromId === toId) return;
  const updates = {};
  updates[`users/${fromId}/outgoingRequests/${toId}`] = Date.now();
  updates[`users/${toId}/incomingRequests/${fromId}`] = Date.now();
  await update(ref(db), updates);
};

export const cancelFriendRequest = async (fromId, toId) => {
  if (!fromId || !toId) return;
  const updates = {};
  updates[`users/${fromId}/outgoingRequests/${toId}`] = null;
  updates[`users/${toId}/incomingRequests/${fromId}`] = null;
  await update(ref(db), updates);
};

export const acceptFriendRequest = async (userId, friendId) => {
  if (!userId || !friendId) return;
  const updates = {};
  // Remove requests
  updates[`users/${userId}/incomingRequests/${friendId}`] = null;
  updates[`users/${friendId}/outgoingRequests/${userId}`] = null;
  updates[`users/${friendId}/incomingRequests/${userId}`] = null;
  updates[`users/${userId}/outgoingRequests/${friendId}`] = null;
  // Add friend
  updates[`users/${userId}/friends/${friendId}`] = Date.now();
  updates[`users/${friendId}/friends/${userId}`] = Date.now();
  await update(ref(db), updates);
};

export const rejectFriendRequest = async (userId, friendId) => {
  if (!userId || !friendId) return;
  const updates = {};
  updates[`users/${userId}/incomingRequests/${friendId}`] = null;
  updates[`users/${friendId}/outgoingRequests/${userId}`] = null;
  await update(ref(db), updates);
};

export const removeFriend = async (userId, friendId) => {
  if (!userId || !friendId) return;
  const updates = {};
  updates[`users/${userId}/friends/${friendId}`] = null;
  updates[`users/${friendId}/friends/${userId}`] = null;
  await update(ref(db), updates);
};

// Fetch relationships
export const getRelationships = async (userId) => {
  const userSnap = await get(ref(db, `users/${userId}`));
  if (!userSnap.exists()) return { friends: [], incoming: [], outgoing: [] };
  
  const data = userSnap.val();
  const friends = data.friends ? Object.keys(data.friends) : [];
  const incoming = data.incomingRequests ? Object.keys(data.incomingRequests) : [];
  const outgoing = data.outgoingRequests ? Object.keys(data.outgoingRequests) : [];
  
  return { friends, incoming, outgoing };
};
