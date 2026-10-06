import { Navigate, useLocation } from "react-router-dom";
import useAuth from "../auth/useAuth";

export default function RequireAuth({ children }) {
    const { user, status } = useAuth();
    const location = useLocation();

    if (status === "loading") return null;
    if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
    return children;
}
