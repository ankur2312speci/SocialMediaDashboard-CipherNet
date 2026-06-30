import { useEffect, useState, useRef } from "react";
import { useAuthStore } from "../store/useAuthStore";
import { fetchUserProfile, fetchUserPosts, followUser, unfollowUser, fetchCallHistory } from "../services/api";
import { useParams } from "react-router-dom";
import { 
  Grid, BarChart2, ShieldCheck, MapPin, Link2, Calendar, FileText,
  UserCheck, UserPlus, Edit, Eye, MessageSquare, Heart, TrendingUp, Sparkles
} from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from "recharts";
import Modal from "../components/common/Modal";
import Button from "../components/common/Button";
import { motion } from "framer-motion";
import { getSocket } from "../hooks/useSocket";

function ProfilePage() {
  const { username: paramUsername } = useParams();
  const { user: currentUser, updateProfile, checkAuth } = useAuthStore();
  
  const isOwnProfile = !paramUsername || paramUsername === currentUser?.username;
  const targetUsername = isOwnProfile ? currentUser?.username : paramUsername;

  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [calls, setCalls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);

  // Tabs: 'posts' | 'analytics' | 'reels'
  const [activeTab, setActiveTab] = useState("posts");

  const [showFollowersModal, setShowFollowersModal] = useState(false);
  const [showFollowingModal, setShowFollowingModal] = useState(false);

  // Edit profile state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editName, setEditName] = useState("");
  const [editBio, setEditBio] = useState("");
  const [editWebsite, setEditWebsite] = useState("");
  const [editLocation, setEditLocation] = useState("");
  const [editAvatar, setEditAvatar] = useState("");
  const [editCover, setEditCover] = useState("");
  const avatarInputRef = useRef(null);
  const coverInputRef = useRef(null);

  useEffect(() => {
    loadProfileData();
  }, [targetUsername, currentUser]);

  const loadProfileData = async () => {
    if (!targetUsername) return;
    setLoading(true);
    try {
      const profileData = await fetchUserProfile(targetUsername);
      setProfile(profileData);
      
      const postsData = await fetchUserPosts(targetUsername);
      setPosts(postsData);

      if (currentUser && profileData.followers) {
        const isFollower = profileData.followers.some(f => {
          const id = typeof f === "object" ? f._id : f;
          return id?.toString() === currentUser._id?.toString();
        });
        setIsFollowing(isFollower);
      }

      // Load call history if viewing own analytics
      if (isOwnProfile) {
        const callHistory = await fetchCallHistory();
        setCalls(callHistory);
      }
    } catch (err) {
      console.error("Error loading profile details:", err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFollowToggle = async () => {
    if (!profile || !currentUser) return;
    
    const wasFollowing = isFollowing;
    const originalFollowers = [...profile.followers];
    
    const nextIsFollowing = !wasFollowing;
    let nextFollowers;
    if (nextIsFollowing) {
      nextFollowers = [...originalFollowers, {
        _id: currentUser._id,
        username: currentUser.username,
        name: currentUser.name,
        avatar: currentUser.avatar
      }];
    } else {
      nextFollowers = originalFollowers.filter(f => {
        const id = typeof f === "object" ? f._id : f;
        return id?.toString() !== currentUser._id?.toString();
      });
    }
      
    setIsFollowing(nextIsFollowing);
    setProfile({ ...profile, followers: nextFollowers });
    
    try {
      if (wasFollowing) {
        await unfollowUser(profile._id);
      } else {
        await followUser(profile._id);
      }
      
      const socket = getSocket();
      if (socket) {
        socket.emit("user-follow", {
          followerId: currentUser._id,
          followingId: profile._id,
          followersCount: nextFollowers.length
        });
      }
      
      checkAuth();
    } catch (err) {
      console.warn("Secure Follow E2EE: API failed. Rolling back.");
      setIsFollowing(wasFollowing);
      setProfile({ ...profile, followers: originalFollowers });
      alert("Failed to sync follow state with MongoDB. Reverting.");
    }
  };

  const handleMessageClick = () => {
    if (!profile) return;
    window.location.href = `/messages?userId=${profile._id}&username=${profile.username}&name=${encodeURIComponent(profile.name)}&avatar=${encodeURIComponent(profile.avatar)}`;
  };

  const handleEditProfileOpen = () => {
    if (!profile) return;
    setEditName(profile.name || "");
    setEditBio(profile.bio || "");
    setEditWebsite(profile.website || "");
    setEditLocation(profile.location || "");
    setEditAvatar(profile.avatar || "");
    setEditCover(profile.cover || "");
    setShowEditModal(true);
  };

  const handleAvatarUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setEditAvatar(reader.result);
    reader.readAsDataURL(file);
  };

  const handleCoverUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setEditCover(reader.result);
    reader.readAsDataURL(file);
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    try {
      const updated = await updateProfile({
        name: editName,
        bio: editBio,
        website: editWebsite,
        location: editLocation,
        avatar: editAvatar,
        cover: editCover
      });
      setProfile(updated);
      setShowEditModal(false);
    } catch (err) {
      console.error(err);
    }
  };

  // Mock analytics charts data
  const growthData = [
    { name: "Mon", followers: 10400 },
    { name: "Tue", followers: 10600 },
    { name: "Wed", followers: 11100 },
    { name: "Thu", followers: 11200 },
    { name: "Fri", followers: 12000 },
    { name: "Sat", followers: 12400 },
    { name: "Sun", followers: 12540 },
  ];

  const interactionData = [
    { name: "W1", likes: 240, comments: 80 },
    { name: "W2", likes: 350, comments: 110 },
    { name: "W3", likes: 410, comments: 140 },
    { name: "W4", likes: 580, comments: 210 },
  ];

  if (loading && !profile) {
    return <div className="text-center py-20 text-slate-500 text-xs animate-pulse">Loading secure profile data...</div>;
  }

  if (!profile) {
    return <div className="text-center py-20 text-slate-500 text-xs">Profile not found.</div>;
  }

  return (
    <div className="bg-slate-950 min-h-screen text-slate-100 pb-12 border-l border-slate-905">
      
      {/* Cover Image */}
      <div className="w-full h-44 md:h-64 relative bg-slate-900 border-b border-slate-900 overflow-hidden">
        {profile.cover ? (
          <img src={profile.cover} alt="cover" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-to-r from-cyan-950/20 via-slate-900 to-purple-950/20" />
        )}
      </div>

      <div className="max-w-4xl mx-auto px-4 md:px-8 relative">
        
        {/* Profile Avatar position overlay */}
        <div className="absolute -top-16 left-4 md:left-8">
          <div className="w-28 h-28 md:w-36 md:h-36 rounded-full border-4 border-slate-950 bg-slate-900 overflow-hidden p-[1px]">
            <img 
              src={profile.avatar || `https://ui-avatars.com/api/?name=${profile.username}`} 
              alt={profile.username} 
              className="w-full h-full rounded-full object-cover" 
            />
          </div>
        </div>

        {/* Profile Details Header */}
        <div className="pt-16 md:pt-24 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-2xl font-extrabold text-slate-100">@{profile.username}</h2>
                {profile.isVerified && (
                  <ShieldCheck className="w-5 h-5 text-cyan-400 fill-cyan-400/10" />
                )}
              </div>
              <h3 className="text-sm font-bold text-slate-400 mt-1">{profile.name}</h3>
            </div>

            {/* Action buttons */}
            <div className="flex gap-2">
              {isOwnProfile ? (
                <>
                  <Button variant="secondary" onClick={handleEditProfileOpen} className="flex items-center gap-1.5">
                    <Edit className="w-4 h-4" />
                    Edit Profile
                  </Button>
                </>
              ) : (
                <div className="flex gap-2">
                  <Button 
                    variant={isFollowing ? "secondary" : "primary"} 
                    onClick={handleFollowToggle}
                    className="flex items-center gap-1.5"
                  >
                    {isFollowing ? (
                      <>
                        <UserCheck className="w-4 h-4" />
                        Following
                      </>
                    ) : (
                      <>
                        <UserPlus className="w-4 h-4" />
                        Follow
                      </>
                    )}
                  </Button>
                  
                  <Button 
                    variant="secondary" 
                    onClick={handleMessageClick}
                    className="flex items-center gap-1.5"
                  >
                    <MessageSquare className="w-4 h-4" />
                    Message
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Counts */}
          <div className="flex gap-6 border-y border-slate-900/60 py-3.5 text-sm font-bold text-slate-350">
            <div><span className="text-white mr-1">{posts.length}</span> posts</div>
            <div className="cursor-pointer hover:text-white transition-colors" onClick={() => setShowFollowersModal(true)}>
              <span className="text-white mr-1">{profile.followers?.length || 0}</span> followers
            </div>
            <div className="cursor-pointer hover:text-white transition-colors" onClick={() => setShowFollowingModal(true)}>
              <span className="text-white mr-1">{profile.following?.length || 0}</span> following
            </div>
          </div>

          {/* Biography details */}
          <div className="space-y-3 text-xs md:text-sm text-slate-350 max-w-xl leading-relaxed">
            <p className="whitespace-pre-wrap">{profile.bio || "No biography added."}</p>
            
            <div className="flex flex-wrap gap-4 text-slate-500 font-semibold mt-2.5">
              {profile.location && (
                <div className="flex items-center gap-1">
                  <MapPin className="w-4 h-4 text-slate-500" />
                  <span>{profile.location}</span>
                </div>
              )}
              {profile.website && (
                <div className="flex items-center gap-1">
                  <Link2 className="w-4 h-4 text-slate-500" />
                  <a href={`http://${profile.website}`} target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline">
                    {profile.website}
                  </a>
                </div>
              )}
              <div className="flex items-center gap-1">
                <Calendar className="w-4 h-4 text-slate-500" />
                <span>Joined {new Date(profile.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Selection */}
        <div className="border-b border-slate-900 mt-10 flex gap-6">
          <button
            onClick={() => setActiveTab("posts")}
            className={`pb-4 text-xs font-bold uppercase tracking-wider flex items-center gap-2 relative transition-colors ${
              activeTab === "posts" ? "text-cyan-400" : "text-slate-500 hover:text-slate-300"
            }`}
          >
            <Grid className="w-4 h-4" />
            Grid Posts
          </button>
          
          {isOwnProfile && (
            <button
              onClick={() => setActiveTab("analytics")}
              className={`pb-4 text-xs font-bold uppercase tracking-wider flex items-center gap-2 relative transition-colors ${
                activeTab === "analytics" ? "text-cyan-400" : "text-slate-500 hover:text-slate-300"
              }`}
            >
              <BarChart2 className="w-4 h-4" />
              Creator Analytics
            </button>
          )}
        </div>

        {/* Tabs Content */}
        <div className="py-6">
          
          {/* Post Grid View */}
          {activeTab === "posts" && (
            <div className="grid grid-cols-3 gap-2.5 md:gap-5">
              {posts.length === 0 ? (
                <div className="col-span-3 text-center py-12 text-slate-550 text-xs">No posts published.</div>
              ) : (
                posts.map((post) => (
                  <div key={post._id} className="relative aspect-square rounded-2xl border border-slate-900 bg-slate-900/30 overflow-hidden group cursor-pointer">
                    {/* Thumbnail render */}
                    {post.media && post.media.length > 0 ? (
                      post.media[0].endsWith(".mp4") ? (
                        <video src={post.media[0]} className="w-full h-full object-cover" />
                      ) : (
                        <img src={post.media[0]} alt="post grid" className="w-full h-full object-cover" />
                      )
                    ) : (
                      <div className="w-full h-full bg-slate-900/20 p-4 text-[10px] font-mono text-slate-400 overflow-hidden break-all flex flex-col justify-center leading-relaxed">
                        {post.content}
                      </div>
                    )}

                    {/* Hover Overlay statistics */}
                    <div className="absolute inset-0 bg-slate-950/80 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-6 text-white font-bold transition-all duration-200">
                      <div className="flex items-center gap-1.5 text-sm">
                        <Heart className="w-4 h-4 text-red-500 fill-red-500" />
                        <span>{post.likes?.length || 0}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-sm">
                        <MessageSquare className="w-4 h-4 text-cyan-400" />
                        <span>{post.comments?.length || 0}</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Creator Analytics Charts Tab */}
          {activeTab === "analytics" && isOwnProfile && (
            <div className="space-y-8">
              
              {/* Micro Interaction Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 bg-slate-900/30 border border-slate-900 rounded-2xl text-center space-y-1">
                  <span className="text-[10px] text-slate-550 font-bold uppercase tracking-wider">Follower Growth</span>
                  <h4 className="text-xl font-bold text-white tracking-wide">12,540</h4>
                  <p className="text-[9px] text-cyan-400 font-semibold flex items-center justify-center gap-1">
                    <TrendingUp className="w-3 h-3" />
                    +12.4% this week
                  </p>
                </div>
                <div className="p-4 bg-slate-900/30 border border-slate-900 rounded-2xl text-center space-y-1">
                  <span className="text-[10px] text-slate-550 font-bold uppercase tracking-wider">Direct Interactions</span>
                  <h4 className="text-xl font-bold text-white tracking-wide">
                    {posts.reduce((acc, p) => acc + (p.likes?.length || 0), 0)}
                  </h4>
                  <p className="text-[9px] text-cyan-400 font-semibold flex items-center justify-center gap-1">
                    <Sparkles className="w-3 h-3 text-cyan-400" />
                    Likes count
                  </p>
                </div>
                <div className="p-4 bg-slate-900/30 border border-slate-900 rounded-2xl text-center space-y-1">
                  <span className="text-[10px] text-slate-550 font-bold uppercase tracking-wider">Secure Chats log</span>
                  <h4 className="text-xl font-bold text-white tracking-wide">8.4%</h4>
                  <p className="text-[9px] text-purple-400 font-semibold">Average engagement</p>
                </div>
                <div className="p-4 bg-slate-900/30 border border-slate-900 rounded-2xl text-center space-y-1">
                  <span className="text-[10px] text-slate-550 font-bold uppercase tracking-wider">WebRTC Call logs</span>
                  <h4 className="text-xl font-bold text-white tracking-wide">{calls.length}</h4>
                  <p className="text-[9px] text-green-400 font-semibold">Connected calls</p>
                </div>
              </div>

              {/* Area Chart: Follower Growth */}
              <div className="bg-slate-900/30 border border-slate-900 rounded-2xl p-6 space-y-4">
                <div className="flex justify-between items-center">
                  <h4 className="text-sm font-bold text-slate-200 uppercase tracking-wider">Followers Trend</h4>
                  <span className="text-[10px] text-slate-500 font-semibold">PAST 7 DAYS</span>
                </div>
                <div className="w-full h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={growthData}>
                      <defs>
                        <linearGradient id="colorFollow" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.2}/>
                          <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="name" stroke="#475569" fontSize={10} />
                      <YAxis stroke="#475569" fontSize={10} domain={['dataMin - 500', 'dataMax + 500']} />
                      <Tooltip contentStyle={{ background: "#0f172a", borderColor: "#1e293b", borderRadius: "12px", fontSize: "11px" }} />
                      <Area type="monotone" dataKey="followers" stroke="#06b6d4" strokeWidth={2} fillOpacity={1} fill="url(#colorFollow)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Bar Chart: Weekly Interactions */}
              <div className="bg-slate-900/30 border border-slate-900 rounded-2xl p-6 space-y-4">
                <div className="flex justify-between items-center">
                  <h4 className="text-sm font-bold text-slate-200 uppercase tracking-wider">Engagement Details</h4>
                  <span className="text-[10px] text-slate-500 font-semibold">WEEKLY AUDIT</span>
                </div>
                <div className="w-full h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={interactionData}>
                      <XAxis dataKey="name" stroke="#475569" fontSize={10} />
                      <YAxis stroke="#475569" fontSize={10} />
                      <Tooltip contentStyle={{ background: "#0f172a", borderColor: "#1e293b", borderRadius: "12px", fontSize: "11px" }} />
                      <Legend wrapperStyle={{ fontSize: "10px" }} />
                      <Bar dataKey="likes" fill="#06b6d4" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="comments" fill="#a855f7" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

            </div>
          )}

        </div>

      </div>

      {/* Edit Profile Modal overlay */}
      <Modal isOpen={showEditModal} onClose={() => setShowEditModal(false)} title="Update Profile Details">
        <form onSubmit={handleSaveProfile} className="space-y-4 text-slate-100">
          
          {/* Cover attachment */}
          <div>
            <label className="block text-slate-400 text-xs font-semibold mb-1.5 uppercase">Cover Banner</label>
            <div 
              onClick={() => coverInputRef.current?.click()}
              className="w-full h-24 border border-dashed border-slate-800 bg-slate-950 flex items-center justify-center rounded-xl cursor-pointer hover:bg-slate-900/40 overflow-hidden"
            >
              {editCover ? (
                <img src={editCover} alt="cover upload" className="w-full h-full object-cover" />
              ) : (
                <span className="text-[10px] text-slate-500 font-bold uppercase">Click to change cover</span>
              )}
            </div>
            <input type="file" ref={coverInputRef} className="hidden" onChange={handleCoverUpload} />
          </div>

          {/* Avatar attachment */}
          <div>
            <label className="block text-slate-400 text-xs font-semibold mb-1.5 uppercase">Avatar Photo</label>
            <div className="flex items-center gap-3">
              <img src={editAvatar} alt="avatar" className="w-12 h-12 rounded-full border border-slate-850 object-cover" />
              <button 
                type="button" 
                onClick={() => avatarInputRef.current?.click()}
                className="px-3.5 py-1.5 border border-slate-800 hover:bg-slate-850 text-xs font-bold rounded-xl text-slate-350"
              >
                Upload Photo
              </button>
            </div>
            <input type="file" ref={avatarInputRef} className="hidden" onChange={handleAvatarUpload} />
          </div>

          <div>
            <label className="block text-slate-400 text-xs font-semibold mb-1.5 uppercase">Full Name</label>
            <input
              type="text"
              required
              className="w-full bg-slate-950 border border-slate-850 rounded-xl py-3 px-4 text-sm text-white focus:outline-none focus:border-cyan-500"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-slate-400 text-xs font-semibold mb-1.5 uppercase">Biography</label>
            <textarea
              rows="3"
              className="w-full bg-slate-950 border border-slate-850 rounded-xl py-3 px-4 text-sm text-white focus:outline-none focus:border-cyan-500"
              value={editBio}
              onChange={(e) => setEditBio(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-400 text-xs font-semibold mb-1.5 uppercase">Website</label>
              <input
                type="text"
                placeholder="website.com"
                className="w-full bg-slate-950 border border-slate-850 rounded-xl py-2.5 px-4 text-xs text-white focus:outline-none focus:border-cyan-500"
                value={editWebsite}
                onChange={(e) => setEditWebsite(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-slate-400 text-xs font-semibold mb-1.5 uppercase">Location</label>
              <input
                type="text"
                placeholder="San Francisco, CA"
                className="w-full bg-slate-950 border border-slate-850 rounded-xl py-2.5 px-4 text-xs text-white focus:outline-none focus:border-cyan-500"
                value={editLocation}
                onChange={(e) => setEditLocation(e.target.value)}
              />
            </div>
          </div>

          <div className="flex gap-3 pt-3">
            <Button variant="secondary" onClick={() => setShowEditModal(false)} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" variant="primary" className="flex-1">
              Save Changes
            </Button>
          </div>

        </form>
      </Modal>

      {/* Followers List Modal */}
      <Modal 
        isOpen={showFollowersModal} 
        onClose={() => setShowFollowersModal(false)}
        title="Followers"
      >
        <div className="max-h-[350px] overflow-y-auto space-y-4 pr-1">
          {profile?.followers?.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-6">No followers yet.</p>
          ) : (
            profile?.followers?.map(f => (
              <div key={f._id} className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <img src={f.avatar} className="w-9 h-9 rounded-full border border-slate-800 object-cover" />
                  <div>
                    <div className="text-xs font-bold text-slate-200 flex items-center gap-1">
                      @{f.username}
                      {f.isVerified && <ShieldCheck className="w-3.5 h-3.5 text-cyan-400 fill-cyan-400/10" />}
                    </div>
                    <div className="text-[10px] text-slate-500">{f.name || f.profession}</div>
                  </div>
                </div>
                <button 
                  onClick={() => {
                    setShowFollowersModal(false);
                    window.location.href = `/profile/${f.username}`;
                  }}
                  className="px-3 py-1 bg-slate-900 border border-slate-850 hover:bg-slate-850 text-slate-200 font-bold text-[10px] rounded-xl transition-colors"
                >
                  View Profile
                </button>
              </div>
            ))
          )}
        </div>
      </Modal>

      {/* Following List Modal */}
      <Modal 
        isOpen={showFollowingModal} 
        onClose={() => setShowFollowingModal(false)}
        title="Following"
      >
        <div className="max-h-[350px] overflow-y-auto space-y-4 pr-1">
          {profile?.following?.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-6">Not following anyone yet.</p>
          ) : (
            profile?.following?.map(f => (
              <div key={f._id} className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <img src={f.avatar} className="w-9 h-9 rounded-full border border-slate-800 object-cover" />
                  <div>
                    <div className="text-xs font-bold text-slate-200 flex items-center gap-1">
                      @{f.username}
                      {f.isVerified && <ShieldCheck className="w-3.5 h-3.5 text-cyan-400 fill-cyan-400/10" />}
                    </div>
                    <div className="text-[10px] text-slate-500">{f.name || f.profession}</div>
                  </div>
                </div>
                <button 
                  onClick={() => {
                    setShowFollowingModal(false);
                    window.location.href = `/profile/${f.username}`;
                  }}
                  className="px-3 py-1 bg-slate-900 border border-slate-850 hover:bg-slate-850 text-slate-200 font-bold text-[10px] rounded-xl transition-colors"
                >
                  View Profile
                </button>
              </div>
            ))
          )}
        </div>
      </Modal>

    </div>
  );
}

export default ProfilePage;
