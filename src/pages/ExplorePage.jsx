import { useState, useEffect } from "react";
import { fetchExplorePosts, fetchSuggestedUsers, followUser } from "../services/api";
import Post from "../components/Post";
import { TrendingUp, UserPlus, Hash, Flame } from "lucide-react";
import { motion } from "framer-motion";

function ExplorePage() {
  const [posts, setPosts] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([fetchExplorePosts(), fetchSuggestedUsers()])
      .then(([postsData, suggestionsData]) => {
        setPosts(postsData);
        setSuggestions(suggestionsData);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  const handleFollow = async (id) => {
    try {
      await followUser(id);
      setSuggestions(suggestions.filter(user => user._id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  const trendingTags = [
    { name: "cryptography", posts: "124k" },
    { name: "react19", posts: "85k" },
    { name: "ciphernet", posts: "42k" },
    { name: "webRTC", posts: "29k" },
    { name: "glassmorphism", posts: "18k" }
  ];

  return (
    <div className="bg-slate-950 min-h-screen text-slate-100 p-4 md:p-8">
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Explore Feed */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
            <Flame className="w-6 h-6 text-orange-500 animate-pulse" />
            <h2 className="text-2xl font-bold tracking-tight">Explore Trending</h2>
          </div>

          {loading ? (
            <div className="flex flex-col gap-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="w-full h-80 bg-slate-900/40 rounded-2xl animate-pulse border border-slate-800/60" />
              ))}
            </div>
          ) : posts.length === 0 ? (
            <div className="text-center py-12 bg-slate-900/20 border border-slate-900 rounded-2xl text-slate-500 text-sm">
              No trending posts available. Check back later!
            </div>
          ) : (
            posts.map(post => (
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

        {/* Explore Sidebar (Trends + Suggested Users) */}
        <div className="space-y-8">
          {/* Trending Tags */}
          <div className="bg-slate-900/30 border border-slate-950 backdrop-blur-md rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-5 h-5 text-cyan-400" />
              <h3 className="font-bold text-sm tracking-wide uppercase text-slate-400">Trending Topics</h3>
            </div>
            <div className="space-y-4">
              {trendingTags.map((tag, i) => (
                <div key={i} className="flex justify-between items-center group cursor-pointer">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 group-hover:text-cyan-400 group-hover:border-cyan-500/30 transition-all">
                      <Hash className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-slate-200 group-hover:text-cyan-400 transition-colors">#{tag.name}</div>
                      <div className="text-xs text-slate-500">{tag.posts} posts</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Suggested Users */}
          <div className="bg-slate-900/30 border border-slate-950 backdrop-blur-md rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <UserPlus className="w-5 h-5 text-purple-400" />
              <h3 className="font-bold text-sm tracking-wide uppercase text-slate-400">People to Follow</h3>
            </div>
            <div className="space-y-4">
              {suggestions.length === 0 ? (
                <div className="text-xs text-slate-500">No suggestions available right now.</div>
              ) : (
                suggestions.map(s => (
                  <div key={s._id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <img src={s.avatar} alt={s.username} className="w-10 h-10 rounded-full border border-slate-800 object-cover" />
                      <div>
                        <div className="text-sm font-semibold text-slate-200 truncate max-w-[120px]">{s.username}</div>
                        <div className="text-xs text-slate-500 truncate max-w-[120px]">{s.name}</div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleFollow(s._id)}
                      className="px-3 py-1 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs rounded-full transition-colors"
                    >
                      Follow
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

export default ExplorePage;
