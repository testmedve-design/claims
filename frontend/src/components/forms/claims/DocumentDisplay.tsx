'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { FileText } from 'lucide-react'
import { toast } from '@/hooks/use-toast'

interface DocumentDisplayProps {
  documents: any[]
}

export function DocumentDisplay({ documents }: DocumentDisplayProps) {
  if (!documents || documents.length === 0) {
    return null
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          📄 Attached Documents ({documents.length})
        </CardTitle>
        <CardDescription>
          Documents that were previously uploaded and saved with this draft
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {documents.map((doc: any, index: number) => (
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
                    toast({
                      title: "Error",
                      description: "Download URL not available. Please refresh the page to get a fresh URL.",
                      variant: "destructive"
                    })
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
  )
}