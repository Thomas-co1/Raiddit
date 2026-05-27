import { authService as apiAuthService } from "@/services/api";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
    createContext,
    ReactNode,
    useContext,
    useEffect,
    useState,
} from "react";

const AUTH_TOKEN_KEY = "auth_token";
const AUTH_USER_ID_KEY = "auth_user_id";
let volatileToken: string | null = null;
let volatileUserId: string | null = null;

async function safeGetToken(): Promise<string | null> {
  try {
    const token = await AsyncStorage.getItem(AUTH_TOKEN_KEY);
    return token ?? volatileToken;
  } catch {
    return volatileToken;
  }
}

async function safeGetUserId(): Promise<string | null> {
  try {
    const userId = await AsyncStorage.getItem(AUTH_USER_ID_KEY);
    return userId ?? volatileUserId;
  } catch {
    return volatileUserId;
  }
}

async function safeSetToken(token: string): Promise<void> {
  volatileToken = token;
  try {
    await AsyncStorage.setItem(AUTH_TOKEN_KEY, token);
  } catch {
    // Ignore storage errors when native module is unavailable.
  }
}

async function safeSetUserId(userId: string): Promise<void> {
  volatileUserId = userId;
  try {
    await AsyncStorage.setItem(AUTH_USER_ID_KEY, userId);
  } catch {
    // Ignore storage errors when native module is unavailable.
  }
}

async function safeRemoveToken(): Promise<void> {
  volatileToken = null;
  try {
    await AsyncStorage.removeItem(AUTH_TOKEN_KEY);
  } catch {
    // Ignore storage errors when native module is unavailable.
  }
}

async function safeRemoveUserId(): Promise<void> {
  volatileUserId = null;
  try {
    await AsyncStorage.removeItem(AUTH_USER_ID_KEY);
  } catch {
    // Ignore storage errors when native module is unavailable.
  }
}

interface AuthContextType {
  isLoggedIn: boolean;
  loading: boolean;
  token: string | null;
  userId: string | null;
  login: (email: string, plainPassword: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  // Check if user is already logged in on app start
  useEffect(() => {
    async function checkToken() {
      try {
        const storedToken = await safeGetToken();
        const storedUserId = await safeGetUserId();
        if (storedToken) {
          setToken(storedToken);
          setIsLoggedIn(true);
          apiAuthService.setToken(storedToken);
          if (__DEV__) {
            console.log("[Auth] Token loaded from storage:", storedToken);
          }
        }
        if (storedUserId) {
          setUserId(storedUserId);
        }
      } catch {
        // Keep app usable even if persistence fails on this device/runtime.
      } finally {
        setLoading(false);
      }
    }

    checkToken();
  }, []);

  const login = async (email: string, plainPassword: string) => {
    try {
      setLoading(true);
      const response = await apiAuthService.login(email, plainPassword);
      const newToken = response.token ?? response.id_token;
      const newUserId =
        response.user?.id !== undefined && response.user?.id !== null
          ? String(response.user.id)
          : null;

      if (newToken) {
        setToken(newToken);
        setIsLoggedIn(true);
        await safeSetToken(newToken);
        apiAuthService.setToken(newToken);
        if (newUserId) {
          setUserId(newUserId);
          await safeSetUserId(newUserId);
        }
        if (__DEV__) {
          console.log("[Auth] Token received on login:", newToken);
        }
      } else {
        throw new Error("No token received");
      }
    } catch (error) {
      setIsLoggedIn(false);
      setToken(null);
      setUserId(null);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      setToken(null);
      setUserId(null);
      setIsLoggedIn(false);
      await safeRemoveToken();
      await safeRemoveUserId();
      apiAuthService.logout();
    } catch {
      // Ignore persistence errors during logout.
    }
  };

  return (
    <AuthContext.Provider value={{ isLoggedIn, loading, token, userId, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
