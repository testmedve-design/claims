// Centralized role-based routing configuration

export type Role = 
  | 'hospital_user' 
  | 'claim_processor'
  | 'claim_processor_l1' 
  | 'claim_processor_l2' 
  | 'claim_processor_l3' 
  | 'claim_processor_l4'
  | 'rm'
  | 'reconciler'
  | 'review_request'
  | 'admin'
  | 'super_admin'
  | 'system_admin'
  | 'hospital_admin'
  | 'rp'
  | 'employee'

// Role definitions
export const ALLOWED_ROLES: Role[] = [
  'hospital_user',
  'claim_processor',
  'claim_processor_l1',
  'claim_processor_l2',
  'claim_processor_l3',
  'claim_processor_l4',
  'rm',
  'reconciler',
  'review_request'
]

// Processor approval limits (in rupees)
export const PROCESSOR_APPROVAL_LIMITS: Record<string, number> = {
  'claim_processor_l1': 50000,   // Up to 50,000
  'claim_processor_l2': 100000,  // Up to 1 lakh
  'claim_processor_l3': 200000,  // Up to 2 lakhs
  'claim_processor_l4': Infinity // All amounts
}

export const BLOCKED_ROLES: Role[] = [
  'admin',
  'super_admin',
  'system_admin',
  'hospital_admin',
  'rp',
  'employee'
]

// Default page for each role after login
export const DEFAULT_ROLE_PAGES: Record<Role, string> = {
  hospital_user: '/claims',
  claim_processor: '/processor-inbox',
  claim_processor_l1: '/processor-inbox',
  claim_processor_l2: '/processor-inbox',
  claim_processor_l3: '/processor-inbox',
  claim_processor_l4: '/processor-inbox',
  rm: '/rm-inbox',
  reconciler: '/rm-inbox',
  review_request: '/review-request-inbox',
  // Blocked roles should not reach here, but if they do, go to login
  admin: '/login',
  super_admin: '/login',
  system_admin: '/login',
  hospital_admin: '/login',
  rp: '/login',
  employee: '/login'
}

// Route access control - which roles can access which routes
export const ROUTE_ACCESS: Record<string, Role[]> = {
  '/claims': ['hospital_user'],
  '/claims/new': ['hospital_user'],
  '/claims/[claimId]': ['hospital_user', 'review_request'],
  '/drafts': ['hospital_user'],
  '/claims-inbox': ['hospital_user'],
  '/claims-inbox/[claimId]': ['hospital_user'],
  '/processor-inbox': ['claim_processor', 'claim_processor_l1', 'claim_processor_l2', 'claim_processor_l3', 'claim_processor_l4'],
  '/processor-inbox/process/[claimId]': ['claim_processor', 'claim_processor_l1', 'claim_processor_l2', 'claim_processor_l3', 'claim_processor_l4'],
  '/rm-inbox': ['rm', 'reconciler'],
  '/rm-inbox/process/[claimId]': ['rm', 'reconciler'],
  '/notifications': [
    'hospital_user',
    'claim_processor',
    'claim_processor_l1',
    'claim_processor_l2',
    'claim_processor_l3',
    'claim_processor_l4',
    'rm',
    'reconciler'
  ],
  '/review-request-inbox': ['review_request'],
  '/review-request-inbox/process/[claimId]': ['review_request'],
  '/reviewed-inbox': ['review_request'],
  '/reviewed-inbox/process/[claimId]': ['review_request'],
  '/profile': ALLOWED_ROLES
}

// Helper function to get default page for a role
export function getDefaultPageForRole(role: Role): string {
  return DEFAULT_ROLE_PAGES[role] || '/login'
}

// Helper function to check if a role can access a route
export function canAccessRoute(role: Role, pathname: string): boolean {
  // Normalize pathname (remove query params, hash)
  const path = pathname.split('?')[0].split('#')[0]
  
  // Check exact match first
  if (ROUTE_ACCESS[path]) {
    return ROUTE_ACCESS[path].includes(role)
  }
  
  // Check dynamic routes (e.g., /claims/[claimId])
  for (const route in ROUTE_ACCESS) {
    if (route.includes('[')) {
      // Convert dynamic route to regex
      const regexPattern = route
        .replace(/\[.*?\]/g, '[^/]+')
        .replace(/\//g, '\\/')
      const regex = new RegExp(`^${regexPattern}$`)
      
      if (regex.test(path)) {
        return ROUTE_ACCESS[route].includes(role)
      }
    }
  }
  
  // If route not defined, allow by default (for public routes)
  return true
}

// Helper function to check if a role is allowed
export function isAllowedRole(role: string): role is Role {
  return ALLOWED_ROLES.includes(role as Role)
}

// Helper function to check if a role is blocked
export function isBlockedRole(role: string): boolean {
  return BLOCKED_ROLES.includes(role as Role)
}
