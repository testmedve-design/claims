'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { FileText, Upload, CheckCircle, AlertCircle, X } from 'lucide-react'
import { toast } from 'sonner'

interface DocumentItem {
  id: string
  name: string
  required: boolean
  description: string
}

interface DocumentChecklistProps {
  payerName: string
  specialty: string
  onChecklistComplete: (isComplete: boolean) => void
  onDocumentsUploaded: (documents: any[]) => void
}

export default function DocumentChecklist({
  payerName,
  specialty,
  onChecklistComplete,
  onDocumentsUploaded
}: DocumentChecklistProps) {
  const [checklist, setChecklist] = useState<DocumentItem[]>([])
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set())
  const [uploadedDocuments, setUploadedDocuments] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [checklistLoading, setChecklistLoading] = useState(false)

  useEffect(() => {
    if (payerName) {
      console.log('DocumentChecklist: Payer changed to:', payerName, 'Specialty:', specialty)
      // Reset checklist state when payer changes
      setChecklist([])
      setCheckedItems(new Set())
      setUploadedDocuments([])
      fetchChecklist()
    }
  }, [payerName, specialty])

  useEffect(() => {
    // Check if all required documents are checked
    const requiredItems = checklist.filter(item => item.required)
    const checkedRequiredItems = requiredItems.filter(item => checkedItems.has(item.id))
    const isComplete = requiredItems.length > 0 && checkedRequiredItems.length === requiredItems.length
    
    onChecklistComplete(isComplete)
  }, [checklist, checkedItems, onChecklistComplete])

  const fetchChecklist = async () => {
    try {
      setChecklistLoading(true)
      // Build URL with payer_name and optional specialty
      let url = `http://localhost:5002/api/new-claim/checklist/get-checklist?payer_name=${encodeURIComponent(payerName)}`
      if (specialty) {
        url += `&specialty=${encodeURIComponent(specialty)}`
      }
      
      console.log('DocumentChecklist: Fetching checklist for URL:', url)
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Authentication required. Please log in to access document checklist.')
        }
        throw new Error('Failed to fetch checklist')
      }

      const data = await response.json()
      console.log('DocumentChecklist: API response for', payerName, ':', data)
      
      if (data.success && data.checklist) {
        // Normalize checklist items to ensure they have proper id fields
        const normalizedChecklist = data.checklist.map((item: any, index: number) => ({
          id: item.id || item.name || `item-${index}`,
          name: item.name || 'Unknown Document',
          required: item.required !== undefined ? item.required : (item.type === 'required'),
          description: item.description || '',
          order: item.order || index + 1
        }))
        console.log('DocumentChecklist: Setting checklist for', payerName, ':', normalizedChecklist)
        setChecklist(normalizedChecklist)
      } else {
        // No checklist found for this payer
        console.log('DocumentChecklist: No checklist found for', payerName, '- clearing checklist')
        setChecklist([])
        if (data.message) {
          console.log('Checklist info:', data.message)
        }
      }
    } catch (error) {
      console.error('Error fetching checklist:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch document checklist'
      toast.error(errorMessage)
    } finally {
      setChecklistLoading(false)
    }
  }

  const handleCheckboxChange = (itemId: string, checked: boolean) => {
    const newCheckedItems = new Set(checkedItems)
    if (checked) {
      newCheckedItems.add(itemId)
    } else {
      newCheckedItems.delete(itemId)
    }
    setCheckedItems(newCheckedItems)
  }

  const handleFileUpload = async (itemId: string, file: File) => {
    try {
      setLoading(true)
      
      // Check if we're editing a draft (draft_id in URL)
      const urlParams = new URLSearchParams(window.location.search)
      const draftId = urlParams.get('draft_id')
      
      if (draftId) {
        // Upload document to draft immediately
        const formData = new FormData()
        formData.append('file', file)
        formData.append('document_type', itemId)
        formData.append('document_name', file.name)
        
        const response = await fetch(`http://localhost:5002/api/v1/drafts/upload-document/${draftId}`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
          },
          body: formData
        })
        
        if (response.ok) {
          const result = await response.json()
          const newDocument = {
            document_id: result.document_id,
            document_type: itemId,
            document_name: file.name,
            uploaded_at: new Date().toISOString(),
            status: 'uploaded',
            download_url: result.download_url
          }
          
          setUploadedDocuments(prev => [...prev, newDocument])
          onDocumentsUploaded([...uploadedDocuments, newDocument])
          
          // Auto-check the item when document is uploaded
          handleCheckboxChange(itemId, true)
          
          toast.success('Document uploaded successfully to draft')
        } else {
          throw new Error('Failed to upload document')
        }
      } else {
        // Store file locally for new claims - will be uploaded after claim creation
        const newDocument = {
          document_id: `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          document_type: itemId,
          document_name: file.name,
          file: file, // Store the actual file
          uploaded_at: new Date().toISOString(),
          status: 'pending_upload'
        }
        
        setUploadedDocuments(prev => [...prev, newDocument])
        onDocumentsUploaded([...uploadedDocuments, newDocument])
        
        // Auto-check the item when document is selected
        handleCheckboxChange(itemId, true)
        
        toast.success('Document selected successfully. It will be uploaded when you submit the claim.')
      }
    } catch (error) {
      console.error('Error uploading document:', error)
      toast.error('Failed to upload document')
    } finally {
      setLoading(false)
    }
  }

  const removeDocument = (itemId: string) => {
    const newUploadedDocuments = uploadedDocuments.filter(doc => doc.document_type !== itemId)
    setUploadedDocuments(newUploadedDocuments)
    onDocumentsUploaded(newUploadedDocuments)
    
    // Uncheck the item
    const newCheckedItems = new Set(checkedItems)
    newCheckedItems.delete(itemId)
    setCheckedItems(newCheckedItems)
    
    toast.success('Document removed')
  }

  const getItemStatus = (item: DocumentItem) => {
    const isChecked = checkedItems.has(item.id)
    const uploadedDoc = uploadedDocuments.find(doc => doc.document_type === item.id)
    
    if (uploadedDoc) {
      return { 
        status: 'uploaded', 
        icon: CheckCircle, 
        color: 'text-green-600',
        document: uploadedDoc
      }
    } else if (isChecked) {
      return { status: 'checked', icon: CheckCircle, color: 'text-blue-600' }
    } else if (item.required) {
      return { status: 'required', icon: AlertCircle, color: 'text-red-600' }
    } else {
      return { status: 'optional', icon: FileText, color: 'text-gray-600' }
    }
  }

  const getCompletionStatus = () => {
    const requiredItems = checklist.filter(item => item.required)
    const completedRequired = requiredItems.filter(item => checkedItems.has(item.id))
    
    if (requiredItems.length === 0) {
      return { percentage: 0, text: checklist.length === 0 ? 'No checklist found for this payer' : 'No requirements' }
    }
    
    const percentage = Math.round((completedRequired.length / requiredItems.length) * 100)
    return { percentage, text: `${completedRequired.length}/${requiredItems.length} required documents` }
  }

  if (checklistLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Document Checklist
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-4" />
              <p>Loading checklist...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  const completionStatus = getCompletionStatus()

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Document Checklist
        </CardTitle>
        <div className="flex items-center gap-4">
          <Badge variant={completionStatus.percentage === 100 ? 'default' : 'secondary'}>
            {completionStatus.percentage}% Complete
          </Badge>
          <span className="text-sm text-muted-foreground">
            {completionStatus.text}
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {checklist.length === 0 ? (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              No specific checklist found for {payerName}{specialty ? ` - ${specialty}` : ''}. 
              Please contact your administrator to set up document requirements for this payer.
            </AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-3">
            {checklist.map((item) => {
              const itemStatus = getItemStatus(item)
              const StatusIcon = itemStatus.icon
              
              return (
                <div key={item.id} className="flex items-start gap-3 p-3 border rounded-lg">
                  <Checkbox
                    id={item.id}
                    checked={checkedItems.has(item.id)}
                    onCheckedChange={(checked) => handleCheckboxChange(item.id, checked as boolean)}
                    disabled={loading}
                  />
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <label htmlFor={item.id} className="font-medium cursor-pointer">
                        {item.name}
                      </label>
                      <StatusIcon className={`h-4 w-4 ${itemStatus.color}`} />
                      {item.required && (
                        <Badge variant="destructive" className="text-xs">
                          Required
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">
                      {item.description}
                    </p>
                    
                    {/* File Upload Section */}
                    <div className="space-y-2">
                      {itemStatus.document ? (
                        <div className="flex items-center justify-between p-2 bg-green-50 border border-green-200 rounded-md">
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-green-600" />
                            <span className="text-sm font-medium text-green-800">
                              {itemStatus.document.document_name}
                            </span>
                            <Badge variant="outline" className="text-green-600 border-green-600 text-xs">
                              Selected
                            </Badge>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeDocument(item.id)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <input
                            type="file"
                            id={`file-${item.id}`}
                            accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx"
                            onChange={(e) => {
                              const file = e.target.files?.[0]
                              if (file) {
                                handleFileUpload(item.id, file)
                              }
                            }}
                            className="hidden"
                            disabled={loading}
                          />
                          <label
                            htmlFor={`file-${item.id}`}
                            className="inline-flex items-center gap-2 px-3 py-1 text-sm bg-primary/10 text-primary rounded-md hover:bg-primary/20 cursor-pointer transition-colors"
                          >
                            <Upload className="h-4 w-4" />
                            Select Document
                          </label>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
        
        {completionStatus.percentage === 100 && (
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              All required documents have been checked. You can now submit the claim.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  )
}
