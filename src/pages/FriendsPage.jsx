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
  removeFriend
} from '../services/friends';
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
        setSearchResult({ ...res, compatibility: Math.floor(Math.random() * 41) + 60 }); // Mock 60-100%
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
                          <div className="friend-avatar">{f.avatar || f.username.charAt(0).toUpperCase()}</div>
                          <div className="friend-info">
                            <h4>{f.username}</h4>
                            <p>Fav Genre: {f.favoriteGenre}</p>
                          </div>
                        </div>
                        <div className="friend-card-actions">
                          <button className="btn-primary btn-sm" onClick={() => window.location.hash = '#social'}>Movie Match</button>
                          <button className="btn-secondary btn-sm" onClick={() => alert('Recommend movie feature coming soon!')}>Recommend</button>
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
                          <div className="friend-avatar-sm">{req.avatar || req.username.charAt(0).toUpperCase()}</div>
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
                          <div className="friend-avatar-sm">{req.avatar || req.username.charAt(0).toUpperCase()}</div>
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
                      <div className="friend-avatar-lg">{searchResult.avatar || searchResult.username.charAt(0).toUpperCase()}</div>
                      <div className="search-result-info">
                        <h2>{searchResult.username}</h2>
                        <p>Favorite Genre: {searchResult.favoriteGenre}</p>
                        <p className="compatibility-preview">Compatibility Preview: <span>{searchResult.compatibility}%</span></p>
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
    </div>
  );
};

export default FriendsPage;
