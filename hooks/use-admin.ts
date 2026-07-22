import { useAuth } from "@/contexts/AuthContext";
import { isAdminUser } from "@/lib/admin";
import { useCallback, useEffect, useState } from "react";

export function useAdmin() {
  const { user, loading: authLoading } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (authLoading) return;

    if (!user) {
      setIsAdmin(false);
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      setIsAdmin(await isAdminUser(user.id));
    } catch (caught) {
      setIsAdmin(false);
      setError(
        caught instanceof Error
          ? caught.message
          : "Unable to verify administrator access.",
      );
    } finally {
      setLoading(false);
    }
  }, [authLoading, user]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { isAdmin, loading: authLoading || loading, error, refresh };
}
