import { useAuthStore } from "../store/useAuthStore";

const BASE_URL = typeof window !== "undefined" && window.location.hostname !== "localhost"
  ? "https://ciphernet-api.onrender.com/api"
  : "http://localhost:5000/api";

// Helper for authorized headers
function getHeaders() {
  const token = useAuthStore.getState().token || sessionStorage.getItem("accessToken");
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

// Custom request wrapper
async function request(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const config = {
    ...options,
    headers: {
      ...getHeaders(),
      ...options.headers,
    },
  };

  try {
    const response = await fetch(url, config);
    
    // Check if token expired and refresh
    if (response.status === 403 || response.status === 401) {
      const refreshedUser = await useAuthStore.getState().refreshAccessToken();
      if (refreshedUser) {
        // Retry once with new token
        config.headers = { ...getHeaders(), ...options.headers };
        const retryResponse = await fetch(url, config);
        return await handleResponse(retryResponse);
      }
    }

    return await handleResponse(response);
  } catch (error) {
    console.error(`API Error in ${endpoint}:`, error.message);
    throw error;
  }
}

async function handleResponse(response) {
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || `Request failed with status ${response.status}`);
  }
  return data;
}

// ==========================================
// API Methods
// ==========================================

// Posts API
export async function fetchPosts() {
  return request("/posts");
}

export async function fetchExplorePosts() {
  return request("/posts/explore");
}

export async function fetchUserPosts(username) {
  return request(`/posts/user/${username}`);
}

export async function createPost(postData) {
  return request("/posts", {
    method: "POST",
    body: JSON.stringify(postData),
  });
}

export async function toggleLike(postId) {
  return request(`/posts/${postId}/like`, { method: "POST" });
}

export async function addComment(postId, content) {
  return request(`/posts/${postId}/comment`, {
    method: "POST",
    body: JSON.stringify({ content }),
  });
}

export async function replyToComment(postId, commentId, content) {
  return request(`/posts/${postId}/comment/${commentId}/reply`, {
    method: "POST",
    body: JSON.stringify({ content }),
  });
}
export async function editComment(postId, commentId, content) {
  return request(`/posts/${postId}/comment/${commentId}`, {
    method: "PUT",
    body: JSON.stringify({ content }),
  });
}

export async function deleteComment(postId, commentId) {
  return request(`/posts/${postId}/comment/${commentId}`, {
    method: "DELETE",
  });
}

export async function voteInPoll(postId, optionId) {
  return request(`/posts/${postId}/vote`, {
    method: "POST",
    body: JSON.stringify({ optionId }),
  });
}

export async function deletePost(postId) {
  return request(`/posts/${postId}`, { method: "DELETE" });
}

// User Profile & Relationships
export async function searchUsers(query) {
  return request(`/users/search?query=${encodeURIComponent(query)}`);
}

export async function fetchSuggestedUsers() {
  return request("/users/suggested");
}

export async function fetchUserProfile(username) {
  return request(`/users/profile/${username}`);
}

export async function followUser(userId) {
  return request(`/users/follow/${userId}`, { method: "POST" });
}

export async function unfollowUser(userId) {
  return request(`/users/unfollow/${userId}`, { method: "POST" });
}

export async function uploadE2EEPublicKey(publicKeyJWKString) {
  return request("/users/public-key", {
    method: "POST",
    body: JSON.stringify({ publicKey: publicKeyJWKString }),
  });
}

export async function fetchE2EEPublicKey(userId) {
  return request(`/users/public-key/${userId}`);
}

// Stories API
export async function fetchStories() {
  return request("/stories");
}

export async function createStory(storyData) {
  return request("/stories", {
    method: "POST",
    body: JSON.stringify(storyData),
  });
}

// Notifications API
export async function fetchNotifications() {
  return request("/notifications");
}

export async function markAllNotificationsRead() {
  return request("/notifications/read", { method: "POST" });
}

export async function markNotificationRead(id) {
  return request(`/notifications/${id}/read`, { method: "POST" });
}

// Call History API
export async function fetchCallHistory() {
  return request("/calls/history");
}

export async function logCallRecord(callData) {
  return request("/calls/log", {
    method: "POST",
    body: JSON.stringify(callData),
  });
}

export async function fetchUserProfileById(userId) {
  return request(`/users/profile-by-id/${userId}`);
}

// Chat API (conversations retrieval)
export async function fetchConversations() {
  return request("/chat/conversations");
}

export async function fetchDirectMessages(contactId) {
  return request(`/chat/messages/${contactId}`);
}

export async function fetchGroupMessages(groupId) {
  return request(`/chat/group-messages/${groupId}`);
}

export async function createChatGroup(groupData) {
  return request("/chat/groups", {
    method: "POST",
    body: JSON.stringify(groupData),
  });
}

export async function toggleBookmark(postId) {
  return request(`/users/bookmark/${postId}`, { method: "POST" });
}

export async function fetchBookmarks() {
  return request("/users/bookmarks");
}

export async function loginWithGoogle(credential) {
  return request("/auth/google", {
    method: "POST",
    body: JSON.stringify({ credential }),
  });
}

export async function loginWithGitHub(code) {
  return request("/auth/github", {
    method: "POST",
    body: JSON.stringify({ code }),
  });
}
