import { useEffect, useState } from "react";
import AuthContext from "./AuthContext";
import * as authService from "./authService";

export default function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    // "loading" until the stored session has been checked, so guards don't redirect too early
    const [status, setStatus] = useState("loading");

    useEffect(() => {
        let cancelled = false;
        authService
            .getSession()
            .then((session) => {
                if (!cancelled) setUser(session?.user ?? null);
            })
            .finally(() => {
                if (!cancelled) setStatus("ready");
            });
        return () => {
            cancelled = true;
        };
    }, []);

    const login = async (credentials) => {
        const { user } = await authService.login(credentials);
        setUser(user);
        return user;
    };

    const register = async (details) => {
        const { user } = await authService.register(details);
        setUser(user);
        return user;
    };

    const logout = async () => {
        await authService.logout();
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, status, login, register, logout }}>
            {children}
        </AuthContext.Provider>
    );
}
