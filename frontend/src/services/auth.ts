import axios, { AxiosInstance } from 'axios';
import { signInWithEmail, signOutUser } from './firebaseClient';
import { API_BASE_URL } from '@/lib/apiConfig';
import type {
  LoginCredentials,
  LoginResponse,
  FirebaseVerifyResponse,
  ProfileResponse,
  TokenValidationResponse,
  User
} from '@/types/auth';

class AuthService {
  private api: AxiosInstance;
  private baseURL = API_BASE_URL;

  constructor() {
    this.api = axios.create({
      baseURL: this.baseURL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Request interceptor to add auth token
    this.api.interceptors.request.use(
      (config) => {
        const token = this.getStoredToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor for error handling
    this.api.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          // Token expired or invalid
          this.clearStoredAuth();
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );
  }

  // Backend Authentication (PRIMARY LOGIN METHOD)
  async login(credentials: LoginCredentials): Promise<LoginResponse> {
    try {
      console.log('🔑 Starting backend login process with:', credentials.email);
      console.log('🌐 API Base URL:', this.baseURL);
      console.log('🔗 Full URL:', `${this.baseURL}/auth/login`);

      // Use backend authentication directly
      const response = await this.api.post<LoginResponse>('/auth/login', {
        email: credentials.email,
        password: credentials.password
      });

      const sessionToken = response.data.id_token || response.data.token;

      if (response.data.success && response.data.user && sessionToken) {
        // Store the token and user data
        this.storeAuth(sessionToken, response.data.user);

        console.log('💾 Auth data stored successfully');

        return {
          success: response.data.success,
          message: response.data.message,
          access_token: sessionToken,
          token: sessionToken,
          id_token: response.data.id_token,
          custom_token: response.data.custom_token,
          refresh_token: response.data.refresh_token,
          user: response.data.user
        };
      }

      throw new Error('Backend login failed');
    } catch (error: unknown) {
      console.error('❌ Backend login failed:', error);
      console.error('❌ Error type:', typeof error);
      console.error('❌ Error details:', error);
      
      // Handle axios errors specifically
      if (error && typeof error === 'object' && 'code' in error) {
        const axiosError = error as any;
        console.error('❌ Axios error code:', axiosError.code);
        console.error('❌ Axios error message:', axiosError.message);
        console.error('❌ Axios error response:', axiosError.response);
        
        if (axiosError.code === 'ECONNREFUSED' || axiosError.code === 'ERR_NETWORK') {
          throw new Error('Cannot connect to server. Please check if the backend is running.');
        }
      }
      
      // Handle backend auth errors
      if (error instanceof Error) {
        if (error.message.includes('User not found')) {
          throw new Error('No account found with this email address');
        } else if (error.message.includes('Invalid password')) {
          throw new Error('Incorrect password');
        } else if (error.message.includes('Access denied')) {
          throw new Error('Access denied. Please contact administrator.');
        }
      }

      const errorMessage = error instanceof Error ? error.message : 'Login failed';
      throw new Error(errorMessage);
    }
  }



  // Verify Firebase ID token for RM/RP users
  async verifyFirebaseToken(idToken: string): Promise<FirebaseVerifyResponse> {
    try {
      // Real Firebase token verification with backend
      const response = await this.api.post<FirebaseVerifyResponse>('/firebase/verify-token', {
        id_token: idToken,
      });

      if (response.data.success && response.data.user) {
        this.storeAuth(idToken, response.data.user);
      }

      return response.data;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message :
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Token verification failed';
      throw new Error(errorMessage);
    }
  }

  // Get user profile using new endpoint
  async getProfile(): Promise<ProfileResponse> {
    try {
      const response = await this.api.get<ProfileResponse>('/auth/profile');

      if (response.data) {
        // Update stored user data with fresh profile data
        const token = this.getStoredToken();
        if (token) {
          this.storeAuth(token, response.data);
        }
      }

      return response.data;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message :
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to fetch profile';
      throw new Error(errorMessage);
    }
  }

  // Logout
  async logout(): Promise<void> {
    try {
      // Sign out from Firebase
      await signOutUser();
    } catch (error) {
      console.error('Firebase sign out error:', error);
    } finally {
      // Always clear local storage
      this.clearStoredAuth();
    }
  }

  // Validate token with backend (only call when explicitly needed)
  async validateToken(): Promise<TokenValidationResponse> {
    try {
      console.log('🔍 Validating token...');
      const response = await this.api.get<TokenValidationResponse>('/auth/validate-token');
      console.log('✅ Token validation result:', response.data);
      return response.data;
    } catch (error: unknown) {
      console.error('❌ Token validation error:', error);
      return { valid: false };
    }
  }

  // Check if user is authenticated (local check)
  isAuthenticated(): boolean {
    const token = this.getStoredToken();
    const user = this.getStoredUser();
    return !!(token && user);
  }

  // Check if user is authenticated with server validation
  async isAuthenticatedAsync(): Promise<boolean> {
    if (!this.isAuthenticated()) {
      return false;
    }

    try {
      const validation = await this.validateToken();
      if (!validation.valid) {
        this.clearStoredAuth();
        return false;
      }

      // Update user data if provided
      if (validation.user) {
        const token = this.getStoredToken();
        if (token) {
          this.storeAuth(token, validation.user);
        }
      }

      return true;
    } catch (error) {
      console.error('Authentication validation failed:', error);
      this.clearStoredAuth();
      return false;
    }
  }

  // Get current user from storage
  getCurrentUser(): User | null {
    return this.getStoredUser();
  }

  // Get current token from storage
  getCurrentToken(): string | null {
    return this.getStoredToken();
  }

  // Clear stored auth data (public method for external use)
  clearStoredAuthPublic(): void {
    this.clearStoredAuth();
  }

  // Get token expiry information (Firebase handles token expiry automatically)
  getTokenExpiryInfo(): { isExpired: boolean; expiresAt: Date | null; timeRemaining: string | null } {
    // Firebase automatically handles token expiry and refresh
    // We don't need to manually track expiry since Firebase auth state listener handles this
    return { 
      isExpired: false, 
      expiresAt: null, 
      timeRemaining: null 
    };
  }

  // Private methods for token/user storage
  private storeAuth(token: string, user: User): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem('auth_token', token);
      localStorage.setItem('auth_user', JSON.stringify(user));
      // No need to store timestamp - Firebase handles token expiry automatically
    }
  }

  private getStoredToken(): string | null {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('auth_token');
      // Firebase auth state listener handles token expiry automatically
      // We just return the stored token, Firebase will handle validation
      return token;
    }
    return null;
  }

  private getStoredUser(): User | null {
    if (typeof window !== 'undefined') {
      const userStr = localStorage.getItem('auth_user');
      return userStr ? JSON.parse(userStr) : null;
    }
    return null;
  }

  private clearStoredAuth(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('auth_user');
      // No timestamp to remove since we're not tracking it anymore
    }
  }
}

// Create singleton instance
const authService = new AuthService();
export default authService;