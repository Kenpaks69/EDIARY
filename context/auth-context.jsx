import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { AppState } from "react-native";
import { API_BASE_URL } from "../config";

const TOKEN_KEY = "@ediary/token";
const USER_KEY = "@ediary/user";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [hydrated, setHydrated] = useState(false);
  const [sessionUnlocked, setSessionUnlocked] = useState(false);
  const appState = useRef(AppState.currentState);
  const backgroundTime = useRef(null);

  useEffect(() => {
    let isMounted = true;

    const hydrate = async () => {
      try {
        const storedToken = await AsyncStorage.getItem(TOKEN_KEY);
        const storedUser = await AsyncStorage.getItem(USER_KEY);

        if (isMounted && storedToken && storedUser) {
          setToken(storedToken);
          const parsedUser = JSON.parse(storedUser);
          setUser(parsedUser);
          
          // Hydration logic for lock state
          // If we are restoring a session, we default to LOCKED if they have a PIN
          // unless we want to complicate storage with "last active time"
          // For security, default to locked on cold start
          // If no PIN, unlocked.
          if (!parsedUser.hasPin) {
            setSessionUnlocked(true);
          } else {
            setSessionUnlocked(false);
          }
        } else {
             // No user, unlocked (login screen)
             setSessionUnlocked(true);
        }
      } catch (error) {
        console.warn("Failed to hydrate auth context", error);
      } finally {
        if (isMounted) {
          setHydrated(true);
        }
      }
    };

    hydrate();

    return () => {
      isMounted = false;
    };
  }, []);

  // Handle auto-lock on background with grace period
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextAppState) => {
      console.log(`AuthContext AppState: ${appState.current} -> ${nextAppState}`);
      
      if (nextAppState === "background") {
        // Record when app went to background
        backgroundTime.current = Date.now();
      } else if (
        appState.current.match(/background/) &&
        nextAppState === "active" &&
        user?.hasPin
      ) {
        // Check how long app was in background
        const timeInBackground = Date.now() - (backgroundTime.current || 0);
        const GRACE_PERIOD = 10000; 
        
        if (timeInBackground > GRACE_PERIOD) {
          console.log("Auto-locking session from background");
          setSessionUnlocked(false);
        } else {
          console.log(`Skipping auto-lock (background time: ${timeInBackground}ms < ${GRACE_PERIOD}ms)`);
        }
      }
      appState.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, [user]);

  const signup = useCallback(async ({ email, password, username }) => {
    try {
      console.log("Attempting signup...");
      console.log("API URL:", `${API_BASE_URL}/auth/register`);
      
      const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email.trim(),
          password: password.trim(),
          username: username.trim(),
        }),
      });

      console.log("Response status:", response.status);
      
      const data = await response.json();
      console.log("Response data:", data);

      if (!response.ok) {
        throw new Error(data.message || "Failed to create account.");
      }

      console.log("Signup successful! User must now log in manually.");
      return data.user;
    } catch (error) {
      console.error("Signup error:", error);
      console.error("Error details:", error.message);
      throw error;
    }
  }, []);

  const login = useCallback(async ({ username, email, password }) => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: username?.trim(),
          password: password.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to log in.");
      }

      // Store token and user data
      await AsyncStorage.multiSet([
        [TOKEN_KEY, data.token],
        [USER_KEY, JSON.stringify(data.user)],
      ]);

      setToken(data.token);
      setUser(data.user);
      
      // Lock immediately if PIN is set
      if (data.user.hasPin) {
        setSessionUnlocked(false);
      } else {
        setSessionUnlocked(true);
      }
      
      return data.user;
    } catch (error) {
      console.error("Login error:", error);
      throw error;
    }
  }, []);

  const logout = useCallback(async () => {
    await AsyncStorage.multiRemove([TOKEN_KEY, USER_KEY]);
    setToken(null);
    setUser(null);
    setSessionUnlocked(true);
  }, []);

  const updateProfile = useCallback(
    async (updates) => {
      if (!user) {
        throw new Error("No active user to update.");
      }

      const activeToken = token || (await AsyncStorage.getItem(TOKEN_KEY));

      const response = await fetch(`${API_BASE_URL}/auth/update-profile`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${activeToken}`,
        },
        body: JSON.stringify(updates),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to update profile.");
      }

      await AsyncStorage.setItem(USER_KEY, JSON.stringify(data.user));
      setUser(data.user);

      return data.user;
    },
    [user, token]
  );

  const setPin = useCallback(async (pin) => {
    const activeToken = token || (await AsyncStorage.getItem(TOKEN_KEY));
    const response = await fetch(`${API_BASE_URL}/auth/set-pin`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${activeToken}`,
      },
      body: JSON.stringify({ pin }),
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.message || "Failed to set PIN");

    const updatedUser = { ...user, hasPin: true };
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(updatedUser));
    setUser(updatedUser);
    return data;
  }, [user, token]);

  const removePin = useCallback(async () => {
    const activeToken = token || (await AsyncStorage.getItem(TOKEN_KEY));
    const response = await fetch(`${API_BASE_URL}/auth/remove-pin`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${activeToken}`,
      },
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.message || "Failed to remove PIN");

    const updatedUser = { ...user, hasPin: false };
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(updatedUser));
    setUser(updatedUser);
    // Explicitly unlock since removing PIN means no lock needed
    setSessionUnlocked(true);
    return data;
  }, [user, token]);

  const getAuthToken = useCallback(async () => {
    return token || await AsyncStorage.getItem(TOKEN_KEY);
  }, [token]);

  const unlockSession = useCallback(() => {
    setSessionUnlocked(true);
  }, []);

  const value = useMemo(
    () => ({
      user,
      token,
      isAuthenticated: user != null,
      initializing: !hydrated,
      sessionUnlocked,
      signup,
      login,
      logout,
      updateProfile,
      getAuthToken,
      setPin,
      removePin,
      unlockSession,
    }),
    [user, token, hydrated, sessionUnlocked, signup, login, logout, updateProfile, getAuthToken, setPin, removePin, unlockSession]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context == null) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
