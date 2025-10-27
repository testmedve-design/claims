export interface User {
  id: string;
  uid?: string;
  email?: string;
  name?: string;
  displayName?: string;
  emailVerified?: boolean;
  role: 'rm' | 'rp' | 'employee' | 'hospital_admin' | 'hospital_user' | 'claim_processor' | 'claim_processor_l1' | 'claim_processor_l2' | 'claim_processor_l3' | 'claim_processor_l4' | 'reconciler';
  roles?: string[];
  status?: string;
  phone?: string;
  employee_name?: string;
  corporate_name?: string;
  dependents?: Dependent[];
  entity_assignments?: {
    hospitals?: Array<{
      id: string;
      name: string;
    }>;
  };
  assignedEntity?: {
    type: 'hospital' | 'provider' | 'corporate';
    id: string;
    name: string;
  };
}

export interface Dependent {
  name: string;
  relation: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

export interface LoginCredentials {
  email: string;
  password: string;
}


export interface LoginResponse {
  success: boolean;
  message: string;
  access_token: string;
  token?: string;
  user: User;
}


export interface FirebaseVerifyResponse {
  success: boolean;
  user: User;
}

export type ProfileResponse = User;

export interface TokenValidationResponse {
  valid: boolean;
  user?: User;
  message?: string;
}