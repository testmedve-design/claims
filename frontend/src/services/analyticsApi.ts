import { API_BASE_URL } from '@/lib/apiConfig'

export interface AnalyticsFilters {
  start_date: string
  end_date: string
  hospital_id?: string
  payer_name?: string
  payer_type?: string
}

export interface AnalyticsResponse {
  success: boolean
  data?: any
  error?: string
}

class AnalyticsApi {
  private baseUrl: string

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl
  }

  private async fetchAnalytics(endpoint: string, filters: AnalyticsFilters): Promise<AnalyticsResponse> {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null
      
      const queryParams = new URLSearchParams({
        start_date: filters.start_date,
        end_date: filters.end_date,
        ...(filters.hospital_id && { hospital_id: filters.hospital_id }),
        ...(filters.payer_name && { payer_name: filters.payer_name }),
        ...(filters.payer_type && { payer_type: filters.payer_type })
      })

      const url = `${this.baseUrl}${endpoint}?${queryParams.toString()}`
      
      const response = await fetch(url, {
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to fetch analytics' }))
        return {
          success: false,
          error: errorData.error || `HTTP ${response.status}: ${response.statusText}`
        }
      }

      const data = await response.json()
      return {
        success: true,
        data: data.data || data
      }
    } catch (error) {
      console.error('Analytics API error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch analytics'
      }
    }
  }

  async getHospitalAnalytics(filters: AnalyticsFilters): Promise<AnalyticsResponse> {
    return this.fetchAnalytics('/api/v1/analytics/hospital-user/overview', filters)
  }

  async getProcessorAnalytics(filters: AnalyticsFilters): Promise<AnalyticsResponse> {
    return this.fetchAnalytics('/api/v1/analytics/processor/overview', filters)
  }

  async getReviewAnalytics(filters: AnalyticsFilters): Promise<AnalyticsResponse> {
    return this.fetchAnalytics('/api/v1/analytics/review-request/overview', filters)
  }

  async getRMAnalytics(filters: AnalyticsFilters): Promise<AnalyticsResponse> {
    return this.fetchAnalytics('/api/v1/analytics/rm/overview', filters)
  }
}

export const analyticsApi = new AnalyticsApi()

