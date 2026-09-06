import { createContext, useContext, useEffect, useState } from "react";
import api from "../client";
import { decodeJwtPayload, isTokenExpired } from "../utils/jwt";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (token && !isTokenExpired(token)) {
      const payload = decodeJwtPayload(token);
      setUser(payload ? { username: payload.sub } : null);
    } else {
      localStorage.removeItem("access_token");
    }
    setLoading(false);
  }, []);

  async function login(username, password) {
    const form = new URLSearchParams();
    form.append("username", username);
    form.append("password", password);

    const { data } = await api.post("/auth/login", form, {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });

    localStorage.setItem("access_token", data.access_token);
    setUser({ username });
    return data;
  }

  async function register(username, email, password) {
    await api.post("/auth/register", { username, email, password });
    // Backend register doesn't log the user in automatically - do it ourselves
    await login(username, password);
  }

  function logout() {
    localStorage.removeItem("access_token");
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
