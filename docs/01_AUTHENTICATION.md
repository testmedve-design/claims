# Authentication API Documentation

## Overview
The authentication system uses Firebase Authentication for user management and JWT tokens for API access.

**Base URL**: `http://localhost:5002`

---

## Authentication Endpoints

### 1. Login
**Endpoint**: `POST /api/auth/login`

**Description**: Authenticate a user and receive an access token.

**Headers**:
```json
{
  "Content-Type": "application/json"
}
```

**Request Body**:
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Success Response** (200 OK):
```json
{
  "success": true,
  "message": "Login successful",
  "token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "uid": "firebase_user_id",
    "email": "user@example.com",
    "role": "hospital_user",
    "display_name": "John Doe",
    "entity_assignments": {
      "hospitals": [
        {
          "id": "hospital_123",
          "name": "City Hospital",
          "code": "CITY001"
        }
      ]
    }
  }
}
```

**Error Response** (401 Unauthorized):
```json
{
  "success": false,
  "error": "Invalid credentials"
}
```

---

## User Roles

### 1. Hospital User
- **Role**: `hospital_user`
- **Access**: Can create claims, manage drafts, view their hospital's claims
- **Restricted**: Cannot process claims

### 2. Claim Processor (L4)
- **Role**: `claim_processor_l4` or `claim_processor`
- **Access**: Can process claims, approve/reject, raise queries
- **Restricted**: Cannot create new claims

---

## Authorization

All protected endpoints require a Bearer token in the Authorization header:

```http
Authorization: Bearer <your_jwt_token>
```

**Frontend Implementation**:
```typescript
const token = localStorage.getItem('auth_token');

fetch('http://localhost:5002/api/v1/claims/get-all-claims', {
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
})
```

---

## Token Storage

### Recommended Approach
Store the token in `localStorage`:

```typescript
// After successful login
localStorage.setItem('auth_token', response.token);
localStorage.setItem('user_data', JSON.stringify(response.user));

// Retrieve token
const token = localStorage.getItem('auth_token');
const user = JSON.parse(localStorage.getItem('user_data') || '{}');

// Clear on logout
localStorage.removeItem('auth_token');
localStorage.removeItem('user_data');
```

---

## Role-Based Access Control

### Checking User Role
```typescript
const user = JSON.parse(localStorage.getItem('user_data') || '{}');

// Check if hospital user
if (user.role === 'hospital_user') {
  // Show hospital user features
}

// Check if processor
if (user.role === 'claim_processor' || user.role === 'claim_processor_l4') {
  // Show processor features
}
```

### Getting Hospital Information
```typescript
const user = JSON.parse(localStorage.getItem('user_data') || '{}');

const hospitalId = user.entity_assignments?.hospitals?.[0]?.id || '';
const hospitalName = user.entity_assignments?.hospitals?.[0]?.name || '';
const hospitalCode = user.entity_assignments?.hospitals?.[0]?.code || '';
```

---

## Error Handling

### Common Error Codes

| Status Code | Description | Action |
|-------------|-------------|--------|
| 401 | Unauthorized - Invalid/expired token | Redirect to login |
| 403 | Forbidden - Insufficient permissions | Show error message |
| 500 | Server error | Show error message |

### Frontend Error Handler Example
```typescript
async function apiCall(url: string, options: RequestInit = {}) {
  try {
    const token = localStorage.getItem('auth_token');
    
    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...options.headers
      }
    });

    if (response.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user_data');
      window.location.href = '/login';
      return;
    }

    if (response.status === 403) {
      throw new Error('Access denied. Insufficient permissions.');
    }

    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error || 'Request failed');
    }

    return data;
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
}
```

---

## Session Management

### Token Expiry
- Tokens expire after **1 hour** by default
- Frontend should handle 401 responses and redirect to login
- Consider implementing token refresh mechanism

### Auto-Logout
```typescript
// Check token validity on app load
async function checkAuth() {
  const token = localStorage.getItem('auth_token');
  
  if (!token) {
    window.location.href = '/login';
    return;
  }

  try {
    // Try to fetch user profile to validate token
    const response = await fetch('http://localhost:5002/api/v1/claims/get-all-claims?limit=1', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (response.status === 401) {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user_data');
      window.location.href = '/login';
    }
  } catch (error) {
    console.error('Auth check failed:', error);
  }
}
```

---

## Security Best Practices

1. **Never** store sensitive data in localStorage beyond the token
2. **Always** use HTTPS in production
3. **Clear** tokens on logout
4. **Validate** token expiry on critical actions
5. **Implement** CSRF protection for production
6. **Use** secure cookie storage for production environment

---

## Testing Authentication

### Test Users
Ask the backend team for test credentials for:
- Hospital user account
- Processor account

### Example Login Flow
```typescript
const loginUser = async (email: string, password: string) => {
  try {
    const response = await fetch('http://localhost:5002/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email, password })
    });

    const data = await response.json();

    if (data.success) {
      localStorage.setItem('auth_token', data.token);
      localStorage.setItem('user_data', JSON.stringify(data.user));
      
      // Redirect based on role
      if (data.user.role === 'claim_processor' || data.user.role === 'claim_processor_l4') {
        window.location.href = '/processor-inbox';
      } else if (data.user.role === 'hospital_user') {
        window.location.href = '/claims-inbox';
      }
    } else {
      throw new Error(data.error || 'Login failed');
    }
  } catch (error) {
    console.error('Login error:', error);
    throw error;
  }
};
```

