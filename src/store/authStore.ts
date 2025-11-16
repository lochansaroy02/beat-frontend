import { api } from '@/utils/constatns';
import axios, { AxiosError } from 'axios';
import { create } from 'zustand';

// --- Interfaces ---


interface LoginPayload {
    role: string
    email: string;
    password: string;
}



interface AuthState {
    token: string | null;
    userData: any | null;
    isLoading: boolean;
    isLoggedIn: boolean;
    error: string | null;
    isInitialized: boolean;
}

interface AuthActions {
    login: (payload: LoginPayload) => Promise<boolean>;
    logout: () => void;
    // New action to safely initialize the state from localStorage
    initializeStore: () => void;
}

type AuthStore = AuthState & AuthActions;

// --- Helper function for localStorage Keys ---
export const AUTH_TOKEN_KEY = 'authToken';
export const USER_DATA_KEY = 'userData';


// --- Zustand Store Implementation ---
export const useAuthStore = create<AuthStore>((set, get) => ({

    token: null,
    userData: null,
    isLoading: false,
    isLoggedIn: false,
    error: null,
    isInitialized: false, // Default to false

    // New action to handle client-side hydration
    initializeStore: () => {
        // Only run on the client side (after component mounts) and only if not initialized yet
        if (typeof window !== 'undefined' && !get().isInitialized) {
            const token = localStorage.getItem(AUTH_TOKEN_KEY);
            const userDataString = localStorage.getItem(USER_DATA_KEY);
            let userData: any | null = null;

            if (userDataString) {
                try {
                    userData = JSON.parse(userDataString) as any;
                } catch (e) {
                    console.error("Error parsing user data from localStorage:", e);
                    // Clear broken data
                    localStorage.removeItem(USER_DATA_KEY);
                    localStorage.removeItem(AUTH_TOKEN_KEY);
                }
            }

            // Set state based on stored data or just mark as initialized
            if (token && userData) {
                set({
                    token,
                    userData,
                    isLoggedIn: true,
                    isInitialized: true,
                    isLoading: false,
                });
            } else {
                // If no data is found, still mark as initialized to proceed with rendering
                set({
                    isInitialized: true,
                    isLoading: false,
                });
            }
        }
    },


    login: async (payload: LoginPayload): Promise<boolean> => {
        set({ isLoading: true, error: null });
        try {
            let response;

            if (payload.role === "subadmin") {
                response = await axios.post(`${api}/subAdmin/login`, {
                    mobileNo: payload.email,
                    password: payload.password
                });
            } else {
                response = await axios.post(`${api}/admin/login`, {
                    email: payload.email,
                    password: payload.password
                });
            }

            const { token, tokenPayload } = response.data;

            // 1. Save details to localStorage (guarded)
            if (typeof window !== 'undefined') {
                localStorage.setItem(AUTH_TOKEN_KEY, token);
                localStorage.setItem(USER_DATA_KEY, JSON.stringify(tokenPayload));
            }

            // 2. Update Zustand state
            set({
                token: token,
                userData: tokenPayload,
                isLoading: false,
                isLoggedIn: true,
                isInitialized: true, // Also set to true on successful login
            });
            return true;

        } catch (err) {
            const axiosError = err as AxiosError<{ message?: string }>;
            const errorMessage = axiosError.response?.data?.message || 'Login failed due to an unexpected error.';

            set({
                token: null,
                userData: null,
                isLoading: false,
                isLoggedIn: false,
                error: errorMessage,
                isInitialized: true, // Ensure we mark as initialized even on error
            });

            if (typeof window !== 'undefined') {
                localStorage.removeItem(AUTH_TOKEN_KEY);
                localStorage.removeItem(USER_DATA_KEY);
            }
            return false;
        }
    },

    logout: () => {
        if (typeof window !== 'undefined') {
            localStorage.removeItem(AUTH_TOKEN_KEY);
            localStorage.removeItem(USER_DATA_KEY);
        }

        set({
            token: null,
            userData: null,
            error: null,
            isLoading: false,
            isLoggedIn: false,
            isInitialized: true,
        });
    },
}));
