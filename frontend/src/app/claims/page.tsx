'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { toast } from '@/lib/toast'
import { claimsApi } from '@/services/claimsApi'
import type { ClaimFormData, Specialty, Doctor, Payer, Insurer, Ward } from '@/types/claims'
import { FileText, User, CreditCard, Hospital, DollarSign } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useSearchParams, useRouter } from 'next/navigation'
import DocumentChecklist from '@/components/forms/DocumentChecklist'

const API_BASE_URL = 'http://localhost:5002'


const initialFormData: ClaimFormData = {
  // Patient Details
  patient_name: '', 
  patient_id: '',
  age: 0, 
  age_unit: 'YRS', 
  gender: '', 
  id_card_type: '',
  id_card_number: '', 
  patient_contact_number: '', 
  patient_email_id: '',
  beneficiary_type: '', 
  relationship: '', 
  
  // Payer Details
  payer_patient_id: '',
  authorization_number: '', 
  total_authorized_amount: 0, 
  payer_type: '',
  payer_name: '', 
  insurer_name: '', 
  policy_number: '', 
  sponsorer_corporate_name: '',
  sponsorer_employee_id: '', 
  sponsorer_employee_name: '', 
  
  // Provider Details
  patient_registration_number: '',
  specialty: '', 
  doctor: '', 
  treatment_line: '', 
  claim_type: 'INPATIENT',
  service_start_date: '', 
  service_end_date: '', 
  inpatient_number: '',
  admission_type: '', 
  hospitalization_type: '', 
  ward_type: '', 
  final_diagnosis: '',
  icd_10_code: '', 
  treatment_done: '', 
  pcs_code: '', 
  
  // Bill Details
  bill_number: '',
  bill_date: '', 
  security_deposit: 0, 
  total_bill_amount: 0, 
  patient_discount_amount: 0,
  amount_paid_by_patient: 0, 
  total_patient_paid_amount: 0, 
  amount_charged_to_payer: 0,
  mou_discount_amount: 0, 
  claimed_amount: 0, 
  submission_remarks: '',
  
  // Legacy fields
  admission_date: '', 
  discharge_date: '', 
  diagnosis: '',
  treatment: '', 
  total_amount: 0, 
  documents: []
}

export default function ClaimsPage() {
  const { user } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [formData, setFormData] = useState<ClaimFormData>(initialFormData)
  const [editingDraftId, setEditingDraftId] = useState<string | null>(null)
  const [isEditingDraft, setIsEditingDraft] = useState(false)
  const [loading, setLoading] = useState(false)
  const [loadingDraft, setLoadingDraft] = useState(false)
  
  // Dynamic data states
  const [specialties, setSpecialties] = useState<Specialty[]>([])
  const [doctors, setDoctors] = useState<Doctor[]>([])
  const [payers, setPayers] = useState<Payer[]>([])
  const [insurers, setInsurers] = useState<Insurer[]>([])
  const [wards, setWards] = useState<Ward[]>([])
  const [loadingData, setLoadingData] = useState(true)
  
  // Document checklist states
  const [showDocumentChecklist, setShowDocumentChecklist] = useState(false)
  const [checklistComplete, setChecklistComplete] = useState(false)
  const [uploadedDocuments, setUploadedDocuments] = useState<any[]>([])
  
  // Get hospital ID from logged-in user
  // Get hospital ID from logged-in user (use same method as profile page)
  const hospitalId = (user as any)?.entity_assignments?.hospitals?.[0]?.id || null

  // Check if user has access to claims page
  useEffect(() => {
    if (user) {
      if (user.role === 'claim_processor' || (user.role as string) === 'claim_processor_l4') {
        router.push('/processor-inbox') // Redirect claim processors to their inbox
      } else if (user.role === 'hospital_user') {
        router.push('/claims-inbox') // Redirect hospital users to their inbox
      }
    }
  }, [user, router])

  // Check if we're editing an existing draft
  useEffect(() => {
    const draftId = searchParams.get('draft_id')
    if (draftId) {
      setEditingDraftId(draftId)
      setIsEditingDraft(true)
      loadDraftForEditing(draftId)
    }
  }, [searchParams])

  // Fetch initial data when user is loaded
  useEffect(() => {
    if (user) {
      console.log('User loaded, fetching data for hospital:', hospitalId)
      fetchInitialData()
      
      // Check if we need to load a draft
      const draftId = searchParams.get('draft')
      if (draftId) {
        loadDraft(draftId)
      }
    }
  }, [user, hospitalId, searchParams])

  // Fetch doctors when specialty changes
  useEffect(() => {
    if (formData.specialty) {
      fetchDoctorsBySpecialty(formData.specialty)
    }
  }, [formData.specialty])

  const fetchInitialData = async () => {
    try {
      setLoadingData(true)
      
      // Check if user has a hospital assigned
      if (!hospitalId) {
        toast.error('No hospital assigned', {
          description: 'Please contact administrator to assign a hospital to your account'
        })
        setLoadingData(false)
        return
      }
      
      console.log('Fetching data for hospital ID:', hospitalId)
      
      // Fetch specialties, payers, insurers, and wards in parallel
      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
      }
      
      const [specialtiesRes, payersRes, insurersRes, wardsRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/resources/specialties?hospital_id=${hospitalId}`, { headers }),
        fetch(`${API_BASE_URL}/api/resources/payers?hospital_id=${hospitalId}`, { headers }),
        fetch(`${API_BASE_URL}/api/resources/insurers?hospital_id=${hospitalId}`, { headers }),
        fetch(`${API_BASE_URL}/api/resources/ward-types`, { headers })
      ])

      // Check if all API calls were successful
      if (!specialtiesRes.ok || !payersRes.ok || !insurersRes.ok || !wardsRes.ok) {
        throw new Error('One or more API calls failed')
      }

      const specialtiesData = await specialtiesRes.json()
      const payersData = await payersRes.json()
      const insurersData = await insurersRes.json()
      const wardsData = await wardsRes.json()

      console.log('Specialties loaded:', specialtiesData.specialties?.length || 0)
      console.log('Payers loaded:', payersData.payers?.length || 0)
      console.log('Insurers loaded:', insurersData.insurers?.length || 0)
      console.log('Ward types loaded:', wardsData.ward_types?.length || 0)

      if (specialtiesData.success) {
        setSpecialties(specialtiesData.specialties || [])
      } else {
        console.error('Failed to load specialties:', specialtiesData.error)
        toast.error('Failed to load specialties')
      }

      if (payersData.success) {
        setPayers(payersData.payers || [])
      } else {
        console.error('Failed to load payers:', payersData.error)
        toast.error('Failed to load payers')
      }

      if (insurersData.success) {
        setInsurers(insurersData.insurers || [])
      } else {
        console.error('Failed to load insurers:', insurersData.error)
        toast.error('Failed to load insurers')
      }

      if (wardsData.success) {
        // Normalize ward data structure - handle inconsistent field names
        const normalizedWards = (wardsData.ward_types || []).map((ward: any) => ({
          ward_type_id: ward.ward_type_id || ward.ward_id,
          ward_type_name: ward.ward_type_name || ward.ward_name,
          description: ward.description || '',
          hospital_id: ward.hospital_id || '',
          hospital_name: ward.hospital_name || ''
        }))
        
        // Remove duplicates based on ward_type_name and keep unique entries
        const uniqueWards = normalizedWards.filter((ward: Ward, index: number, self: Ward[]) => 
          index === self.findIndex((w: Ward) => w.ward_type_name === ward.ward_type_name)
        )
        
        setWards(uniqueWards)
      } else {
        console.error('Failed to load wards:', wardsData.error)
        toast.error('Failed to load ward types')
      }
    } catch (error) {
      console.error('Error fetching initial data:', error)
      toast.error('Failed to load form data', {
        description: 'Some dropdowns may not be populated'
      })
    } finally {
      setLoadingData(false)
    }
  }

  const loadDraft = async (draftId: string) => {
    try {
      setLoadingDraft(true)
      console.log('Loading draft:', draftId)
      
      const response = await fetch(`${API_BASE_URL}/api/v1/drafts/get-draft/${draftId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error('Failed to load draft')
      }

      const data = await response.json()
      
      if (data.success && data.draft) {
        const draftFormData = data.draft.form_data
        setFormData(draftFormData)
        
        toast.success('Draft loaded successfully', {
          description: `Patient: ${draftFormData.patient_name || 'N/A'}`
        })
      }
    } catch (error) {
      console.error('Error loading draft:', error)
      toast.error('Failed to load draft')
    } finally {
      setLoadingDraft(false)
    }
  }

  const fetchDoctorsBySpecialty = async (specialty: string) => {
    try {
      console.log('Fetching doctors for specialty:', specialty, 'hospital:', hospitalId)
      
      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
      }
      
      const response = await fetch(
        `${API_BASE_URL}/api/resources/doctors?hospital_id=${hospitalId}&specialty=${encodeURIComponent(specialty)}`,
        { headers }
      )
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()

      console.log('Doctors fetched:', data.doctors?.length || 0)

      if (data.success) {
        setDoctors(data.doctors || [])
      } else {
        console.error('Failed to load doctors:', data.error)
        toast.error('Failed to load doctors')
      }
    } catch (error) {
      console.error('Error fetching doctors:', error)
      toast.error('Failed to load doctors')
      setDoctors([]) // Clear doctors list on error
    }
  }

  const handleChange = (field: keyof ClaimFormData, value: string) => {
    setFormData(prev => {
      const updated = { ...prev, [field]: value }
      
      // Auto-calculations for bill amounts
      const totalBill = updated.total_bill_amount || 0
      const patientDiscount = updated.patient_discount_amount || 0
      const amountPaidByPatient = updated.amount_paid_by_patient || 0
      
      // Rule 2: Total Patient Paid = Patient Discount + Amount Paid By Patient
      if (field === 'patient_discount_amount' || field === 'amount_paid_by_patient') {
        const totalPatientPaid = patientDiscount + amountPaidByPatient
        updated.total_patient_paid_amount = totalPatientPaid
      }
      
      // Rule 3: Amount Charged to Payer = Total Bill - Total Patient Paid
      if (field === 'total_bill_amount' || field === 'patient_discount_amount' || field === 'amount_paid_by_patient' || field === 'total_patient_paid_amount') {
        const totalPatientPaid = updated.total_patient_paid_amount || 0
        updated.amount_charged_to_payer = totalBill - totalPatientPaid
      }
      
      // Rule 4: Claimed Amount = Amount Charged to Payer - MOU Discount
      const amountChargedToPayer = updated.amount_charged_to_payer || 0
      const mouDiscountAmount = updated.mou_discount_amount || 0
      updated.claimed_amount = amountChargedToPayer - mouDiscountAmount
      
      return updated
    })
    
    if (field === 'beneficiary_type') {
      setFormData(prev => ({ ...prev, relationship: '' }))
    }
    
    // Reset doctor when specialty changes
    if (field === 'specialty') {
      setFormData(prev => ({ ...prev, doctor: '' }))
    }
    
    // Clear insurer_name when payer_type changes to non-TPA
    if (field === 'payer_type' && value !== 'TPA') {
      setFormData(prev => ({ ...prev, insurer_name: '' }))
    }
    
    // Show document checklist when payer_name and specialty are both filled
    if (field === 'payer_name' && value) {
      setShowDocumentChecklist(true)
    }
  }

  const getRelationshipOptions = () => {
    if (formData.beneficiary_type === 'SELF' || formData.beneficiary_type === 'SELF (Individual Policy)') {
      return ['SELF']
    } else if (formData.beneficiary_type === 'DEPENDANT') {
      return ['SPOUSE', 'SON', 'DAUGHTER', 'FATHER', 'MOTHER', 'BROTHER', 'SISTER', 'OTHER']
    }
    return ['SELF', 'SPOUSE', 'SON', 'DAUGHTER', 'FATHER', 'MOTHER', 'OTHER']
  }

  const loadDraftForEditing = async (draftId: string) => {
    try {
      setLoadingDraft(true)
      console.log('🔄 Loading draft for editing:', draftId)
      
      const response = await fetch(`http://localhost:5002/api/v1/drafts/get-draft/${draftId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success && data.draft) {
          const draftData = data.draft.form_data || {}
          const documents = data.draft.documents || []
          
          // Set form data
          setFormData(draftData)
          
          // Set documents if they exist
          if (documents && documents.length > 0) {
            setFormData(prev => ({
              ...prev,
              documents: documents
            }))
            console.log('✅ Draft loaded with documents:', documents)
          }
          
          console.log('✅ Draft loaded for editing:', draftData)
          toast.success('Draft loaded for editing', {
            description: `Resuming: ${draftData.patient_name || 'Untitled Draft'}`
          })
        }
      } else {
        throw new Error('Failed to load draft')
      }
    } catch (error) {
      console.error('Error loading draft:', error)
      toast.error('Failed to load draft for editing')
    } finally {
      setLoadingDraft(false)
    }
  }

  const handleSaveDraft = async () => {
    // Prevent double-saving
    if (loading) {
      console.log('❌ Draft save already in progress, ignoring duplicate call')
      return
    }
    
    // Additional protection: Check if we just saved a draft with the same data
    const currentDataHash = JSON.stringify({
      patient_name: formData.patient_name,
      specialty: formData.specialty,
      total_bill_amount: formData.total_bill_amount
    })
    
    const lastSaveHash = localStorage.getItem('lastDraftSaveHash')
    const lastSaveTime = localStorage.getItem('lastDraftSaveTime')
    const now = Date.now()
    
    if (lastSaveHash === currentDataHash && lastSaveTime && (now - parseInt(lastSaveTime)) < 5000) {
      console.log('❌ Duplicate save prevented - same data saved within 5 seconds')
      toast.error('Please wait before saving again', {
        description: 'You just saved a draft with the same data'
      })
      return
    }
    
    setLoading(true)

    try {
      console.log('🔄 Starting draft save with data:', formData)
      
      // Determine if we're updating an existing draft or creating a new one
      const isUpdating = isEditingDraft && editingDraftId
      const url = isUpdating 
        ? `http://localhost:5002/api/v1/drafts/update-draft/${editingDraftId}`
        : 'http://localhost:5002/api/v1/drafts/save-draft'
      
      console.log(`🔄 ${isUpdating ? 'Updating' : 'Creating'} draft:`, url)
      
      const response = await fetch(url, {
        method: isUpdating ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify(formData)
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error('❌ Draft save failed:', {
          status: response.status,
          statusText: response.statusText,
          error: errorData
        })
        
        if (response.status === 401) {
          throw new Error('Authentication required. Please log in to save drafts.')
        } else if (response.status === 409) {
          throw new Error(errorData.message || 'Duplicate draft detected')
        } else {
          throw new Error(errorData.error || errorData.message || `Failed to save draft (${response.status})`)
        }
      }

      const result = await response.json()
      
      console.log('✅ Draft saved successfully:', result)
      
      // Store save info to prevent duplicates
      localStorage.setItem('lastDraftSaveHash', currentDataHash)
      localStorage.setItem('lastDraftSaveTime', now.toString())
      
      const action = isUpdating ? 'Updated' : 'Saved'
      const draftId = result.draft_id || editingDraftId
      
      toast.success(`Draft ${action} Successfully`, {
        description: `Draft ID: ${draftId}`,
      })

      // Don't reset form data for drafts
    } catch (error) {
      console.error('Draft save error:', error)
      const errorMessage = error instanceof Error ? error.message : 'Please try again'
      toast.error('Failed to Save Draft', {
        description: errorMessage,
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validation: Claimed Amount should not exceed Total Authorized Amount
    const claimedAmount = formData.claimed_amount || 0
    const authorizedAmount = formData.total_authorized_amount || 0
    
    if (claimedAmount > authorizedAmount) {
      toast.error('Validation Error', {
        description: `Claimed Amount (₹${claimedAmount}) cannot exceed Total Authorized Amount (₹${authorizedAmount})`
      })
      return
    }
    
    setLoading(true)

    try {
      console.log('Submitting claim with data:', formData)
      
      // Convert numeric string fields to proper numbers for backend
      const submissionData = {
        ...formData,
        // Convert all numeric fields to numbers
        age: Number(formData.age) || 0,
        total_authorized_amount: Number(formData.total_authorized_amount) || 0,
        security_deposit: Number(formData.security_deposit) || 0,
        total_bill_amount: Number(formData.total_bill_amount) || 0,
        patient_discount_amount: Number(formData.patient_discount_amount) || 0,
        amount_paid_by_patient: Number(formData.amount_paid_by_patient) || 0,
        total_patient_paid_amount: Number(formData.total_patient_paid_amount) || 0,
        amount_charged_to_payer: Number(formData.amount_charged_to_payer) || 0,
        mou_discount_amount: Number(formData.mou_discount_amount) || 0,
        claimed_amount: Number(formData.claimed_amount) || 0,
        // Include uploaded documents
        documents: uploadedDocuments
      }
      
      const result = await claimsApi.submitClaim(submissionData)
      
      console.log('Claim submitted successfully:', result)
      
      // Upload documents after claim creation
      if (result.claim_id && uploadedDocuments.length > 0) {
        console.log('Uploading documents for claim:', result.claim_id)
        
        try {
          const uploadPromises = uploadedDocuments
            .filter(doc => doc.file) // Only upload documents that have files
            .map(async (doc) => {
              const formData = new FormData()
              formData.append('file', doc.file!)
              formData.append('claim_id', result.claim_id!)
              formData.append('document_type', doc.document_type)
              formData.append('document_name', doc.document_name)

              const response = await fetch('http://localhost:5002/api/v1/documents/upload', {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
                },
                body: formData
              })

              if (!response.ok) {
                throw new Error(`Failed to upload ${doc.document_name}`)
              }

              return await response.json()
            })

          await Promise.all(uploadPromises)
          console.log('All documents uploaded successfully')
        } catch (error) {
          console.error('Error uploading documents:', error)
          toast.error('Claim created but some documents failed to upload', {
            description: 'You can upload documents later from the claim details page.'
          })
        }
      }
      
      toast.success('Claim Submitted Successfully', {
        description: `Claim ID: ${result.claim_id}`,
      })

      setFormData(initialFormData)
      setUploadedDocuments([])
      setShowDocumentChecklist(false)
      setChecklistComplete(false)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (error) {
      console.error('Claim submission error:', error)
      toast.error('Failed to Submit Claim', {
        description: error instanceof Error ? error.message : 'Please try again',
      })
    } finally {
      setLoading(false)
    }
  }

  if (loadingDraft) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-4" />
          <p>Loading draft...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="space-y-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">IP Claim Submission</h1>
          <p className="text-muted-foreground">Fill in all required fields to submit a new inpatient claim</p>
        </div>
        
        {user && (
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="py-4">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    <Hospital className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Submitting claim for</p>
                    <p className="text-lg font-semibold">
                      {(user as any)?.entity_assignments?.hospitals?.[0]?.name || 
                       (user as any)?.hospital_name || 
                       'Unknown Hospital'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-6 text-sm">
                  <div>
                    <p className="text-muted-foreground">User</p>
                    <p className="font-medium">{user.displayName || user.name}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Role</p>
                    <p className="font-medium capitalize">{user.role?.replace('_', ' ')}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Patient Details */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <User className="h-4 w-4" />
              </div>
              <div>
                <CardTitle>Patient Details</CardTitle>
                <CardDescription>Basic patient information</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="patient_name">Patient Name <span className="text-destructive">*</span></Label>
              <Input id="patient_name" value={formData.patient_name} onChange={(e) => handleChange('patient_name', e.target.value)} required placeholder="Enter patient full name" />
            </div>

            <div className="space-y-2">
              <Label>Age <span className="text-destructive">*</span></Label>
              <div className="flex gap-2">
                <Input type="number" value={formData.age} onChange={(e) => handleChange('age', e.target.value)} required placeholder="Age" className="flex-1" />
                <Select value={formData.age_unit} onValueChange={(value) => handleChange('age_unit', value)}>
                  <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem key="DAYS" value="DAYS">Days</SelectItem>
                  <SelectItem key="MONTHS" value="MONTHS">Months</SelectItem>
                  <SelectItem key="YRS" value="YRS">Years</SelectItem>
                </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Gender <span className="text-destructive">*</span></Label>
              <Select value={formData.gender} onValueChange={(value) => handleChange('gender', value)} required>
                <SelectTrigger><SelectValue placeholder="Select Gender" /></SelectTrigger>
                <SelectContent>
                  <SelectItem key="MALE" value="MALE">Male</SelectItem>
                  <SelectItem key="FEMALE" value="FEMALE">Female</SelectItem>
                  <SelectItem key="OTHER/NA" value="OTHER/NA">Other/NA</SelectItem>
                  <SelectItem key="Not Available" value="Not Available">Not Available</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>ID Card Type <span className="text-destructive">*</span></Label>
              <Select value={formData.id_card_type} onValueChange={(value) => handleChange('id_card_type', value)} required>
                <SelectTrigger><SelectValue placeholder="Select ID Card Type" /></SelectTrigger>
                <SelectContent>
                  <SelectItem key="AADHAR CARD" value="AADHAR CARD">Aadhar Card</SelectItem>
                  <SelectItem key="VOTERS ID CARD" value="VOTERS ID CARD">Voters ID Card</SelectItem>
                  <SelectItem key="PASSPORT" value="PASSPORT">Passport</SelectItem>
                  <SelectItem key="PAN CARD" value="PAN CARD">PAN Card</SelectItem>
                  <SelectItem key="RATION CARD" value="RATION CARD">Ration Card</SelectItem>
                  <SelectItem key="EMPLOYEE ID CARD" value="EMPLOYEE ID CARD">Employee ID Card</SelectItem>
                  <SelectItem key="Driving License" value="Driving License">Driving License</SelectItem>
                  <SelectItem key="Other" value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="id_card_number">ID Card Number</Label>
              <Input id="id_card_number" value={formData.id_card_number} onChange={(e) => handleChange('id_card_number', e.target.value)} placeholder="Enter ID card number" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="patient_contact_number">Contact Number</Label>
              <Input id="patient_contact_number" type="tel" value={formData.patient_contact_number} onChange={(e) => handleChange('patient_contact_number', e.target.value)} placeholder="+91-XXXXXXXXXX" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="patient_email_id">Email ID</Label>
              <Input id="patient_email_id" type="email" value={formData.patient_email_id} onChange={(e) => handleChange('patient_email_id', e.target.value)} placeholder="patient@example.com" />
            </div>

            <div className="space-y-2">
              <Label>Beneficiary Type <span className="text-destructive">*</span></Label>
              <Select value={formData.beneficiary_type} onValueChange={(value) => handleChange('beneficiary_type', value)} required>
                <SelectTrigger><SelectValue placeholder="Select Beneficiary Type" /></SelectTrigger>
                <SelectContent>
                  <SelectItem key="SELF" value="SELF">Self</SelectItem>
                  <SelectItem key="DEPENDANT" value="DEPENDANT">Dependant</SelectItem>
                  <SelectItem key="SELF (Individual Policy)" value="SELF (Individual Policy)">Self (Individual Policy)</SelectItem>
                  <SelectItem key="Not Available" value="Not Available">Not Available</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Relationship <span className="text-destructive">*</span></Label>
              <Select value={formData.relationship} onValueChange={(value) => handleChange('relationship', value)} required disabled={!formData.beneficiary_type}>
                <SelectTrigger><SelectValue placeholder="Select Relationship" /></SelectTrigger>
                <SelectContent>
                  {getRelationshipOptions().map((rel) => (
                    <SelectItem key={rel} value={rel}>{rel}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {!formData.beneficiary_type && <p className="text-sm text-muted-foreground">Select beneficiary type first</p>}
            </div>
          </CardContent>
        </Card>

        {/* Payer Details */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <CreditCard className="h-4 w-4" />
              </div>
              <div>
                <CardTitle>Payer Details</CardTitle>
                <CardDescription>Insurance and payer information</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="payer_patient_id">Payer Patient ID <span className="text-destructive">*</span></Label>
              <Input id="payer_patient_id" value={formData.payer_patient_id} onChange={(e) => handleChange('payer_patient_id', e.target.value)} required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="authorization_number">Authorization Number <span className="text-destructive">*</span></Label>
              <Input id="authorization_number" value={formData.authorization_number} onChange={(e) => handleChange('authorization_number', e.target.value)} required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="total_authorized_amount">Total Authorized Amount <span className="text-destructive">*</span></Label>
              <Input id="total_authorized_amount" type="number" step="0.01" value={formData.total_authorized_amount} onChange={(e) => handleChange('total_authorized_amount', e.target.value)} required />
            </div>

            <div className="space-y-2">
              <Label>Payer Type <span className="text-destructive">*</span></Label>
              <Select value={formData.payer_type} onValueChange={(value) => handleChange('payer_type', value)} required>
                <SelectTrigger><SelectValue placeholder="Select Payer Type" /></SelectTrigger>
                <SelectContent>
                  <SelectItem key="INSURANCE COMPANY" value="INSURANCE COMPANY">Insurance Company</SelectItem>
                  <SelectItem key="CORPORATE" value="CORPORATE">Corporate</SelectItem>
                  <SelectItem key="TPA" value="TPA">TPA</SelectItem>
                  <SelectItem key="STATE GOVERNMENT" value="STATE GOVERNMENT">State Government</SelectItem>
                  <SelectItem key="CENTRAL GOVERNMENT" value="CENTRAL GOVERNMENT">Central Government</SelectItem>
                  <SelectItem key="INTERNATIONAL" value="INTERNATIONAL">International</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Payer Name <span className="text-destructive">*</span></Label>
              <Select value={formData.payer_name} onValueChange={(value) => handleChange('payer_name', value)} required disabled={loadingData || !formData.payer_type}>
                <SelectTrigger><SelectValue placeholder={!formData.payer_type ? "Select payer type first" : loadingData ? "Loading payers..." : "Select Payer"} /></SelectTrigger>
                <SelectContent>
                  {payers
                    .filter(p => {
                      if (!formData.payer_type) return true
                      // Match payer type (case-insensitive)
                      const payerType = p.payer_type?.toUpperCase() || ''
                      const selectedType = formData.payer_type.toUpperCase()
                      return payerType === selectedType || payerType.includes(selectedType)
                    })
                    .map((payer, index) => (
                      <SelectItem key={`${payer.payer_id}-${index}`} value={payer.payer_name || payer.payer_id}>{payer.payer_name || payer.payer_id}</SelectItem>
                    ))}
                </SelectContent>
              </Select>
              {!formData.payer_type && <p className="text-sm text-muted-foreground">Select payer type first</p>}
            </div>

            {/* Insurer Name - ONLY show when Payer Type is TPA */}
            {formData.payer_type === 'TPA' && (
              <div className="space-y-2">
                <Label>Insurer Name <span className="text-destructive">*</span></Label>
                <Select 
                  value={formData.insurer_name} 
                  onValueChange={(value) => handleChange('insurer_name', value)} 
                  required 
                  disabled={loadingData}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={loadingData ? "Loading insurers..." : "Select Insurer"} />
                  </SelectTrigger>
                  <SelectContent>
                    {insurers.map((insurer, index) => (
                      <SelectItem key={`${insurer.insurer_id}-${index}`} value={insurer.insurer_name}>{insurer.insurer_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-destructive">Required for TPA payer type</p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="policy_number">Policy Number</Label>
              <Input id="policy_number" value={formData.policy_number} onChange={(e) => handleChange('policy_number', e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="sponsorer_corporate_name">Corporate Name</Label>
              <Input id="sponsorer_corporate_name" value={formData.sponsorer_corporate_name} onChange={(e) => handleChange('sponsorer_corporate_name', e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="sponsorer_employee_id">Employee ID</Label>
              <Input id="sponsorer_employee_id" value={formData.sponsorer_employee_id} onChange={(e) => handleChange('sponsorer_employee_id', e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="sponsorer_employee_name">Employee Name</Label>
              <Input id="sponsorer_employee_name" value={formData.sponsorer_employee_name} onChange={(e) => handleChange('sponsorer_employee_name', e.target.value)} />
            </div>
          </CardContent>
        </Card>

        {/* Provider Details */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <Hospital className="h-4 w-4" />
              </div>
              <div>
                <CardTitle>Provider Details</CardTitle>
                <CardDescription>Treatment and admission information</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="patient_registration_number">Registration Number <span className="text-destructive">*</span></Label>
              <Input id="patient_registration_number" value={formData.patient_registration_number} onChange={(e) => handleChange('patient_registration_number', e.target.value)} required />
            </div>

            <div className="space-y-2">
              <Label>Specialty <span className="text-destructive">*</span></Label>
              <Select value={formData.specialty} onValueChange={(value) => handleChange('specialty', value)} required disabled={loadingData}>
                <SelectTrigger><SelectValue placeholder={loadingData ? "Loading specialties..." : "Select Specialty"} /></SelectTrigger>
                <SelectContent>
                  {specialties.map((spec, index) => (
                    <SelectItem key={`${spec.specialty_id}-${index}`} value={spec.specialty_name}>{spec.specialty_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Doctor <span className="text-destructive">*</span></Label>
              <Select value={formData.doctor} onValueChange={(value) => handleChange('doctor', value)} required disabled={!formData.specialty || doctors.length === 0}>
                <SelectTrigger><SelectValue placeholder={!formData.specialty ? "Select specialty first" : doctors.length === 0 ? "No doctors available" : "Select Doctor"} /></SelectTrigger>
                <SelectContent>
                  {doctors.map((doc, index) => (
                    <SelectItem key={`${doc.doctor_id}-${index}`} value={doc.doctor_name}>{doc.doctor_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {!formData.specialty && <p className="text-sm text-muted-foreground">Select specialty first</p>}
            </div>

            <div className="space-y-2">
              <Label>Treatment Line <span className="text-destructive">*</span></Label>
              <Select value={formData.treatment_line} onValueChange={(value) => handleChange('treatment_line', value)} required>
                <SelectTrigger><SelectValue placeholder="Select Treatment Line" /></SelectTrigger>
                <SelectContent>
                  <SelectItem key="MEDICAL" value="MEDICAL">Medical</SelectItem>
                  <SelectItem key="SURGICAL" value="SURGICAL">Surgical</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Claim Type <span className="text-destructive">*</span></Label>
              <Select value={formData.claim_type} onValueChange={(value) => handleChange('claim_type', value)} required>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem key="INPATIENT" value="INPATIENT">Inpatient</SelectItem>
                  <SelectItem key="DIALYSIS" value="DIALYSIS">Dialysis</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="service_start_date">Service Start Date <span className="text-destructive">*</span></Label>
              <Input id="service_start_date" type="date" value={formData.service_start_date} onChange={(e) => handleChange('service_start_date', e.target.value)} required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="service_end_date">Service End Date <span className="text-destructive">*</span></Label>
              <Input id="service_end_date" type="date" value={formData.service_end_date} onChange={(e) => handleChange('service_end_date', e.target.value)} required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="inpatient_number">InPatient Number <span className="text-destructive">*</span></Label>
              <Input id="inpatient_number" value={formData.inpatient_number} onChange={(e) => handleChange('inpatient_number', e.target.value)} required />
            </div>

            <div className="space-y-2">
              <Label>Admission Type <span className="text-destructive">*</span></Label>
              <Select value={formData.admission_type} onValueChange={(value) => handleChange('admission_type', value)} required>
                <SelectTrigger><SelectValue placeholder="Select Admission Type" /></SelectTrigger>
                <SelectContent>
                  <SelectItem key="PLANNED" value="PLANNED">Planned</SelectItem>
                  <SelectItem key="EMERGENCY" value="EMERGENCY">Emergency</SelectItem>
                  <SelectItem key="CASHLESS" value="CASHLESS">Cashless</SelectItem>
                  <SelectItem key="REIMBURSEMENT" value="REIMBURSEMENT">Reimbursement</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Hospitalization Type <span className="text-destructive">*</span></Label>
              <Select value={formData.hospitalization_type} onValueChange={(value) => handleChange('hospitalization_type', value)} required>
                <SelectTrigger><SelectValue placeholder="Select Type" /></SelectTrigger>
                <SelectContent>
                  <SelectItem key="DAYCARE" value="DAYCARE">Daycare</SelectItem>
                  <SelectItem key="NON DAYCARE" value="NON DAYCARE">Non Daycare</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Ward Type <span className="text-destructive">*</span></Label>
              <Select value={formData.ward_type} onValueChange={(value) => handleChange('ward_type', value)} required disabled={loadingData}>
                <SelectTrigger><SelectValue placeholder={loadingData ? "Loading wards..." : "Select Ward Type"} /></SelectTrigger>
                <SelectContent>
                  {wards.map((ward, index) => (
                    <SelectItem key={`${ward.ward_type_id}-${index}`} value={ward.ward_type_name}>{ward.ward_type_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="final_diagnosis">Final Diagnosis <span className="text-destructive">*</span></Label>
              <Input id="final_diagnosis" value={formData.final_diagnosis} onChange={(e) => handleChange('final_diagnosis', e.target.value)} required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="icd_10_code">ICD 10 Code</Label>
              <Input id="icd_10_code" value={formData.icd_10_code} onChange={(e) => handleChange('icd_10_code', e.target.value)} placeholder="e.g., I21.9" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="treatment_done">Treatment Done <span className="text-destructive">*</span></Label>
              <Input id="treatment_done" value={formData.treatment_done} onChange={(e) => handleChange('treatment_done', e.target.value)} required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="pcs_code">PCS Code</Label>
              <Input id="pcs_code" value={formData.pcs_code} onChange={(e) => handleChange('pcs_code', e.target.value)} />
            </div>
          </CardContent>
        </Card>

        {/* Bill Details */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <DollarSign className="h-4 w-4" />
              </div>
              <div>
                <CardTitle>Bill Details</CardTitle>
                <CardDescription>Billing and payment information</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="bill_number">Bill Number <span className="text-destructive">*</span></Label>
              <Input id="bill_number" value={formData.bill_number} onChange={(e) => handleChange('bill_number', e.target.value)} required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bill_date">Bill Date <span className="text-destructive">*</span></Label>
              <Input id="bill_date" type="date" value={formData.bill_date} onChange={(e) => handleChange('bill_date', e.target.value)} required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="security_deposit">Security Deposit</Label>
              <Input id="security_deposit" type="number" step="0.01" value={formData.security_deposit} onChange={(e) => handleChange('security_deposit', e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="total_bill_amount">Total Bill Amount <span className="text-destructive">*</span></Label>
              <Input id="total_bill_amount" type="number" step="0.01" value={formData.total_bill_amount} onChange={(e) => handleChange('total_bill_amount', e.target.value)} required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="patient_discount_amount">Patient Discount</Label>
              <Input id="patient_discount_amount" type="number" step="0.01" value={formData.patient_discount_amount} onChange={(e) => handleChange('patient_discount_amount', e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount_paid_by_patient">Amount Paid By Patient</Label>
              <Input id="amount_paid_by_patient" type="number" step="0.01" value={formData.amount_paid_by_patient} onChange={(e) => handleChange('amount_paid_by_patient', e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="total_patient_paid_amount">Total Patient Paid</Label>
              <Input 
                id="total_patient_paid_amount" 
                type="number" 
                step="0.01" 
                value={formData.total_patient_paid_amount} 
                onChange={(e) => handleChange('total_patient_paid_amount', e.target.value)}
              />
              <p className="text-xs text-muted-foreground">Suggested: = Patient Discount + Amount Paid By Patient</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount_charged_to_payer">Amount Charged to Payer</Label>
              <Input 
                id="amount_charged_to_payer" 
                type="number" 
                step="0.01" 
                value={formData.amount_charged_to_payer} 
                onChange={(e) => handleChange('amount_charged_to_payer', e.target.value)}
              />
              <p className="text-xs text-muted-foreground">Suggested: = Total Bill Amount - Total Patient Paid</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="mou_discount_amount">MOU Discount</Label>
              <Input id="mou_discount_amount" type="number" step="0.01" value={formData.mou_discount_amount} onChange={(e) => handleChange('mou_discount_amount', e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="claimed_amount">Claimed Amount <span className="text-destructive">*</span></Label>
              <Input 
                id="claimed_amount" 
                type="number" 
                step="0.01" 
                value={formData.claimed_amount} 
                readOnly 
                disabled
                className="bg-muted/50 cursor-not-allowed"
              />
              <p className="text-xs text-muted-foreground">Auto-calculated: = Amount Charged to Payer - MOU Discount</p>
            </div>

            <div className="space-y-2 col-span-full">
              <Label htmlFor="submission_remarks">Submission Remarks</Label>
              <Textarea id="submission_remarks" value={formData.submission_remarks} onChange={(e) => handleChange('submission_remarks', e.target.value)} rows={4} placeholder="Enter any additional remarks..." />
            </div>
          </CardContent>
        </Card>

        {/* Document Checklist */}
        {showDocumentChecklist && formData.payer_name && (
          <DocumentChecklist
            key={`${formData.payer_name}-${formData.specialty || 'no-specialty'}`}
            payerName={formData.payer_name}
            specialty={formData.specialty || ''}
            onChecklistComplete={setChecklistComplete}
            onDocumentsUploaded={setUploadedDocuments}
          />
        )}

        {/* Attached Documents Display */}
        {formData.documents && formData.documents.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                📄 Attached Documents ({formData.documents.length})
              </CardTitle>
              <CardDescription>
                Documents that were previously uploaded and saved with this draft
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {formData.documents.map((doc: any, index: number) => (
                  <div key={doc.document_id || index} className="border rounded-lg p-4 bg-gray-50">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <h4 className="font-medium text-sm">{doc.document_name}</h4>
                        <p className="text-xs text-gray-500 capitalize">
                          {doc.document_type?.replace('_', ' ')}
                        </p>
                      </div>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        doc.status === 'uploaded' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {doc.status}
                      </span>
                    </div>
                    <div className="text-xs text-gray-400 mb-3">
                      ID: {doc.document_id}
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full"
                      onClick={() => {
                        if (doc.download_url) {
                          window.open(doc.download_url, '_blank')
                        } else {
                          toast.error('Download URL not available. Please refresh the page to get a fresh URL.')
                        }
                      }}
                    >
                      📥 View Document
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <div className="flex justify-end gap-4">
          <Button type="button" variant="outline" onClick={() => setFormData(initialFormData)}>Reset</Button>
          <Button 
            type="button" 
            variant="secondary" 
            onClick={handleSaveDraft} 
            disabled={loading || !formData.patient_name}
            className={loading ? 'opacity-50 cursor-not-allowed' : ''}
          >
            {loading ? (isEditingDraft ? 'Updating...' : 'Saving...') : (isEditingDraft ? 'Update Draft' : 'Save Draft')}
          </Button>
          <Button 
            type="submit" 
            disabled={loading || (showDocumentChecklist && !checklistComplete)} 
            className="min-w-[150px]"
          >
            {loading ? 'Submitting...' : 'Submit Claim'}
          </Button>
        </div>
      </form>
    </div>
  )
}
