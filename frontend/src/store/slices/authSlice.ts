import axios from 'axios';
import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import api from '../../services/api';
import type { AuthState, User } from '../../types';

// ══════════════════════════════════════════════════════════════════════
// Types
// ══════════════════════════════════════════════════════════════════════

interface LoginCredentials {
  email: string;
  password: string;
}

interface RegisterData {
  name: string;
  email: string;
  password: string;
  password_confirmation: string;
}

// ══════════════════════════════════════════════════════════════════════
// Safe localStorage helpers
// ══════════════════════════════════════════════════════════════════════

// ── This is the root cause of "undefined" is not valid JSON ───────────
// localStorage.getItem returns null if missing, but may also contain
// the literal string "undefined" if something previously stored it wrong.
// A truthy check alone ("storedUser ? JSON.parse(storedUser) : null")
// treats "undefined" as truthy → JSON.parse("undefined") → crash.
// ──────────────────────────────────────────────────────────────────────
const safeParseUser = (): User | null => {
  const raw = localStorage.getItem('auth_user');
  if (!raw || raw === 'undefined' || raw === 'null') return null;
  try {
    return JSON.parse(raw) as User;
  } catch {
    localStorage.removeItem('auth_user'); // clean up corrupt value
    return null;
  }
};

const safeGetToken = (): string | null => {
  const token = localStorage.getItem('auth_token');
  if (!token || token === 'undefined') return null;
  return token;
};

// ══════════════════════════════════════════════════════════════════════
// Initial state
// ══════════════════════════════════════════════════════════════════════

const storedToken = safeGetToken();
const storedUser  = safeParseUser();

const initialState: AuthState = {
  user:            storedUser,
  token:           storedToken,
  isAuthenticated: !!storedToken,
  loading:         false,
  error:           null,
};

// ══════════════════════════════════════════════════════════════════════
// Thunks
// ══════════════════════════════════════════════════════════════════════

export const login = createAsyncThunk(
  'auth/login',
  async (credentials: LoginCredentials, { rejectWithValue }) => {
    try {
      const response = await api.post('/login', credentials);
      return response.data;
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        return rejectWithValue(error.response?.data?.message || 'Login failed');
      }
      return rejectWithValue('Login failed');
    }
  }
);

export const register = createAsyncThunk(
  'auth/register',
  async (data: RegisterData, { rejectWithValue }) => {
    try {
      const response = await api.post('/register', data);
      return response.data;
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        return rejectWithValue(error.response?.data?.message || 'Registration failed');
      }
      return rejectWithValue('Registration failed');
    }
  }
);

export const logout = createAsyncThunk('auth/logout', async () => {
  try {
    await api.post('/logout');
  } catch {
    // ignore errors on logout
  } finally {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
  }
});

export const fetchCurrentUser = createAsyncThunk(
  'auth/fetchCurrentUser',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get('/user');
      return response.data;
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        return rejectWithValue(error.response?.data?.message || 'Failed to fetch user');
      }
      return rejectWithValue('Failed to fetch user');
    }
  }
);

// ══════════════════════════════════════════════════════════════════════
// Slice
// ══════════════════════════════════════════════════════════════════════

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setUser: (state, action: PayloadAction<User>) => {
      state.user = action.payload;
      localStorage.setItem('auth_user', JSON.stringify(action.payload));
    },
  },
  extraReducers: (builder) => {
    builder
      // ── login ───────────────────────────────────────────────────────
      .addCase(login.pending, (state) => {
        state.loading = true;
        state.error   = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.loading        = false;
        state.token          = action.payload.token;
        state.user           = action.payload.user;
        state.isAuthenticated = true;
        localStorage.setItem('auth_token', action.payload.token);
        localStorage.setItem('auth_user', JSON.stringify(action.payload.user));
      })
      .addCase(login.rejected, (state, action) => {
        state.loading = false;
        state.error   = action.payload as string;
      })

      // ── register ────────────────────────────────────────────────────
      .addCase(register.pending, (state) => {
        state.loading = true;
        state.error   = null;
      })
      .addCase(register.fulfilled, (state, action) => {
        state.loading        = false;
        state.token          = action.payload.token;
        state.user           = action.payload.user;
        state.isAuthenticated = true;
        localStorage.setItem('auth_token', action.payload.token);
        localStorage.setItem('auth_user', JSON.stringify(action.payload.user));
      })
      .addCase(register.rejected, (state, action) => {
        state.loading = false;
        state.error   = action.payload as string;
      })

      // ── logout ──────────────────────────────────────────────────────
      .addCase(logout.fulfilled, (state) => {
        state.user           = null;
        state.token          = null;
        state.isAuthenticated = false;
      })

      // ── fetchCurrentUser ────────────────────────────────────────────
      .addCase(fetchCurrentUser.fulfilled, (state, action) => {
        state.user = action.payload;
        localStorage.setItem('auth_user', JSON.stringify(action.payload));
      });
  },
});

export const { clearError, setUser } = authSlice.actions;
export default authSlice.reducer;