import { create } from "zustand";
import { fetchPosts, toggleLike, addComment } from "../services/api";
import { getSocket } from "../hooks/useSocket";

export const useFeedStore = create((set, get) => ({
  posts: [],
  loading: false,
  error: null,

  setPosts: (posts) => set({ posts }),
  
  addPost: (post) => set((state) => ({ posts: [post, ...state.posts] })),

  // Socket real-time update handlers
  likePostFromSocket: (postId, userId, isLiked) => set((state) => {
    const updated = state.posts.map(p => {
      if (p._id === postId) {
        let nextLikes = [...p.likes];
        if (isLiked) {
          if (!nextLikes.includes(userId)) nextLikes.push(userId);
        } else {
          nextLikes = nextLikes.filter(id => id !== userId);
        }
        return { ...p, likes: nextLikes };
      }
      return p;
    });
    return { posts: updated };
  }),

  commentPostFromSocket: (postId, comment) => set((state) => {
    const updated = state.posts.map(p => {
      if (p._id === postId) {
        // Prevent duplicate comment displays from sockets
        if (p.comments.some(c => c._id === comment._id)) return p;
        return { ...p, comments: [...p.comments, comment] };
      }
      return p;
    });
    return { posts: updated };
  }),

  // Fetch feed from MongoDB
  fetchFeed: async () => {
    set({ loading: true, error: null });
    try {
      const data = await fetchPosts();
      set({ posts: data, loading: false });
    } catch (err) {
      set({ error: err.message, loading: false });
    }
  },

  // Optimistic Like with automated Rollback on API failure
  toggleLikeOptimistic: async (postId, currentUserId) => {
    const originalPosts = get().posts;
    const post = originalPosts.find(p => p._id === postId);
    if (!post) return;

    const wasLiked = post.likes.includes(currentUserId);
    const nextLikes = wasLiked 
      ? post.likes.filter(id => id !== currentUserId) 
      : [...post.likes, currentUserId];

    // 1. Optimistic Update (Immediate UI state update)
    set({
      posts: originalPosts.map(p => p._id === postId ? { ...p, likes: nextLikes } : p)
    });

    try {
      // 2. Perform API call to MongoDB
      const res = await toggleLike(postId);

      // 3. Dispatch Socket.IO update on success
      const socket = getSocket();
      if (socket) {
        socket.emit("post-like", {
          postId,
          userId: currentUserId,
          isLiked: !wasLiked,
          likesCount: res.likesCount
        });
      }
    } catch (err) {
      // 4. Rollback state if server is offline or fails
      console.warn("E2EE Log: toggleLike API failed. Rolling back optimistic state.");
      set({ posts: originalPosts });
      alert("Encryption Vault sync failed. Reverting optimistic UI state.");
    }
  },

  // Optimistic Comment addition with Rollback
  addCommentOptimistic: async (postId, content, currentUserProfile) => {
    const originalPosts = get().posts;
    const post = originalPosts.find(p => p._id === postId);
    if (!post) return;

    const tempCommentId = `temp-${Date.now()}`;
    const tempComment = {
      _id: tempCommentId,
      user: {
        _id: currentUserProfile._id,
        username: currentUserProfile.username,
        avatar: currentUserProfile.avatar
      },
      content,
      likes: [],
      replies: [],
      createdAt: new Date().toISOString()
    };

    // 1. Optimistic Update
    set({
      posts: originalPosts.map(p => p._id === postId ? { ...p, comments: [...p.comments, tempComment] } : p)
    });

    try {
      const savedComment = await addComment(postId, content);
      
      // 2. Swap temporary comment with saved DB comment
      set((state) => ({
        posts: state.posts.map(p => {
          if (p._id === postId) {
            return {
              ...p,
              comments: p.comments.map(c => c._id === tempCommentId ? savedComment : c)
            };
          }
          return p;
        })
      }));

      // 3. Emit socket notification
      const socket = getSocket();
      if (socket) {
        socket.emit("post-comment", {
          postId,
          comment: savedComment
        });
      }
    } catch (err) {
      // 4. Rollback
      console.warn("E2EE Log: addComment API failed. Rolling back.");
      set({ posts: originalPosts });
      alert("Secure comment sync failed. Reverting optimistic UI state.");
    }
  }
}));
