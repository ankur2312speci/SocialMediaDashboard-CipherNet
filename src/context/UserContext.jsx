import { useAuthStore } from "../store/useAuthStore";

export function UserProvider({ children }) {
  // Pass through since Zustand handles global state
  return children;
}

export function useUser() {
  const user = useAuthStore((state) => state.user);
  const loading = useAuthStore((state) => state.loading);
  return { user, loading };
}
