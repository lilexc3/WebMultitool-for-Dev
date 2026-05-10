import { Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export const PrivateRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading)
    return <div style={{ color: "#fff", padding: "2rem" }}>Loading...</div>;
  return user ? children : <Navigate to="/log-in" />;
};
