const API_BASE_URL = 'https://claims-2.onrender.com'

// Import the main ClaimFormData from types
import type { ClaimFormData } from '@/types/claims'

export interface Specialty {
  id: string
  name: string
}

export interface Payer {
  id: string
  name: string
}

export interface ChecklistItem {
  id: string
  name: string
  description: string
  required: boolean
}

export interface ChecklistResponse {
  success: boolean
  checklist: ChecklistItem[]
  payer_name: string
  specialty: string
  is_default: boolean
}

class ClaimsApi {
  private baseUrl: string

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl
  }

  async getSpecialties(hospitalId?: string): Promise<Specialty[]> {
    try {
      let url = `${this.baseUrl}/api/resources/specialties`
      if (hospitalId) {
        url += `?hospital_id=${hospitalId}`
      }
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
          'Content-Type': 'application/json'
        }
      })
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      const data = await response.json()
      return data.specialties || []
    } catch (error) {
      console.error('Error fetching specialties:', error)
      return []
    }
  }

  async getPayers(hospitalId?: string): Promise<Payer[]> {
    try {
      let url = `${this.baseUrl}/api/resources/payers`
      if (hospitalId) {
        url += `?hospital_id=${hospitalId}`
      }
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
          'Content-Type': 'application/json'
        }
      })
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      const data = await response.json()
      return data.payers || []
    } catch (error) {
      console.error('Error fetching payers:', error)
      return []
    }
  }

  async getChecklist(payerName: string, specialty?: string): Promise<ChecklistResponse> {
    try {
      // Build URL with payer_name and optional specialty
      let url = `${this.baseUrl}/api/new-claim/checklist/get-checklist?payer_name=${encodeURIComponent(payerName)}`
      if (specialty) {
        url += `&specialty=${encodeURIComponent(specialty)}`
      }
      
      const response = await fetch(url)
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      return await response.json()
    } catch (error) {
      console.error('Error fetching checklist:', error)
      throw error
    }
  }

  async submitClaim(claimData: ClaimFormData): Promise<{ success: boolean; message: string; claim_id?: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/api/new-claim/submit-claim`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify(claimData),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Error submitting claim:', error)
      throw error
    }
  }

  async saveDraft(claimData: Partial<ClaimFormData>): Promise<{ success: boolean; message: string; draft_id?: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/api/v1/drafts/save-draft`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify(claimData),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Error saving draft:', error)
      throw error
    }
  }

  async getDrafts(): Promise<any[]> {
    try {
      const response = await fetch(`${this.baseUrl}/api/v1/drafts/list`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      })
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      const data = await response.json()
      return data.drafts || []
    } catch (error) {
      console.error('Error fetching drafts:', error)
      return []
    }
  }

  async getClaims(): Promise<any[]> {
    try {
      const response = await fetch(`${this.baseUrl}/api/v1/claims/get-all-claims`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      })
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      const data = await response.json()
      return data.claims || []
    } catch (error) {
      console.error('Error fetching claims:', error)
      return []
    }
  }

  async dispatchClaim(claimId: string, dispatchData: { dispatch_remarks?: string; dispatch_tracking_number?: string }): Promise<{ success: boolean; message: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/api/v1/claims/dispatch-claim/${claimId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify(dispatchData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Error dispatching claim:', error)
      throw error
    }
  }

  async getCouriers(): Promise<any[]> {
    try {
      const response = await fetch(`${this.baseUrl}/api/resources/couriers`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      })
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      const data = await response.json()
      return data.couriers || []
    } catch (error) {
      console.error('Error fetching couriers:', error)
      return []
    }
  }

  async getClaimTransactions(claimId: string): Promise<any[]> {
    try {
      const response = await fetch(`${this.baseUrl}/api/v1/claims/transactions/${claimId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      })
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      const data = await response.json()
      return data.transactions || []
    } catch (error) {
      console.error('Error fetching claim transactions:', error)
      return []
    }
  }
}

export const claimsApi = new ClaimsApi()