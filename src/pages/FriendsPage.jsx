import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  searchByFriendCode, 
  sendFriendRequest, 
  getRelationships, 
  getFriendData,
  acceptFriendRequest,
  rejectFriendRequest,
  cancelFriendRequest,
  removeFriend,
  recommendMovie
} from '../services/friends';
import { searchMedia } from '../services/tmdb';
import './FriendsPage.css';

const FriendsPage = () => {
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState('list'); // 'list', 'requests', 'search'
  
  // State
  const [friends, setFriends] = useState([]);
  const [incoming, setIncoming] = useState([]);
  const [outgoing, setOutgoing] = useState([]);
  const [loading, setLoading] = useState(true);

  // Search State
  const [searchCode, setSearchCode] = useState('');
  const [searchResult, setSearchResult] = useState(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState('');

  // Recommend Modal State
  const [showRecommendModal, setShowRecommendModal] = useState(false);
  const [selectedFriend, setSelectedFriend] = useState(null);
  const [recSearchQuery, setRecSearchQuery] = useState('');
  const [recSearchResults, setRecSearchResults] = useState([]);
  const [recSearchLoading, setRecSearchLoading] = useState(false);
  const [recFeedback, setRecFeedback] = useState('');

  // List Search & Sort
  const [listSearch, setListSearch] = useState('');
  
  useEffect(() => {
    if (!currentUser) return;
    loadRelationships();
  }, [currentUser]);

  const loadRelationships = async () => {
    setLoading(true);
    try {
      const { friends: fIds, incoming: iIds, outgoing: oIds } = await getRelationships(currentUser.uid);
      
      const fetchAll = async (ids) => {
        const data = await Promise.all(ids.map(id => getFriendData(id)));
        return data.filter(Boolean);
      };

      setFriends(await fetchAll(fIds));
      setIncoming(await fetchAll(iIds));
      setOutgoing(await fetchAll(oIds));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchCode = async (e) => {
    e.preventDefault();
    if (!searchCode.trim()) return;
    
    setSearchLoading(true);
    setSearchError('');
    setSearchResult(null);
    
    try {
      const res = await searchByFriendCode(searchCode);
      if (!res) {
        setSearchError('Friend code not found.');
      } else if (res.uid === currentUser.uid) {
        setSearchError('You cannot search for your own code.');
      } else {
        setSearchResult({ ...res });
      }
    } catch (err) {
      setSearchError('An error occurred.');
    } finally {
      setSearchLoading(false);
    }
  };

  const handleSendRequest = async (toId) => {
    await sendFriendRequest(currentUser.uid, toId);
    setSearchResult(null);
    setSearchCode('');
    loadRelationships();
    setActiveTab('requests');
  };

  const handleAccept = async (id) => {
    await acceptFriendRequest(currentUser.uid, id);
    loadRelationships();
  };

  const handleReject = async (id) => {
    await rejectFriendRequest(currentUser.uid, id);
    loadRelationships();
  };

  const handleCancel = async (id) => {
    await cancelFriendRequest(currentUser.uid, id);
    loadRelationships();
  };

  const handleRemove = async (id) => {
    if (window.confirm("Are you sure you want to remove this friend?")) {
      await removeFriend(currentUser.uid, id);
      loadRelationships();
    }
  };

  const handleRecommendSearch = async (e) => {
    e.preventDefault();
    if (!recSearchQuery.trim()) return;
    setRecSearchLoading(true);
    setRecFeedback('');
    try {
      const results = await searchMedia(recSearchQuery.trim());
      setRecSearchResults(results.slice(0, 5));
    } catch (err) {
      console.error(err);
      setRecFeedback('Failed to search.');
    } finally {
      setRecSearchLoading(false);
    }
  };

  const handleSendRecommendation = async (movieData) => {
    setRecFeedback('');
    try {
      await recommendMovie(currentUser.uid, currentUser.email?.split('@')[0] || 'Friend', selectedFriend.uid, movieData);
      setRecFeedback(`Successfully recommended ${movieData.title || movieData.name}!`);
      setTimeout(() => {
        setShowRecommendModal(false);
        setRecSearchResults([]);
        setRecSearchQuery('');
        setRecFeedback('');
      }, 1500);
    } catch (err) {
      setRecFeedback(err.message || 'Failed to recommend.');
    }
  };

  const filteredFriends = useMemo(() => {
    let filtered = friends;
    if (listSearch) {
      filtered = filtered.filter(f => f.username.toLowerCase().includes(listSearch.toLowerCase()));
    }
    // Alphabetical sort
    return filtered.sort((a, b) => a.username.localeCompare(b.username));
  }, [friends, listSearch]);

  if (!currentUser) {
    return <div className="page-container" style={{paddingTop: '100px', color: '#fff', textAlign: 'center'}}>Please sign in to manage friends.</div>;
  }

  return (
    <div className="friends-page page-container">
      <div className="friends-header">
        <h1>Friends</h1>
        <p>Connect with others, compare watchlists, and find your perfect movie match.</p>
      </div>

      <div className="friends-tabs">
        <button className={`friends-tab-btn ${activeTab === 'list' ? 'active' : ''}`} onClick={() => setActiveTab('list')}>
          My Friends ({friends.length})
        </button>
        <button className={`friends-tab-btn ${activeTab === 'requests' ? 'active' : ''}`} onClick={() => setActiveTab('requests')}>
          Requests {incoming.length > 0 && <span className="req-badge">{incoming.length}</span>}
        </button>
        <button className={`friends-tab-btn ${activeTab === 'search' ? 'active' : ''}`} onClick={() => setActiveTab('search')}>
          Add Friend
        </button>
      </div>

      <div className="friends-content">
        {loading ? (
          <div className="friends-loading">Loading...</div>
        ) : (
          <>
            {/* ── My Friends Tab ── */}
            {activeTab === 'list' && (
              <div className="friends-list-section">
                <input 
                  type="text" 
                  className="friends-search-input" 
                  placeholder="Search friends..." 
                  value={listSearch}
                  onChange={e => setListSearch(e.target.value)}
                />
                
                {filteredFriends.length === 0 ? (
                  <div className="friends-empty">No friends found.</div>
                ) : (
                  <div className="friends-grid">
                    {filteredFriends.map(f => (
                      <div key={f.uid} className="friend-card">
                        <div className="friend-card-header">
                          <div className="friend-avatar">{f.avatar ? <img src={f.avatar} style={{width:'100%', height:'100%', borderRadius:'50%', objectFit:'cover'}} alt=""/> : f.username.charAt(0).toUpperCase()}</div>
                          <div className="friend-info">
                            <h4>{f.username}</h4>
                            <p>Fav Genre: {f.favoriteGenre}</p>
                          </div>
                        </div>
                        <div className="friend-card-actions">
                          <button className="btn-primary btn-sm" onClick={() => window.location.hash = `#social?match=${f.friendCode}`}>Movie Match</button>
                          <button className="btn-secondary btn-sm" onClick={() => { setSelectedFriend(f); setShowRecommendModal(true); }}>Recommend</button>
                          <button className="btn-danger btn-sm" onClick={() => handleRemove(f.uid)}>Remove</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── Friend Requests Tab ── */}
            {activeTab === 'requests' && (
              <div className="friends-requests-section">
                <h3>Incoming Requests</h3>
                {incoming.length === 0 ? (
                  <p className="friends-empty-sm">No incoming requests.</p>
                ) : (
                  <div className="requests-list">
                    {incoming.map(req => (
                      <div key={req.uid} className="request-card">
                        <div className="req-user">
                          <div className="friend-avatar-sm">{req.avatar ? <img src={req.avatar} style={{width:'100%', height:'100%', borderRadius:'50%', objectFit:'cover'}} alt=""/> : req.username.charAt(0).toUpperCase()}</div>
                          <span>{req.username}</span>
                        </div>
                        <div className="req-actions">
                          <button className="btn-primary btn-sm" onClick={() => handleAccept(req.uid)}>Accept</button>
                          <button className="btn-secondary btn-sm" onClick={() => handleReject(req.uid)}>Reject</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <h3 style={{ marginTop: '2rem' }}>Outgoing Requests</h3>
                {outgoing.length === 0 ? (
                  <p className="friends-empty-sm">No outgoing requests.</p>
                ) : (
                  <div className="requests-list">
                    {outgoing.map(req => (
                      <div key={req.uid} className="request-card">
                        <div className="req-user">
                          <div className="friend-avatar-sm">{req.avatar ? <img src={req.avatar} style={{width:'100%', height:'100%', borderRadius:'50%', objectFit:'cover'}} alt=""/> : req.username.charAt(0).toUpperCase()}</div>
                          <span>{req.username}</span>
                        </div>
                        <div className="req-actions">
                          <button className="btn-danger btn-sm" onClick={() => handleCancel(req.uid)}>Cancel</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── Search Tab ── */}
            {activeTab === 'search' && (
              <div className="friends-search-section">
                <form className="add-friend-form" onSubmit={handleSearchCode}>
                  <input 
                    type="text" 
                    placeholder="Enter Friend Code (e.g. CS-4K9X2P)" 
                    value={searchCode}
                    onChange={e => setSearchCode(e.target.value)}
                    required
                  />
                  <button type="submit" className="btn-primary" disabled={searchLoading}>
                    {searchLoading ? 'Searching...' : 'Search'}
                  </button>
                </form>

                {searchError && <p className="error-text">{searchError}</p>}

                {searchResult && (
                  <div className="search-result-card glass-panel">
                    <div className="search-result-header">
                      <div className="friend-avatar-lg">{searchResult.avatar ? <img src={searchResult.avatar} style={{width:'100%', height:'100%', borderRadius:'50%', objectFit:'cover'}} alt=""/> : searchResult.username.charAt(0).toUpperCase()}</div>
                      <div className="search-result-info">
                        <h2>{searchResult.username}</h2>
                        <p>Favorite Genre: {searchResult.favoriteGenre}</p>
                      </div>
                    </div>
                    {friends.find(f => f.uid === searchResult.uid) ? (
                      <p className="already-friends-txt">You are already friends.</p>
                    ) : outgoing.find(o => o.uid === searchResult.uid) ? (
                      <p className="already-friends-txt">Request pending.</p>
                    ) : incoming.find(i => i.uid === searchResult.uid) ? (
                      <p className="already-friends-txt">This user has sent you a request.</p>
                    ) : (
                      <button className="btn-primary w-full" onClick={() => handleSendRequest(searchResult.uid)}>
                        Send Friend Request
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {showRecommendModal && selectedFriend && (
        <div className="modal-overlay" onClick={() => setShowRecommendModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <button className="modal-close" onClick={() => setShowRecommendModal(false)}>✕</button>
            <h2>Recommend to {selectedFriend.username}</h2>
            <form onSubmit={handleRecommendSearch} style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
              <input 
                type="text" 
                placeholder="Search for a movie or TV show..." 
                value={recSearchQuery}
                onChange={(e) => setRecSearchQuery(e.target.value)}
                style={{ flex: 1, padding: '0.75rem', borderRadius: '8px', background: 'rgba(255,255,255,0.1)', color: '#fff', border: 'none', outline: 'none' }}
              />
              <button type="submit" className="btn-primary" disabled={recSearchLoading}>Search</button>
            </form>
            {recFeedback && <p style={{ color: recFeedback.includes('Success') ? '#4ade80' : '#ef4444', marginBottom: '1rem' }}>{recFeedback}</p>}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '300px', overflowY: 'auto' }}>
              {recSearchResults.map(res => (
                <div key={res.id} style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: 'rgba(255,255,255,0.05)', padding: '0.5rem', borderRadius: '8px' }}>
                  {res.poster ? <img src={res.poster} alt="" style={{ width: '40px', height: '60px', objectFit: 'cover', borderRadius: '4px' }} /> : <div style={{ width: '40px', height: '60px', background: '#333', borderRadius: '4px' }} />}
                  <div style={{ flex: 1 }}>
                    <h4 style={{ margin: 0 }}>{res.title || res.name}</h4>
                    <p style={{ margin: 0, fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)' }}>{res.year}</p>
                  </div>
                  <button className="btn-secondary btn-sm" onClick={() => handleSendRecommendation(res)}>Send</button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FriendsPage;
