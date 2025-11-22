import { API_BASE_URL } from '@/lib/apiConfig'

export interface ReviewClaim {
  claim_id: string
  document_id: string
  claim_status: string
  created_at?: string | null
  submission_date?: string | null
  hospital_name?: string
  hospital_id?: string
  patient_name?: string
  payer_name?: string
  payer_type?: string
  doctor_name?: string
  provider_name?: string
  authorization_number?: string
  date_of_admission?: string | null
  date_of_discharge?: string | null
  claimed_amount?: number
  billed_amount?: number | null
  patient_paid_amount?: number | null
  discount_amount?: number | null
  approved_amount?: number | null
  disallowed_amount?: number | null
  review_requested_amount?: number | null
  claim_type?: string
  review_data?: any
  processor_decision?: any
  review_history_count?: number
  last_reviewed_at?: string | null
  reviewed_by?: string
  reviewed_by_email?: string
}

export interface ReviewClaimDetails {
  claim_id: string
  document_id: string
  claim_status: string
  review_status: string
  hospital_name?: string
  hospital_id?: string
  created_at?: string | null
  submission_date?: string | null
  form_data: any
  review_data: any
  processor_decision: any
  documents: any[]
  transactions: any[]
  review_history?: any[]
}

export interface ReviewStats {
  total: number
  pending: number
  under_review: number
  completed: number
}

export type ReviewAction = 'reviewed' | 'not_found'

export interface ReviewDecisionPayload {
  review_action: ReviewAction
  review_remarks?: string
  total_bill_amount?: number
  approved_amount?: number
  disallowed_amount?: number
  review_request_amount?: number
  reason_by_payer?: string
}

class ReviewRequestApi {
  private baseUrl: string

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl
  }

  private getHeaders() {
    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    }
  }

  async getClaims(params: {
    status?: 'pending' | 'under_review' | 'completed' | 'all'
    start_date?: string
    end_date?: string
    payer?: string
    hospital?: string
    limit?: number
  }): Promise<{ success: boolean; claims: ReviewClaim[]; total_claims: number; error?: string }> {
    const queryParams = new URLSearchParams()
    if (params.status) queryParams.append('status', params.status)
    if (params.start_date) queryParams.append('start_date', params.start_date)
    if (params.end_date) queryParams.append('end_date', params.end_date)
    if (params.payer) queryParams.append('payer', params.payer)
    if (params.hospital) queryParams.append('hospital', params.hospital)
    if (params.limit) queryParams.append('limit', params.limit.toString())

    const url = `${this.baseUrl}/review-request/get-claims?${queryParams.toString()}`
    const response = await fetch(url, {
      method: 'GET',
      headers: this.getHeaders(),
      credentials: 'include',
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(errorText || `Failed to fetch review claims (${response.status})`)
    }

    return response.json()
  }

  async getClaimDetails(claimId: string): Promise<{ success: boolean; claim: ReviewClaimDetails; error?: string }> {
    const url = `${this.baseUrl}/review-request/get-claim-details/${claimId}`
    const response = await fetch(url, {
      method: 'GET',
      headers: this.getHeaders(),
      credentials: 'include',
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(errorText || `Failed to fetch claim details (${response.status})`)
    }

    return response.json()
  }

  async reviewClaim(claimId: string, payload: ReviewDecisionPayload) {
    const url = `${this.baseUrl}/review-request/review-claim/${claimId}`
    const response = await fetch(url, {
      method: 'POST',
      headers: this.getHeaders(),
      credentials: 'include',
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(errorText || `Failed to submit review (${response.status})`)
    }

    return response.json()
  }

  async escalateClaim(claimId: string, params: { escalation_reason: string; escalated_to?: string; review_remarks?: string }) {
    const url = `${this.baseUrl}/review-request/escalate-claim/${claimId}`
    const response = await fetch(url, {
      method: 'POST',
      headers: this.getHeaders(),
      credentials: 'include',
      body: JSON.stringify(params),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(errorText || `Failed to escalate claim (${response.status})`)
    }

    return response.json()
  }
}

const reviewRequestApi = new ReviewRequestApi()

export { reviewRequestApi }
export default reviewRequestApi