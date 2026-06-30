import { create } from "zustand";

const API_URL = typeof window !== "undefined" && window.location.hostname !== "localhost"
  ? "https://socialmediadashboard-ciphernet.onrender.com/api"
  : "http://localhost:5000/api";

export const useAuthStore = create((set, get) => ({
  user: null,
  token: localStorage.getItem("accessToken") || null,
  refreshToken: localStorage.getItem("refreshToken") || null,
  isAuthenticated: !!localStorage.getItem("accessToken"),
  loading: false,
  error: null,

  setTokens: (accessToken, refreshToken, rememberMe = true) => {
    if (rememberMe) {
      localStorage.setItem("accessToken", accessToken);
      localStorage.setItem("refreshToken", refreshToken);
    } else {
      sessionStorage.setItem("accessToken", accessToken);
      sessionStorage.setItem("refreshToken", refreshToken);
    }
    set({ token: accessToken, refreshToken, isAuthenticated: true });
  },

  clearTokens: () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    sessionStorage.removeItem("accessToken");
    sessionStorage.removeItem("refreshToken");
    set({ user: null, token: null, refreshToken: null, isAuthenticated: false });
  },

  register: async (username, email, password, name) => {
    set({ loading: true, error: null });
    try {
      const response = await fetch(`${API_URL}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, email, password, name }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Registration failed");

      get().setTokens(data.accessToken, data.refreshToken, true);
      set({ user: data.user, loading: false });
      return data.user;
    } catch (err) {
      set({ error: err.message, loading: false });
      throw err;
    }
  },

  login: async (loginKey, password, rememberMe = true) => {
    set({ loading: true, error: null });
    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ loginKey, password }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Login failed");

      get().setTokens(data.accessToken, data.refreshToken, rememberMe);
      set({ user: data.user, loading: false });
      return data.user;
    } catch (err) {
      set({ error: err.message, loading: false });
      throw err;
    }
  },

  logout: () => {
    get().clearTokens();
  },

  checkAuth: async () => {
    let token = get().token || sessionStorage.getItem("accessToken");

    if (typeof window !== "undefined" && window.location.search) {
      const params = new URLSearchParams(window.location.search);
      const queryToken = params.get("token");
      const queryRefreshToken = params.get("refreshToken");
      if (queryToken && queryRefreshToken) {
        get().setTokens(queryToken, queryRefreshToken, true);
        token = queryToken;
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }

    if (!token) {
      set({ isAuthenticated: false, loading: false });
      return null;
    }

    set({ loading: true });
    try {
      const response = await fetch(`${API_URL}/users/profile/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.status === 403 || response.status === 401) {
        // Token expired, try refreshing
        return await get().refreshAccessToken();
      }

      const user = await response.json();
      if (!response.ok) throw new Error(user.error || "Profile load failed");

      set({ user, isAuthenticated: true, loading: false });
      return user;
    } catch (err) {
      get().clearTokens();
      set({ error: err.message, loading: false });
      return null;
    }
  },

  refreshAccessToken: async () => {
    const rToken = get().refreshToken || sessionStorage.getItem("refreshToken");
    if (!rToken) {
      get().clearTokens();
      return null;
    }

    try {
      const response = await fetch(`${API_URL}/auth/refresh-token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken: rToken }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error("Session expired");

      get().setTokens(data.accessToken, data.refreshToken);
      
      // Fetch user profile with new token
      const profileResponse = await fetch(`${API_URL}/users/profile/me`, {
        headers: { Authorization: `Bearer ${data.accessToken}` },
      });
      const user = await profileResponse.json();
      if (!profileResponse.ok) {
        throw new Error(user.error || "Profile load failed after token refresh");
      }
      set({ user, isAuthenticated: true, loading: false });
      return user;
    } catch (err) {
      get().clearTokens();
      set({ error: err.message, loading: false });
      return null;
    }
  },

  updateProfile: async (profileData) => {
    const token = get().token || sessionStorage.getItem("accessToken");
    if (!token) return;

    try {
      const response = await fetch(`${API_URL}/users/profile/edit`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(profileData),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);

      set({ user: data.user });
      return data.user;
    } catch (err) {
      set({ error: err.message });
      throw err;
    }
  },

  toggleBookmarkOptimistic: async (postId) => {
    const token = get().token || sessionStorage.getItem("accessToken");
    const originalUser = get().user;
    if (!token || !originalUser) return;

    const hasBookmarked = originalUser.bookmarks?.includes(postId);
    const nextBookmarks = hasBookmarked
      ? originalUser.bookmarks.filter(id => id !== postId)
      : [...(originalUser.bookmarks || []), postId];

    // 1. Optimistic Update
    set({
      user: { ...originalUser, bookmarks: nextBookmarks }
    });

    try {
      const response = await fetch(`${API_URL}/users/bookmark/${postId}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!response.ok) throw new Error("API error");
    } catch (err) {
      console.warn("Secure E2EE Log: Bookmark toggle failed. Rolling back.");
      set({ user: originalUser });
      alert("Failed to sync bookmarks with MongoDB. Reverting.");
    }
  },
}));
