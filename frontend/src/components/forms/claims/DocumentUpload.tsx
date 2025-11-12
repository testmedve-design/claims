'use client'

import { useCallback, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { FileText, Upload, X, CheckCircle2, AlertCircle } from 'lucide-react'
import { toast } from '@/hooks/use-toast'

interface DocumentUploadProps {
  payerName?: string
  specialty?: string
  onDocumentsUploaded?: (documents: any[]) => void
}

// Dummy document types that might be required
const DOCUMENT_TYPES = [
  { id: 'insurance_card', name: 'Insurance Card', required: true, description: 'Front and back of insurance card' },
  { id: 'patient_id', name: 'Patient ID', required: true, description: 'Aadhar, Passport, or Voter ID' },
  { id: 'medical_reports', name: 'Medical Reports', required: true, description: 'Diagnosis and treatment reports' },
  { id: 'lab_reports', name: 'Lab Reports', required: false, description: 'Blood test, X-ray, or scan reports' },
  { id: 'discharge_summary', name: 'Discharge Summary', required: true, description: 'Hospital discharge document' },
  { id: 'prescription', name: 'Prescription', required: false, description: 'Doctor prescribed medications' },
  { id: 'authorization_letter', name: 'Authorization Letter', required: true, description: 'Pre-auth or approval letter' },
  { id: 'bill_copy', name: 'Bill Copy', required: true, description: 'Itemized hospital bill' },
]

export function DocumentUpload({ payerName, specialty, onDocumentsUploaded }: DocumentUploadProps) {
  const MAX_FILE_SIZE_MB = 25
  const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024

  const formatFileSize = useCallback((bytes: number) => {
    if (bytes >= 1024 * 1024) {
      return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
    }
    if (bytes >= 1024) {
      return `${(bytes / 1024).toFixed(2)} KB`
    }
    return `${bytes} B`
  }, [])

  const loadImage = useCallback((file: File): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const imageUrl = URL.createObjectURL(file)
      const img = new Image()
      img.onload = () => {
        URL.revokeObjectURL(imageUrl)
        resolve(img)
      }
      img.onerror = (error) => {
        URL.revokeObjectURL(imageUrl)
        reject(error)
      }
      img.src = imageUrl
    })
  }, [])

  const canvasToBlob = useCallback(
    (canvas: HTMLCanvasElement, quality: number) =>
      new Promise<Blob | null>((resolve) => {
        canvas.toBlob((blob) => resolve(blob), 'image/jpeg', quality)
      }),
    []
  )

  const compressImageFile = useCallback(
    async (file: File): Promise<File | null> => {
      try {
        const image = await loadImage(file)
        const canvas = document.createElement('canvas')
        const MAX_DIMENSION = 2560
        let { width, height } = image

        const ratio = Math.min(1, MAX_DIMENSION / Math.max(width, height))
        width = Math.floor(width * ratio)
        height = Math.floor(height * ratio)

        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        if (!ctx) return file
        ctx.drawImage(image, 0, 0, width, height)

        let quality = 0.8
        let blob = await canvasToBlob(canvas, quality)

        while (blob && blob.size > MAX_FILE_SIZE_BYTES && quality > 0.3) {
          quality -= 0.1
          blob = await canvasToBlob(canvas, quality)
        }

        if (!blob) {
          return file
        }

        if (blob.size >= file.size) {
          return file
        }

        const newFileName = file.name.replace(/\.(png|webp|gif|bmp)$/i, '.jpg')
        return new File([blob], newFileName, {
          type: 'image/jpeg',
          lastModified: Date.now()
        })
      } catch (error) {
        console.error('Image compression failed:', error)
        return file
      }
    },
    [MAX_FILE_SIZE_BYTES, canvasToBlob, loadImage]
  )

  const prepareFileForUpload = useCallback(
    async (file: File): Promise<File | null> => {
      if (file.size <= MAX_FILE_SIZE_BYTES) {
        return file
      }

      if (file.type.startsWith('image/')) {
        const compressed = await compressImageFile(file)
        if (compressed.size <= MAX_FILE_SIZE_BYTES) {
          toast({
            title: 'Image compressed',
            description: `${file.name} was reduced to ${formatFileSize(compressed.size)} to meet the 25 MB limit.`
          })
          return compressed
        }

        toast({
          title: 'Image too large',
          description: `${file.name} is still larger than ${MAX_FILE_SIZE_MB} MB even after compression. Please compress manually and retry.`,
          variant: 'destructive'
        })
        return null
      }

      toast({
        title: 'File too large',
        description: `${file.name} exceeds the ${MAX_FILE_SIZE_MB} MB limit. Please compress it before uploading.`,
        variant: 'destructive'
      })
      return null
    },
    [MAX_FILE_SIZE_BYTES, MAX_FILE_SIZE_MB, compressImageFile, formatFileSize]
  )

  const [uploadedDocuments, setUploadedDocuments] = useState<any[]>([
    {
      id: '1',
      document_type: 'insurance_card',
      document_name: 'Insurance_Card_Sample.pdf',
      status: 'uploaded',
      file_size: '2.4 MB',
      uploaded_at: new Date(Date.now() - 3600000).toLocaleDateString(),
      download_url: '#'
    },
    {
      id: '2',
      document_type: 'patient_id',
      document_name: 'Patient_ID_Proof.pdf',
      status: 'uploaded',
      file_size: '1.8 MB',
      uploaded_at: new Date(Date.now() - 7200000).toLocaleDateString(),
      download_url: '#'
    },
    {
      id: '3',
      document_type: 'medical_reports',
      document_name: 'Medical_Report_Oct_2024.pdf',
      status: 'uploaded',
      file_size: '3.2 MB',
      uploaded_at: new Date(Date.now() - 86400000).toLocaleDateString(),
      download_url: '#'
    }
  ])

  const [selectedDocType, setSelectedDocType] = useState<string>('')
  const [dragActive, setDragActive] = useState(false)

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (!selectedDocType) {
      toast({
        title: 'Please select document type',
        description: 'Choose what type of document you are uploading before dropping files',
        variant: 'destructive'
      })
      return
    }

    const files = e.dataTransfer.files
    if (files && files.length > 0) {
      void handleFiles(files)
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedDocType) {
      toast({
        title: 'Please select document type',
        description: 'Choose what type of document you are uploading',
        variant: 'destructive'
      })
      e.currentTarget.value = ''
      return
    }

    const files = e.currentTarget.files
    if (files) {
      void handleFiles(files)
    }
  }

  const handleFiles = async (files: FileList) => {
    const fileArray = Array.from(files)
    const docTypeInfo = DOCUMENT_TYPES.find((t) => t.id === selectedDocType)

    // Check for duplicate document type
    const alreadyExists = uploadedDocuments.some(
      (doc) => doc.document_type === selectedDocType && doc.status === 'uploaded'
    )

    if (alreadyExists) {
      toast({
        title: 'Document Already Exists',
        description: `You've already uploaded a ${docTypeInfo?.name}. Replace the existing one?`,
        variant: 'destructive'
      })
      return
    }

    for (const file of fileArray) {
      const preparedFile = await prepareFileForUpload(file)
      if (!preparedFile) {
        continue
      }

      const newDoc = {
        id: Date.now().toString() + Math.random(),
        document_type: selectedDocType,
        document_name: preparedFile.name,
        status: 'uploading',
        file_size: formatFileSize(preparedFile.size),
        uploaded_at: new Date().toLocaleDateString(),
        file: preparedFile
      }

      setUploadedDocuments((prev) => [...prev, newDoc])

      // Simulate upload delay
      setTimeout(() => {
        setUploadedDocuments((prev) => {
          const updated = prev.map((doc) =>
            doc.id === newDoc.id ? { ...doc, status: 'uploaded', file: preparedFile } : doc
          )
          onDocumentsUploaded?.(updated.filter((doc) => doc.status === 'uploaded'))
          return updated
        })

        toast({
          title: 'Success',
          description: `${preparedFile.name} uploaded as ${docTypeInfo?.name}`
        })
      }, 1000)
    }

    // Reset form
    setSelectedDocType('')
  }

  const removeDocument = (id: string) => {
    setUploadedDocuments((prev) => {
      const updated = prev.filter((doc) => doc.id !== id)
      onDocumentsUploaded?.(updated.filter((doc) => doc.status === 'uploaded'))
      return updated
    })
    toast({
      title: 'Document Removed',
      description: 'The document has been removed from the upload list'
    })
  }

  const getDocumentName = (typeId: string) => {
    return DOCUMENT_TYPES.find((t) => t.id === typeId)?.name || typeId
  }

  const getDocumentDescription = (typeId: string) => {
    return DOCUMENT_TYPES.find((t) => t.id === typeId)?.description || ''
  }

  const isDocumentTypeRequired = (typeId: string) => {
    return DOCUMENT_TYPES.find((t) => t.id === typeId)?.required || false
  }

  const getMissingRequiredDocuments = () => {
    return DOCUMENT_TYPES.filter((docType) => {
      if (!docType.required) return false
      return !uploadedDocuments.some((doc) => doc.document_type === docType.id && doc.status === 'uploaded')
    })
  }

  const missingDocs = getMissingRequiredDocuments()

  return (
    <div className="space-y-6">
      {/* Document Type Selector + Upload Area */}
      <Card className="border-0 shadow-sm">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left: Document Type Selector */}
            <div className="lg:col-span-1 space-y-4">
              <div>
                <label className="text-sm font-semibold text-gray-900 mb-3 block">
                  Select Document Type *
                </label>
                <Select value={selectedDocType} onValueChange={setSelectedDocType}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Choose document..." />
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px]">
                    {DOCUMENT_TYPES.map((docType) => (
                      <SelectItem key={docType.id} value={docType.id}>
                        <div className="flex items-center gap-2">
                          <span>{docType.name}</span>
                          {docType.required && <span className="text-red-500">*</span>}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Selected Document Info */}
              {selectedDocType && (
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="font-semibold text-gray-900 text-sm mb-2">
                    {getDocumentName(selectedDocType)}
                  </p>
                  <p className="text-xs text-gray-600 mb-3">
                    {getDocumentDescription(selectedDocType)}
                  </p>
                  {isDocumentTypeRequired(selectedDocType) && (
                    <Badge className="bg-red-100 text-red-800">Required</Badge>
                  )}
                </div>
              )}
            </div>

            {/* Right: Upload Area */}
            <div className="lg:col-span-2">
              <div
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                className={`relative rounded-lg border-2 border-dashed p-12 text-center transition-colors ${
                  dragActive ? 'border-primary/60 bg-primary/5' : 'border-gray-300'
                } ${!selectedDocType ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <input
                  type="file"
                  id="file-upload"
                  multiple
                  onChange={handleFileSelect}
                  className="hidden"
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                  disabled={!selectedDocType}
                />
                <label htmlFor="file-upload" className={`${!selectedDocType ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
                  <div className="flex flex-col items-center gap-3">
                    <Upload className="h-12 w-12 text-gray-400" />
                    <div>
                      <p className="font-semibold text-gray-700">
                        {selectedDocType ? 'Drag file here or click to upload' : 'Select document type first'}
                      </p>
                      <p className="text-sm text-gray-500">
                        PDF, DOC, DOCX, JPG, PNG (Max 25 MB – images auto-compress)
                      </p>
                    </div>
                  </div>
                </label>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Missing Required Documents Alert */}
      {missingDocs.length > 0 && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="pt-6">
            <div className="flex gap-3">
              <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-amber-900 mb-2">Missing Required Documents ({missingDocs.length})</h4>
                <div className="flex flex-wrap gap-2">
                  {missingDocs.map((doc) => (
                    <Badge key={doc.id} variant="secondary" className="bg-amber-100 text-amber-800">
                      {doc.name}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Uploaded Documents List */}
      {uploadedDocuments.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Uploaded Documents
                </CardTitle>
                <CardDescription>
                  {payerName && `Payer: ${payerName}`}
                  {payerName && specialty && ' • '}
                  {specialty && `Specialty: ${specialty}`}
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                  Total: {uploadedDocuments.length}
                </Badge>
                <Badge variant="secondary" className="bg-green-100 text-green-800">
                  Uploaded: {uploadedDocuments.filter((d) => d.status === 'uploaded').length}
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {uploadedDocuments.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-4 flex-1">
                    <div className={`p-2 rounded-lg ${
                      doc.status === 'uploaded' ? 'bg-green-100' : 'bg-blue-100'
                    }`}>
                      <FileText className={`h-5 w-5 ${
                        doc.status === 'uploaded' ? 'text-green-600' : 'text-blue-600'
                      }`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm truncate">{doc.document_name}</p>
                        {isDocumentTypeRequired(doc.document_type) && (
                          <Badge variant="outline" className="text-red-600 border-red-200">
                            Required
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                        <span className="font-medium text-gray-700">{getDocumentName(doc.document_type)}</span>
                        <span>•</span>
                        <span>{doc.file_size}</span>
                        <span>•</span>
                        <span>{doc.uploaded_at}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    {doc.status === 'uploading' ? (
                      <div className="flex items-center gap-2">
                        <div className="animate-spin">
                          <Upload className="h-4 w-4 text-blue-600" />
                        </div>
                        <span className="text-xs text-blue-600 font-medium">Uploading...</span>
                      </div>
                    ) : (
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeDocument(doc.id)}
                      className="text-gray-500 hover:text-red-600"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Document Requirements Guide */}
      <Card className="bg-blue-50 border-blue-100">
        <CardHeader>
          <CardTitle className="text-lg">Document Requirements Guide</CardTitle>
          <CardDescription>Reference for all required and optional documents</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {DOCUMENT_TYPES.map((docType) => (
              <div
                key={docType.id}
                className={`p-3 rounded-lg border ${
                  docType.required
                    ? 'bg-white border-blue-200'
                    : 'bg-gray-50 border-gray-200'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                    docType.required ? 'bg-red-500' : 'bg-gray-400'
                  }`}></div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{docType.name}</span>
                      {docType.required && <span className="text-red-500 text-xs">Required</span>}
                    </div>
                    <p className="text-xs text-gray-600 mt-1">{docType.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
