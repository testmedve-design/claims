'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table'
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { 
  FileText, 
  Edit, 
  Trash2, 
  Send, 
  MoreHorizontal,
  Search,
  Plus,
  Calendar,
  DollarSign,
  User,
  Filter,
  Clock,
  CheckCircle,
  XCircle,
  Eye
} from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'
import { API_BASE_URL } from '@/lib/apiConfig'

interface Draft {
  draft_id: string
  status: string
  created_at: string
  updated_at: string
  patient_name: string
  claimed_amount: string
  specialty: string
}

export default function DraftsPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [drafts, setDrafts] = useState<Draft[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  // Check if user has access to drafts page
  useEffect(() => {
    if (user && user.role === 'claim_processor') {
      router.push('/processor-inbox') // Redirect claim processors to their inbox
    }
  }, [user, router])

  useEffect(() => {
    if (user) {
      fetchDrafts()
    }
  }, [user])

  const fetchDrafts = async () => {
    try {
      setLoading(true)
      const response = await fetch(`${API_BASE_URL}/v1/drafts/get-drafts`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      })

      if (!response.ok) {
        throw new Error('Failed to fetch drafts')
      }

      const data = await response.json()
      setDrafts(data.drafts || [])
    } catch (error) {
      console.error('Error fetching drafts:', error)
      toast.error('Failed to fetch drafts')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteDraft = async (draftId: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/v1/drafts/delete-draft/${draftId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error('Failed to delete draft')
      }

      toast.success('Draft deleted successfully')
      fetchDrafts() // Refresh the list
    } catch (error) {
      console.error('Error deleting draft:', error)
      toast.error('Failed to delete draft')
    }
  }

  const handleEditDraft = (draftId: string) => {
    // Navigate to claims page with draft_id parameter
    router.push(`/claims?draft_id=${draftId}`)
  }

  const handleSubmitDraft = async (draftId: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/v1/drafts/submit-draft/${draftId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error('Failed to submit draft')
      }

      const data = await response.json()
      toast.success('Draft submitted successfully', {
        description: `Claim ID: ${data.claim_id}`
      })
      fetchDrafts() // Refresh the list
    } catch (error) {
      console.error('Error submitting draft:', error)
      toast.error('Failed to submit draft')
    }
  }

  const filteredDrafts = drafts.filter(draft =>
    draft.patient_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    draft.specialty.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'draft':
        return <Badge variant="secondary">Draft</Badge>
      case 'submitted':
        return <Badge variant="default">Submitted</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-4" />
          <p>Loading drafts...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Claim Drafts</h1>
          <p className="text-muted-foreground">Manage your saved claim drafts</p>
        </div>
        <Link href="/claims">
          <Button className="flex items-center gap-2">
            <Plus size={16} />
            New Claim
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText size={20} />
                Saved Drafts
              </CardTitle>
              <CardDescription>
                {drafts.length} draft{drafts.length !== 1 ? 's' : ''} saved
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search drafts..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-64"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredDrafts.length === 0 ? (
            <div className="text-center py-8">
              <FileText size={48} className="mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No drafts found</h3>
              <p className="text-muted-foreground mb-4">
                {searchTerm ? 'No drafts match your search.' : 'You haven\'t saved any drafts yet.'}
              </p>
              {!searchTerm && (
                <Link href="/claims">
                  <Button>Create New Claim</Button>
                </Link>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Patient</TableHead>
                  <TableHead>Specialty</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Updated</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDrafts.map((draft) => (
                  <TableRow key={draft.draft_id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <User size={16} className="text-muted-foreground" />
                        <span className="font-medium">{draft.patient_name}</span>
                      </div>
                    </TableCell>
                    <TableCell>{draft.specialty}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <DollarSign size={14} className="text-muted-foreground" />
                        ₹{draft.claimed_amount || '0'}
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(draft.status)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Calendar size={14} />
                        {formatDate(draft.created_at)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Calendar size={14} />
                        {formatDate(draft.updated_at)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => handleEditDraft(draft.draft_id)}
                        >
                          <Edit size={16} className="mr-1" />
                          Edit
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal size={16} />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild>
                              <Link href={`/claims?draft_id=${draft.draft_id}`}>
                                <Edit size={16} className="mr-2" />
                                Edit Draft
                              </Link>
                            </DropdownMenuItem>
                            {draft.status === 'draft' && (
                              <DropdownMenuItem onClick={() => handleSubmitDraft(draft.draft_id)}>
                                <Send size={16} className="mr-2" />
                                Submit Claim
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem 
                              onClick={() => handleDeleteDraft(draft.draft_id)}
                              className="text-destructive"
                            >
                              <Trash2 size={16} className="mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
