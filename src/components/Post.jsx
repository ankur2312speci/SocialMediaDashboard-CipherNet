import { useState } from "react";
import { replyToComment, voteInPoll, deletePost } from "../services/api";
import { useAuthStore } from "../store/useAuthStore";
import { useFeedStore } from "../store/useFeedStore";
import { 
  Heart, MessageSquare, Bookmark, Share2, ShieldCheck, MoreHorizontal, 
  Trash2, Eye, Award, CornerDownRight, Smile, Send
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";

function Post({ 
  id, 
  username, 
  avatar, 
  content, 
  media = [], 
  likes: initialLikes = [], 
  comments: initialComments = [], 
  timestamp, 
  poll: initialPoll 
}) {
  const { user, toggleBookmarkOptimistic } = useAuthStore();
  const { toggleLikeOptimistic, addCommentOptimistic } = useFeedStore();
  
  const likes = initialLikes;
  const comments = initialComments;
  const [poll, setPoll] = useState(initialPoll);
  
  const isLiked = user ? likes.includes(user._id) : false;
  const isBookmarked = user?.bookmarks?.includes(id) || false;
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [replyText, setReplyText] = useState("");
  const [activeReplyCommentId, setActiveReplyCommentId] = useState(null);
  
  // Double-tap heart animation trigger
  const [showHeartPop, setShowHeartPop] = useState(false);
  const [lastTap, setLastTap] = useState(0);

  // Dropdown menu
  const [showMenu, setShowMenu] = useState(false);
  const [isDeleted, setIsDeleted] = useState(false);

  const handleLikeToggle = () => {
    if (!user) return;
    toggleLikeOptimistic(id, user._id);
  };

  // Double tap handler
  const handleDoubleTap = () => {
    const now = Date.now();
    const DOUBLE_PRESS_DELAY = 300;
    if (now - lastTap < DOUBLE_PRESS_DELAY) {
      if (!isLiked && user) {
        toggleLikeOptimistic(id, user._id);
      }
      setShowHeartPop(true);
      setTimeout(() => setShowHeartPop(false), 800);
    }
    setLastTap(now);
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim() || !user) return;
    const content = commentText.trim();
    setCommentText("");
    await addCommentOptimistic(id, content, user);
  };

  const handleAddReply = async (commentId) => {
    if (!replyText.trim() || !user) return;
    try {
      await replyToComment(id, commentId, replyText);
      setReplyText("");
      setActiveReplyCommentId(null);
      // Reload feed to pull nested replies dynamically from MongoDB
      useFeedStore.getState().fetchFeed();
    } catch (err) {
      console.error(err);
    }
  };

  const handlePollVote = async (optionId) => {
    try {
      const updatedPost = await voteInPoll(id, optionId);
      setPoll(updatedPost.poll);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async () => {
    if (window.confirm("Are you sure you want to delete this post?")) {
      try {
        await deletePost(id);
        setIsDeleted(true);
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleShare = () => {
    navigator.clipboard.writeText(`${window.location.origin}/post/${id}`);
    alert("Post link copied to clipboard!");
  };

  if (isDeleted) return null;

  // Calculate poll percentages
  const getPollVotesDetails = () => {
    if (!poll || !poll.options) return { totalVotes: 0, optionsWithPercentages: [] };
    const totalVotes = poll.options.reduce((acc, opt) => acc + (opt.votes?.length || 0), 0);
    const optionsWithPercentages = poll.options.map(opt => {
      const count = opt.votes?.length || 0;
      const percent = totalVotes === 0 ? 0 : Math.round((count / totalVotes) * 100);
      const hasVoted = user ? opt.votes?.includes(user._id) : false;
      return { ...opt, count, percent, hasVoted };
    });
    return { totalVotes, optionsWithPercentages };
  };

  const { totalVotes, optionsWithPercentages } = getPollVotesDetails();

  const parseTime = (dateStr) => {
    try {
      const diff = Date.now() - new Date(dateStr).getTime();
      const mins = Math.floor(diff / 60000);
      if (mins < 1) return "Just now";
      if (mins < 60) return `${mins}m ago`;
      const hrs = Math.floor(mins / 60);
      if (hrs < 24) return `${hrs}h ago`;
      return new Date(dateStr).toLocaleDateString();
    } catch (e) {
      return dateStr || "some time ago";
    }
  };

  return (
    <motion.article 
      whileHover={{ y: -2 }}
      className="glass-card rounded-2xl border border-slate-900 shadow-xl overflow-hidden mb-6 relative group"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-900/60 bg-slate-900/10">
        <Link to={`/profile/${username}`} className="flex items-center gap-3 group/author cursor-pointer">
          <div className="w-10 h-10 rounded-full border border-slate-800 p-[1px] bg-gradient-to-tr from-cyan-550 to-purple-650 flex items-center justify-center transition-transform group-hover/author:scale-105">
            <img
              src={avatar || `https://ui-avatars.com/api/?name=${username}&background=random`}
              alt={username}
              className="w-full h-full rounded-full border border-slate-900 object-cover"
            />
          </div>
          <div>
            <div className="flex items-center gap-1 font-bold text-sm text-slate-200 group-hover/author:text-cyan-400 transition-colors">
              <span>@{username}</span>
              <ShieldCheck className="w-4 h-4 text-cyan-400 fill-cyan-400/10" />
            </div>
            <span className="text-[10px] text-slate-500">{parseTime(timestamp)}</span>
          </div>
        </Link>

        {/* Dropdown Menu actions */}
        <div className="relative">
          <button 
            onClick={() => setShowMenu(!showMenu)} 
            className="p-1.5 hover:bg-slate-900 rounded-lg text-slate-400 hover:text-white transition-colors"
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>
          
          <AnimatePresence>
            {showMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="absolute right-0 mt-1.5 w-44 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl p-1 z-20"
                >
                  <button
                    onClick={() => { handleShare(); setShowMenu(false); }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-350 hover:bg-slate-800 rounded-lg text-left"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    Share link
                  </button>
                  {user && username === user.username && (
                    <button
                      onClick={() => { handleDelete(); setShowMenu(false); }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-red-400 hover:bg-red-950/20 rounded-lg text-left"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Delete post
                    </button>
                  )}
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Main Image content / Double tap target */}
      <div 
        onDoubleClick={handleDoubleTap}
        className="w-full relative overflow-hidden select-none cursor-pointer"
      >
        {/* Double-tap heart pop overlay */}
        <AnimatePresence>
          {showHeartPop && (
            <motion.div
              initial={{ scale: 0.3, opacity: 0 }}
              animate={{ scale: [0.3, 1.2, 1], opacity: 1 }}
              exit={{ scale: 1.5, opacity: 0 }}
              transition={{ duration: 0.6 }}
              className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none"
            >
              <Heart className="w-24 h-24 text-red-500 fill-red-500 drop-shadow-[0_0_20px_rgba(239,68,68,0.5)]" />
            </motion.div>
          )}
        </AnimatePresence>

        {media && media.length > 0 ? (
          <div className="w-full relative aspect-video bg-slate-950 flex items-center justify-center">
            {/* Multiple media carousels or single media */}
            {media[0].endsWith(".mp4") ? (
              <video src={media[0]} controls className="w-full h-full object-cover" />
            ) : (
              <img src={media[0]} alt="post media" className="w-full h-full object-cover" />
            )}
          </div>
        ) : (
          /* Text-only clean gradient display */
          <div className="w-full min-h-[160px] bg-gradient-to-tr from-slate-950 to-slate-900 border-b border-slate-950 p-6 flex flex-col justify-center">
            <p className="text-slate-200 text-sm md:text-base leading-relaxed whitespace-pre-wrap">
              {content}
            </p>
          </div>
        )}
      </div>

      {/* Poll voting UI */}
      {poll && (
        <div className="p-4 border-b border-slate-900/60 space-y-2">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Award className="w-3.5 h-3.5 text-cyan-400" />
            <span>Active Board Poll</span>
          </div>
          <h4 className="text-sm font-bold text-slate-200 mb-3">{poll.question}</h4>
          
          <div className="space-y-2.5">
            {optionsWithPercentages.map((opt) => (
              <button
                key={opt._id}
                onClick={() => handlePollVote(opt._id)}
                className={`w-full text-left relative overflow-hidden rounded-xl border p-3 flex justify-between items-center text-xs font-semibold transition-all ${
                  opt.hasVoted 
                    ? "bg-cyan-950/20 border-cyan-550/40 text-cyan-400" 
                    : "bg-slate-900/40 border-slate-850 hover:bg-slate-900 text-slate-350"
                }`}
              >
                {/* Voting filling bar animation */}
                <div 
                  className="absolute left-0 top-0 bottom-0 bg-cyan-500/10 pointer-events-none transition-all duration-500"
                  style={{ width: `${opt.percent}%` }}
                />
                
                <span className="relative z-10">{opt.text}</span>
                <span className="relative z-10 text-[10px] text-slate-500 font-bold">{opt.percent}% ({opt.count})</span>
              </button>
            ))}
          </div>
          <p className="text-[9px] text-slate-500 font-bold mt-2 uppercase tracking-wide">{totalVotes} total votes</p>
        </div>
      )}

      {/* Action Buttons bar */}
      <div className="p-4 border-t border-slate-905 bg-slate-900/10 flex justify-between items-center">
        <div className="flex gap-4">
          <button 
            onClick={handleLikeToggle} 
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors font-bold group"
          >
            <Heart className={`w-5 h-5 transition-transform group-hover:scale-110 ${isLiked ? "text-red-500 fill-red-500" : ""}`} />
            <span>{likes.length}</span>
          </button>
          
          <button 
            onClick={() => setShowComments(!showComments)}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors font-bold"
          >
            <MessageSquare className="w-5 h-5" />
            <span>{comments.length}</span>
          </button>

          <button 
            onClick={handleShare}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors font-bold"
          >
            <Share2 className="w-5 h-5" />
          </button>
        </div>

        <button 
          onClick={() => toggleBookmarkOptimistic(id)}
          className="text-slate-400 hover:text-slate-250 transition-colors"
        >
          <Bookmark className={`w-5 h-5 ${isBookmarked ? "text-cyan-400 fill-cyan-400" : ""}`} />
        </button>
      </div>

      {/* Comments drawer */}
      <AnimatePresence>
        {showComments && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-slate-900 bg-slate-950/40 p-4 space-y-4"
          >
            {/* Comments List */}
            <div className="space-y-4 divide-y divide-slate-900/60 max-h-60 overflow-y-auto pr-1">
              {comments.length === 0 ? (
                <div className="text-center py-6 text-xs text-slate-600">Be the first to comment securely!</div>
              ) : (
                comments.map((comment) => (
                  <div key={comment._id} className="pt-3 first:pt-0 space-y-2">
                    <div className="flex gap-3 items-start justify-between">
                      <div className="flex gap-2">
                        <img 
                          src={comment.user?.avatar} 
                          alt="avatar" 
                          className="w-7 h-7 rounded-full border border-slate-800 object-cover mt-0.5" 
                        />
                        <div>
                          <div className="flex items-center gap-1">
                            <span className="text-xs font-bold text-slate-350">@{comment.user?.username}</span>
                            <span className="text-[9px] text-slate-600">{parseTime(comment.createdAt)}</span>
                          </div>
                          <p className="text-xs text-slate-250 mt-1 whitespace-pre-wrap">{comment.content}</p>
                        </div>
                      </div>
                      <button 
                        onClick={() => setActiveReplyCommentId(activeReplyCommentId === comment._id ? null : comment._id)}
                        className="text-[10px] text-cyan-400 font-bold hover:underline self-start mt-1.5"
                      >
                        Reply
                      </button>
                    </div>

                    {/* Replies */}
                    {comment.replies && comment.replies.map(reply => (
                      <div key={reply._id} className="pl-9 flex gap-2">
                        <CornerDownRight className="w-3.5 h-3.5 text-slate-650 flex-shrink-0 mt-1" />
                        <img 
                          src={reply.user?.avatar} 
                          alt="avatar" 
                          className="w-5 h-5 rounded-full object-cover mt-0.5" 
                        />
                        <div>
                          <div className="flex items-center gap-1">
                            <span className="text-[11px] font-bold text-slate-350">@{reply.user?.username}</span>
                            <span className="text-[8px] text-slate-600">{parseTime(reply.createdAt)}</span>
                          </div>
                          <p className="text-[11px] text-slate-400 mt-0.5">{reply.content}</p>
                        </div>
                      </div>
                    ))}

                    {/* Inline Reply input */}
                    {activeReplyCommentId === comment._id && (
                      <div className="pl-9 flex gap-2 pt-2">
                        <input
                          type="text"
                          required
                          placeholder="Reply to this thread..."
                          className="flex-1 bg-slate-900 border border-slate-850 rounded-xl py-1.5 px-3 text-xs text-white placeholder-slate-650"
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                        />
                        <button
                          onClick={() => handleAddReply(comment._id)}
                          className="px-3.5 bg-cyan-555/20 border border-cyan-550/40 text-cyan-400 font-bold rounded-xl text-[10px] uppercase tracking-wide"
                        >
                          Send
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Comment Post input */}
            <form onSubmit={handleAddComment} className="flex gap-2 border-t border-slate-900 pt-3">
              <input
                type="text"
                placeholder="Write a comment..."
                className="flex-1 bg-slate-950 border border-slate-850 rounded-xl py-2 px-3 text-xs text-white placeholder-slate-650"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
              />
              <button 
                type="submit" 
                className="p-2.5 bg-cyan-500 hover:bg-cyan-400 rounded-xl transition-all text-slate-950"
              >
                <Send className="w-4 h-4 fill-slate-950" />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

    </motion.article>
  );
}

export default Post;
