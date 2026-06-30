import { useState, useEffect } from "react";
import { searchUsers } from "../services/api";
import { Search, User, ArrowRight, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";

function SearchPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const delayDebounceFn = setTimeout(async () => {
      setLoading(true);
      try {
        const users = await searchUsers(query);
        setResults(users);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }, 400); // 400ms debounce

    return () => clearTimeout(delayDebounceFn);
  }, [query]);

  return (
    <div className="bg-slate-950 min-h-screen text-slate-100 p-4 md:p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        
        <div className="border-b border-slate-800 pb-4">
          <h2 className="text-2xl font-bold tracking-tight">Search Accounts</h2>
          <p className="text-slate-400 text-sm mt-1">Search for other users and view their profile highlights.</p>
        </div>

        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-4 top-3.5 w-5 h-5 text-slate-500" />
          <input
            type="text"
            placeholder="Type a username or name (e.g. support, admin)..."
            className="w-full bg-slate-905/30 border border-slate-800 rounded-2xl py-3.5 pl-12 pr-4 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all backdrop-blur-md"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        {/* Results */}
        <div className="space-y-3">
          {loading ? (
            <div className="flex flex-col gap-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-16 w-full bg-slate-900/40 rounded-xl animate-pulse border border-slate-850" />
              ))}
            </div>
          ) : query.trim() && results.length === 0 ? (
            <div className="text-center py-12 bg-slate-900/10 border border-slate-900 rounded-2xl text-slate-500 text-sm">
              No accounts match "{query}"
            </div>
          ) : (
            results.map(user => (
              <Link
                key={user._id}
                to={`/profile/${user.username}`}
                className="flex items-center justify-between p-4 rounded-2xl bg-slate-900/30 border border-slate-900 hover:border-cyan-500/20 hover:bg-slate-900/50 transition-all group"
              >
                <div className="flex items-center gap-4">
                  <img
                    src={user.avatar || `https://ui-avatars.com/api/?name=${user.username}`}
                    alt={user.username}
                    className="w-12 h-12 rounded-full border border-slate-800 object-cover"
                  />
                  <div>
                    <div className="flex items-center gap-1.5 font-bold text-slate-200">
                      <span>{user.username}</span>
                      {user.isVerified && <ShieldCheck className="w-4 h-4 text-cyan-400 fill-cyan-400/10" />}
                    </div>
                    <div className="text-xs text-slate-500">{user.name}</div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 text-xs text-slate-400 group-hover:text-cyan-400 transition-colors">
                  <span>View Profile</span>
                  <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>
            ))
          )}
        </div>

      </div>
    </div>
  );
}

export default SearchPage;
