import axios from "axios";
import supabase from "../config/supabaseClient";

/**
 * Centralized HTTP Client for all API calls across the frontend.
 * Manages baseURL, request interceptors for auth tokens (Supabase & localStorage fallback),
 * and standardizes API communication.
 */
const apiClient = axios.create({
    baseURL: import.meta.env.VITE_API_URL,
});

// Automatic token attachment interceptor
apiClient.interceptors.request.use(async (config) => {
    try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) {
            config.headers.Authorization = `Bearer ${session.access_token}`;
            return config;
        }
    } catch (err) {
        console.warn('[apiClient] Session retrieval token warning:', err.message);
    }

    const token = localStorage.getItem("token") || localStorage.getItem("accessToken") || localStorage.getItem("access_token");
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

export default apiClient;
