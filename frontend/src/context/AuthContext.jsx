import { createContext, useContext, useEffect, useState } from "react";
import { loginUser, registerUser, fetchMe } from "../api/client.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("cp_token");
    if (!token) {
      setInitializing(false);
      return;
    }
    fetchMe()
      .then(setUser)
      .catch(() => localStorage.removeItem("cp_token"))
      .finally(() => setInitializing(false));
  }, []);

  const login = async (email, password) => {
    const { token, user } = await loginUser(email, password);
    localStorage.setItem("cp_token", token);
    setUser(user);
  };

  const register = async (name, email, password, role, businessName) => {
    const { token, user } = await registerUser(name, email, password, role, businessName);
    localStorage.setItem("cp_token", token);
    setUser(user);
  };

  const logout = () => {
    localStorage.removeItem("cp_token");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, initializing, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
