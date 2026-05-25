import { create } from 'zustand';

interface User {
  id: string;
  username: string;
  displayName: string;
  role: string;
  avatarUrl?: string;
}

interface AuthState {
  user: User | null;
  isLoggedIn: boolean;
  setUser: (user: User) => void;
  clearUser: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoggedIn: !!localStorage.getItem('accessToken'),
  setUser: (user) => set({ user, isLoggedIn: true }),
  clearUser: () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    set({ user: null, isLoggedIn: false });
  },
}));
