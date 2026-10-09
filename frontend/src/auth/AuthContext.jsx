import { createContext, useContext, useState } from "react";

const AUTH_KEY = "agrovision_auth";
const USER_KEY = "agrovision_user";

const AuthContext = createContext(null);

async function hashPassword(password) {
  const bytes = new TextEncoder().encode(password);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function readUser() {
  try {
    return JSON.parse(localStorage.getItem(USER_KEY) || "null");
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() =>
    localStorage.getItem(AUTH_KEY) === "true" ? readUser() : null
  );

  const login = async (email, password, remember = false) => {
    const savedUser = readUser();
    const passwordHash = await hashPassword(password);

    if (
      !savedUser ||
      savedUser.email.toLowerCase() !== email.trim().toLowerCase() ||
      savedUser.passwordHash !== passwordHash
    ) {
      throw new Error("The email or password is incorrect.");
    }

    localStorage.setItem(AUTH_KEY, "true");
    localStorage.setItem("agrovision_remember", String(remember));
    setUser(savedUser);
  };

  const register = async ({ name, email, password }) => {
    const passwordHash = await hashPassword(password);
    const nextUser = {
      name: name.trim(),
      email: email.trim().toLowerCase(),
      passwordHash,
    };

    localStorage.setItem(USER_KEY, JSON.stringify(nextUser));
    localStorage.setItem(AUTH_KEY, "true");
    setUser(nextUser);
  };

  const logout = () => {
    localStorage.removeItem(AUTH_KEY);
    localStorage.removeItem("agrovision_remember");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: Boolean(user), login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
