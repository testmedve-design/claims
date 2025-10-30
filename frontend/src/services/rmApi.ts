const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://claims-2.onrender.com/api';

export interface RMClaim {
  claim_id: string
  patient_name: string
  payer_name: string
  claimed_amount: number
  claim_status: string
  rm_status: string
  submission_date: string
  created_at: string
  hospital_name: string
  hospital_id: string
  rm_updated_at: string
  rm_updated_by: string
}

export interface RMClaimDetails {
  claim_id: string
  claim_status: string
  rm_status: string
  hospital_name: string
  hospital_id: string
  created_at: string
  submission_date: string
  rm_data?: any
  patient_details: any
  payer_details: any
  financial_details: any
  form_data: any
  documents: any[]
  transactions: any[]
}

class RMApi {
  private baseUrl: string

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl
  }

  private getHeaders() {
    const token = localStorage.getItem('auth_token')
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  }

  async getClaims(params: {
    tab?: string
    start_date?: string
    end_date?: string
    limit?: number
  }): Promise<{ success: boolean; claims: RMClaim[]; error?: string }> {
    try {
      const queryParams = new URLSearchParams()
      if (params.tab) queryParams.append('tab', params.tab)
      if (params.start_date) queryParams.append('start_date', params.start_date)
      if (params.end_date) queryParams.append('end_date', params.end_date)
      if (params.limit) queryParams.append('limit', params.limit.toString())

      const url = `${this.baseUrl}/rm/get-claims?${queryParams.toString()}`
      
      console.log('🔍 RM API: Fetching claims from:', url)
      console.log('🔍 RM API: Base URL:', this.baseUrl)
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          ...this.getHeaders(),
          'Accept': 'application/json'
        },
        credentials: 'include'
      }).catch((fetchError) => {
        console.error('❌ Fetch error:', fetchError)
        throw new Error(`Network error: ${fetchError.message}. Please check if the backend is running on ${this.baseUrl}`)
      })

      console.log('✅ Response received:', response.status, response.statusText)

      if (!response.ok) {
        const errorText = await response.text()
        console.error('❌ Response error:', errorText)
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`)
      }

      const data = await response.json()
      return data
    } catch (error: any) {
      console.error('❌ Error fetching RM claims:', error)
      throw error
    }
  }

  async getClaimDetails(claimId: string): Promise<{ success: boolean; claim: RMClaimDetails; error?: string }> {
    try {
      const url = `${this.baseUrl}/rm/get-claim-details/${claimId}`
      const response = await fetch(url, {
        headers: this.getHeaders()
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      return data
    } catch (error: any) {
      console.error('Error fetching claim details:', error)
      throw error
    }
  }

  async updateClaim(claimId: string, updateData: {
    rm_status: string
    status_raised_date?: string
    status_raised_remarks?: string
    rm_data?: any
  }): Promise<{ success: boolean; error?: string }> {
    try {
      const url = `${this.baseUrl}/rm/update-claim/${claimId}`
      const response = await fetch(url, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(updateData)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update claim')
      }

      const data = await response.json()
      return data
    } catch (error: any) {
      console.error('Error updating claim:', error)
      throw error
    }
  }

  async reevaluateClaim(claimId: string, remarks: string): Promise<{ success: boolean; error?: string }> {
    try {
      const url = `${this.baseUrl}/rm/reevaluate-claim/${claimId}`
      const response = await fetch(url, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ remarks })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to re-evaluate claim')
      }

      const data = await response.json()
      return data
    } catch (error: any) {
      console.error('Error re-evaluating claim:', error)
      throw error
    }
  }
}

export const rmApi = new RMApi()
