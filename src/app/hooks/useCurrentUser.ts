import { useAuth } from "../components/providers/AuthProvider";

export const useCurrentUser = () => {
  const { user, loading } = useAuth();
  return {
    user,
    loading,
    isAuthenticated: !!user,
  };
};