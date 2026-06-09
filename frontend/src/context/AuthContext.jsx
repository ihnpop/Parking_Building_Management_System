import { createContext, useContext, useEffect, useState } from 'react';
import supabase from '../config/supabaseClient';

const AuthContext = createContext({});

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Check active session on mount
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (session) {
                setUser(session.user);
                localStorage.setItem("token", session.access_token);
                localStorage.setItem("accessToken", session.access_token);
                localStorage.setItem("access_token", session.access_token);
            } else {
                setUser(null);
            }
            setLoading(false);
        });

        // Listen for auth state changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            console.log("Supabase Auth Event:", event);
            if (session) {
                setUser(session.user);
                localStorage.setItem("token", session.access_token);
                localStorage.setItem("accessToken", session.access_token);
                localStorage.setItem("access_token", session.access_token);
            } else {
                setUser(null);
                localStorage.removeItem("token");
                localStorage.removeItem("accessToken");
                localStorage.removeItem("access_token");
            }
            setLoading(false);
        });

        return () => {
            subscription.unsubscribe();
        };
    }, []);

    const loginWithGoogle = async () => {
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: window.location.origin + '/login/dashboard'
            }
        });
        if (error) throw error;
    };

    const logout = async () => {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
    };

    return (
        <AuthContext.Provider value={{ user, loading, loginWithGoogle, logout }}>
            {!loading && children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);
