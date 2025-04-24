import {
  User,
  LoginRequest,
  UserCreate,
  UserUpdate,
  Token,
} from "@/types/user";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import asyncStorage from "@/utils/asyncStorage";
import {
  login,
  registerUser,
  getCurrentUser,
  updateCurrentUser,
} from "@/service/authService";

interface AuthStore {
  user: User | null;
  token: string | null;
  loading: boolean;
  error: string | null;

  // Auth actions
  loginUser: (credentials: LoginRequest) => Promise<void>;
  registerNewUser: (userData: UserCreate) => Promise<void>;
  updateUser: (userData: UserUpdate) => Promise<void>;
  refreshSession: () => Promise<void>;
  logout: () => void;

  // State setters
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
}

export const authStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      loading: false,
      error: null,

      // Auth actions
      loginUser: async (credentials: LoginRequest) => {
        try {
          set({ loading: true, error: null });
          const tokenData: Token = await login(credentials);
          set({ token: tokenData.access_token });

          // Get user profile after successful login
          const user = await getCurrentUser();
          set({ user, loading: false });
        } catch (error: any) {
          console.error("Login error:", error);
          set({
            loading: false,
            error:
              error.response?.data?.detail ||
              "Failed to login. Please check your credentials.",
          });
          throw error;
        }
      },

      registerNewUser: async (userData: UserCreate) => {
        try {
          set({ loading: true, error: null });
          const user = await registerUser(userData);

          // Auto-login after registration
          const tokenData = await login({
            email: userData.email,
            password: userData.password,
          });

          set({
            user,
            token: tokenData.access_token,
            loading: false,
          });
        } catch (error: any) {
          console.error("Registration error:", error);
          set({
            loading: false,
            error:
              error.response?.data?.detail ||
              "Failed to register. Email may already be in use.",
          });
          throw error;
        }
      },

      updateUser: async (userData: UserUpdate) => {
        try {
          set({ loading: true, error: null });
          const updatedUser = await updateCurrentUser(userData);
          set({ user: updatedUser, loading: false });
        } catch (error: any) {
          console.error("Update user error:", error);
          set({
            loading: false,
            error: error.response?.data?.detail || "Failed to update profile.",
          });
          throw error;
        }
      },

      refreshSession: async () => {
        const token = get().token;
        if (token) {
          try {
            set({ loading: true });
            const user = await getCurrentUser();
            set({ user, loading: false });
          } catch (error) {
            console.error("Session refresh error:", error);
            // Token might be invalid, clear the session
            set({ user: null, token: null, loading: false });
          }
        } else {
          set({ loading: false });
        }
      },

      logout: () => {
        set({ user: null, token: null });
      },

      // State setters
      setUser: (user) => set({ user }),
      setToken: (token) => set({ token }),
      setLoading: (loading) => set({ loading }),
      setError: (error) => set({ error }),
      clearError: () => set({ error: null }),
    }),
    {
      name: "auth-storage",
      storage: asyncStorage,
    }
  )
);
