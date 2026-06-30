import { useEffect, useState } from "react";
import Post from "../components/Post";
import Modal from "../components/common/Modal";
import CreatePostForm from "../components/CreatePostForm";
import StoryBar from "../components/StoryBar";
import { fetchSuggestedUsers, followUser } from "../services/api";
import { useAuthStore } from "../store/useAuthStore";
import { useFeedStore } from "../store/useFeedStore";
import { PenTool, Compass, Shield, UserCheck, Activity } from "lucide-react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";

function Dashboard() {
  const { user } = useAuthStore();
  const { posts, loading, fetchFeed, addPost } = useFeedStore();
  const [suggestions, setSuggestions] = useState([]);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    loadFeed();
  }, []);

  const loadFeed = async () => {
    try {
      // Parallelize suggested users loading and main feed fetch
      const [suggestionsData] = await Promise.all([
        fetchSuggestedUsers(),
        fetchFeed()
      ]);
      setSuggestions(suggestionsData);
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddPost = (newPost) => {
    addPost(newPost);
    setShowModal(false);
  };

  const handleFollowSuggestion = async (id) => {
    try {
      await followUser(id);
      setSuggestions(suggestions.filter(s => s._id !== id));
      fetchFeed(); // Refresh feed to fetch new follower posts
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="bg-slate-950 min-h-screen text-slate-100 p-4 md:p-8 flex justify-center border-l border-slate-905">
      <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Main Feed Column */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Stories row */}
          <StoryBar />

          {/* Create Post Card trigger */}
          {user && (
            <motion.div 
              whileHover={{ y: -1 }}
              onClick={() => setShowModal(true)}
              className="p-4 rounded-2xl bg-slate-900/30 border border-slate-900 hover:border-cyan-500/20 backdrop-blur-md cursor-pointer flex items-center justify-between group"
            >
              <div className="flex items-center gap-3">
                <img src={user.avatar} alt="avatar" className="w-9 h-9 rounded-full object-cover border border-slate-800" />
                <span className="text-xs text-slate-500 font-semibold group-hover:text-slate-400 transition-colors">
                  What's on your mind, @{user.username}?
                </span>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-[10px] text-cyan-400 font-bold uppercase tracking-wider group-hover:bg-cyan-500 group-hover:text-slate-950 transition-all">
                <PenTool className="w-3.5 h-3.5" />
                Create Post
              </div>
            </motion.div>
          )}

          {/* Modal post form */}
          <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Compose Secure Post">
            <CreatePostForm onAddPost={handleAddPost} />
          </Modal>

          {/* Posts Feed */}
          <div className="space-y-4">
            {loading ? (
              <div className="flex flex-col gap-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-72 w-full bg-slate-900/40 rounded-2xl animate-pulse border border-slate-850" />
                ))}
              </div>
            ) : posts.length === 0 ? (
              <div className="text-center py-12 bg-slate-900/10 border border-slate-900 rounded-2xl text-slate-500 text-sm flex flex-col items-center justify-center gap-2">
                <Compass className="w-8 h-8 text-slate-750 animate-spin" />
                <span>Your feed is secure, but empty. Follow other users or create a post!</span>
              </div>
            ) : (
              posts.map((post) => (
                <Post
                  key={post._id}
                  id={post._id}
                  username={post.user?.username || "anonymous"}
                  avatar={post.user?.avatar}
                  content={post.content}
                  media={post.media}
                  likes={post.likes}
                  comments={post.comments}
                  timestamp={post.createdAt}
                  poll={post.poll}
                />
              ))
            )}
          </div>
        </div>

        {/* Right Sidebar Suggestions Column */}
        <div className="hidden lg:block space-y-6">
          
          {/* User Card status */}
          {user && (
            <div className="flex items-center justify-between p-4 bg-slate-900/20 border border-slate-900 rounded-2xl backdrop-blur-md">
              <Link to="/profile" className="flex items-center gap-3 group/profile-card cursor-pointer">
                <img src={user.avatar} className="w-12 h-12 rounded-full border border-slate-800 object-cover transition-transform group-hover/profile-card:scale-105" />
                <div>
                  <div className="font-bold text-sm text-slate-200 group-hover/profile-card:text-cyan-400 transition-colors">@{user.username}</div>
                  <div className="text-xs text-slate-500 truncate max-w-[120px]">{user.name}</div>
                </div>
              </Link>
              <div className="flex items-center gap-1 text-[9px] text-green-400 font-bold bg-green-950/20 px-2 py-0.5 rounded border border-green-900/30">
                <Activity className="w-3 h-3 animate-pulse" />
                ONLINE
              </div>
            </div>
          )}

          {/* Suggestions List */}
          <div className="bg-slate-900/30 border border-slate-900 rounded-2xl p-5 backdrop-blur-md space-y-4">
            <h3 className="text-xs font-bold text-slate-450 uppercase tracking-wider">Suggested for you</h3>
            
            <div className="space-y-3.5">
              {suggestions.length === 0 ? (
                <p className="text-xs text-slate-550">No new recommendations available.</p>
              ) : (
                suggestions.map((s) => (
                  <div key={s._id} className="flex items-center justify-between gap-2">
                    <Link to={`/profile/${s.username}`} className="flex items-center gap-3 min-w-0 group/suggest cursor-pointer">
                      <img src={s.avatar} className="w-8 h-8 rounded-full border border-slate-800 object-cover transition-transform group-hover/suggest:scale-105" />
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-slate-200 group-hover/suggest:text-cyan-400 transition-colors truncate">@{s.username}</div>
                        <div className="text-[10px] text-slate-550 truncate">{s.name}</div>
                      </div>
                    </Link>
                    <button 
                      onClick={() => handleFollowSuggestion(s._id)}
                      className="px-3 py-1 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-[10px] rounded-full transition-colors flex-shrink-0"
                    >
                      Follow
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Security metrics dashboard card */}
          <div className="bg-slate-900/20 border border-slate-900 rounded-2xl p-5 backdrop-blur-md space-y-2.5">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-cyan-400" />
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Cryptography Logs</h4>
            </div>
            <p className="text-[10px] text-slate-500 leading-relaxed">
              Diffie-Hellman (ECDH P-256) key agreements derive AES-256 symmetric session keys automatically upon opening messages. Check settings to view secure hardware-backed keys.
            </p>
          </div>

        </div>

      </div>
    </div>
  );
}

export default Dashboard;
