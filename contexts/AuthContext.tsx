import { supabase } from "@/lib/supabase";
import { Session, User } from "@supabase/supabase-js";

import React, {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (
    email: string,
    password: string,
  ) => Promise<{ error: string | null }>;
  signUp: (
    email: string,
    password: string,
    fullName?: string,
  ) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  deleteAccount: () => Promise<{ error: string | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth
      .getSession()
      .then(({ data: { session } }) => {
        setSession(session);
        setUser(session?.user ?? null);
              // console.log("[AuthContext] Session:", session);
              // console.log("[AuthContext] Access Token:", session?.access_token);
      })
      .catch(() => {
        setSession(null);
        setUser(null);
      })
      .finally(() => {
        setLoading(false);
      });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      // console.log("[AuthContext] Auth state changed. Session:", session);
      // console.log("[AuthContext] Access Token:", session?.access_token);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return { error: error.message };
      }

      return { error: null };
    } catch (error: any) {
      return { error: error.message || "An error occurred during sign in" };
    }
  };

  const signUp = async (email: string, password: string, fullName?: string) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
          emailRedirectTo: undefined,
        },
      });

      if (error) {
        return { error: error.message };
      }

      // If email confirmation is disabled in Supabase, user will be auto-logged in
      // The session will be automatically set by onAuthStateChange listener
      return { error: null };
    } catch (error: any) {
      return { error: error.message || "An error occurred during sign up" };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };



const deleteAccount = async (): Promise<{ error: string | null }> => {
  try {
    // 1️⃣ Ensure we have a valid session (refresh it)
    const { data: refreshData, error: refreshError } =
      await supabase.auth.refreshSession();

    if (refreshError || !refreshData.session?.access_token) {
      return { error: "Session expired. Please log in again." };
    }

    const token = refreshData.session.access_token;

    // 2️⃣ Call Edge Function
    const response = await fetch(
      "https://lrlbygqbtylnrfsbgdkp.supabase.co/functions/v1/delete-user",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`, // 🔥 critical
          "Content-Type": "application/json",
          apikey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "", // RN needs this
        },
        body: JSON.stringify({}),
      }
    );

    // 3️⃣ Parse response safely
    let data: any = {};
    try {
      data = await response.json();
    } catch {
      // ignore JSON parse failure
    }

    // 4️⃣ Handle error response
    if (!response.ok) {
      console.error("[deleteAccount] Edge Function error:", data);

      return {
        error:
          data?.error ||
          data?.message ||
          `Delete failed (status ${response.status})`,
      };
    }

    // 5️⃣ IMPORTANT: Clear session locally AFTER deletion
    await supabase.auth.signOut();

    return { error: null };
  } catch (err: any) {
    console.error("[deleteAccount] Exception:", err);

    return {
      error: err?.message || "Something went wrong",
    };
  }
};


  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        signIn,
        signUp,
        signOut,
        deleteAccount,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
