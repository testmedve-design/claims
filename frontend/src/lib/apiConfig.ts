const RAW_API_HOST = process.env.NEXT_PUBLIC_API_URL || 'https://claims-2.onrender.com'

// Remove trailing slash, then strip a trailing '/api' if provided by env var
const TRIMMED_API_HOST = RAW_API_HOST.replace(/\/$/, '')
const NORMALIZED_API_HOST = TRIMMED_API_HOST.endsWith('/api')
  ? TRIMMED_API_HOST.slice(0, -4)
  : TRIMMED_API_HOST

export const API_HOST = NORMALIZED_API_HOST
export const API_BASE_URL = `${NORMALIZED_API_HOST}/api`

// Debug logging (only in development)
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  console.log('🔧 API Configuration:', {
    'NEXT_PUBLIC_API_URL': process.env.NEXT_PUBLIC_API_URL,
    'RAW_API_HOST': RAW_API_HOST,
    'NORMALIZED_API_HOST': NORMALIZED_API_HOST,
    'API_BASE_URL': API_BASE_URL
  })
}


