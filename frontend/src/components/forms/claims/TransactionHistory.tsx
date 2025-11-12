'use client'

import { ColumnDef } from '@tanstack/react-table'
import { Badge } from '@/components/ui/badge'
import { DataTable } from '@/components/ui/data-table'
import { ArrowUpDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from '@/lib/toast'
import { loadHtml2Pdf } from '@/lib/html2pdf'

interface Transaction {
  transaction_id?: string
  transaction_type: string
  previous_status?: string
  new_status?: string
  remarks?: string
  performed_by?: string
  performed_by_name?: string
  performed_by_email?: string
  performed_by_role?: string
  performed_at?: string
  metadata?: any
  claim_id?: string
}

interface TransactionHistoryProps {
  transactions: Transaction[]
}

type LetterType = 'claim_approved' | 'claim_denial' | 'need_more_info'

interface TransactionLetterMetadata {
  type: LetterType
  title?: string
  generated_at?: string
  letter_date?: string
  claim_number?: string
  intimation_number?: string
  submitted_on?: string | null
  hospital?: {
    name?: string | null
    address_lines?: string[]
  }
  patient?: {
    name?: string | null
    age?: string | null
    gender?: string | null
    payer_patient_id?: string | null
    admission_date?: string | null
    discharge_date?: string | null
    length_of_stay?: string | null
    speciality?: string | null
    treated_doctor?: string | null
    line_of_treatment?: string | null
    room_category?: string | null
  }
  financials?: {
    estimated_cost?: string | null
    claimed_amount?: string | null
    approved_amount?: string | null
    disallowed_amount?: string | null
    remarks?: string | null
  }
  approval_summary?: {
    authorization_number?: string | null
    total_authorized_amount?: string | null
  }
  denial_reason?: string | null
  remarks?: string | null
  query_details?: {
    issue_categories?: string[]
    repeat_issue?: string | null
    action_required?: string | null
    remarks?: string | null
  }
  issuer?: {
    name?: string | null
    address_lines?: string[]
  }
  generated_by?: {
    name?: string | null
    email?: string | null
  }
}

const LETTER_TYPE_LABELS: Record<LetterType, string> = {
  claim_approved: 'Approval Letter',
  claim_denial: 'Denial Letter',
  need_more_info: 'Need More Info Letter',
}

const getStatusLabel = (type: string) => {
  const labels: Record<string, string> = {
    CREATED: 'Created',
    QUERIED: 'Query Raised',
    ANSWERED: 'Query Answered',
    CLEARED: 'QC Clear',
    APPROVED: 'Approved',
    REJECTED: 'Rejected',
    DISPATCHED: 'Dispatched',
    CONTESTED: 'Contested',
  }
  return labels[type] || type
}

const formatDateTime = (dateString?: string) => {
  if (!dateString) return 'N/A'
  return new Date(dateString).toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const getRoleLabel = (role?: string) => {
  const roles: Record<string, string> = {
    hospital_user: 'Hospital',
    processor: 'Processor',
    admin: 'Admin',
  }
  return roles[role || ''] || 'System'
}

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')

const formatLines = (lines?: string[]) =>
  (lines || [])
    .map(line => line?.trim())
    .filter(Boolean)
    .map(line => escapeHtml(line as string))
    .join('<br />')

const buildTable = (
  rows: Array<{ label: string; value?: string | null }>,
  options?: { columns?: 1 | 2 }
) => {
  const filteredRows = rows.filter(row => Boolean(row.value))
  if (filteredRows.length === 0) return ''

  const cols = options?.columns === 2 ? 2 : 1
  const headerCells =
    cols === 2
      ? '<colgroup><col span="1" style="width: 50%"></colgroup>'
      : ''

  const rowHtml = filteredRows
    .map(row => {
      const label = escapeHtml(row.label)
      const value = escapeHtml(String(row.value))
      return `<tr>
        <th>${label}</th>
        <td>${value}</td>
      </tr>`
    })
    .join('')

  return `
    <table class="detail-table">
      ${headerCells}
      <tbody>
        ${rowHtml}
      </tbody>
    </table>
  `
}

const buildSignatureBlock = (letter: TransactionLetterMetadata) => {
  const issuerName =
    letter.issuer?.name?.trim() || 'Medverve Healthcare Pvt Ltd'
  const issuerAddress = formatLines(letter.issuer?.address_lines)
  return `
    <div class="signature-block">
      <p>Warm Regards,</p>
      <p><strong>${escapeHtml(issuerName)}</strong></p>
      <p>${issuerAddress}</p>
    </div>
  `
}

const buildIntroSection = (letter: TransactionLetterMetadata) => {
  const claimNumber = letter.claim_number
    ? escapeHtml(letter.claim_number)
    : ''
  const intimationNumber = letter.intimation_number
    ? escapeHtml(letter.intimation_number)
    : ''
  const dateString = letter.letter_date
    ? escapeHtml(letter.letter_date)
    : ''

  const numberLine =
    claimNumber || intimationNumber
      ? `Claim Number/Intimation Number: <strong>${claimNumber ||
          intimationNumber}</strong>`
      : ''

  return `
    <div class="intro-block">
      <div class="claim-info">
        ${numberLine}
      </div>
      <div class="date-info">
        Date: <strong>${dateString || '-'}</strong>
      </div>
    </div>
  `
}

const buildRecipientBlock = (letter: TransactionLetterMetadata) => {
  const hospitalName = letter.hospital?.name
    ? escapeHtml(letter.hospital.name)
    : null
  const hospitalAddress = formatLines(letter.hospital?.address_lines)
  const submittedOn = letter.submitted_on
    ? escapeHtml(letter.submitted_on)
    : null

  return `
    <div class="recipient-block">
      <p>To,</p>
      <p><strong>${hospitalName || 'Hospital Team'}</strong></p>
      ${hospitalAddress ? `<p>${hospitalAddress}</p>` : ''}
      ${
        submittedOn
          ? `<p class="meta-line">Claim submitted on: ${submittedOn}</p>`
          : ''
      }
      <p>Dear Sir/Madam,</p>
    </div>
  `
}

const buildPatientSection = (letter: TransactionLetterMetadata) => {
  const patient = letter.patient ?? {}

  const rows = [
    { label: 'Patient Name', value: patient.name ?? undefined },
    { label: 'Age', value: patient.age ?? undefined },
    { label: 'Gender', value: patient.gender ?? undefined },
    { label: 'Payer Patient ID', value: patient.payer_patient_id ?? undefined },
    { label: 'Admission Date', value: patient.admission_date ?? undefined },
    { label: 'Discharge Date', value: patient.discharge_date ?? undefined },
    { label: 'Length of Stay', value: patient.length_of_stay ?? undefined },
    { label: 'Speciality', value: patient.speciality ?? undefined },
    { label: 'Treated Doctor', value: patient.treated_doctor ?? undefined },
    { label: 'Line of Treatment', value: patient.line_of_treatment ?? undefined },
    { label: 'Room Category', value: patient.room_category ?? undefined },
  ]

  const table = buildTable(rows)
  if (!table) return ''

  return `
    <section>
      <h2>Patient Details</h2>
      ${table}
    </section>
  `
}

const buildFinancialSection = (letter: TransactionLetterMetadata) => {
  const financials = letter.financials ?? {}

  const rows = [
    { label: 'Estimated Cost', value: financials.estimated_cost ?? undefined },
    { label: 'Claimed Amount', value: financials.claimed_amount ?? undefined },
    { label: 'Approved Amount', value: financials.approved_amount ?? undefined },
    { label: 'Disallowed Amount', value: financials.disallowed_amount ?? undefined },
    { label: 'Remarks', value: financials.remarks ?? letter.remarks ?? undefined },
  ]

  const table = buildTable(rows)
  if (!table) return ''

  return `
    <section>
      <h2>Approval Details</h2>
      ${table}
    </section>
  `
}

const buildApprovalBody = (letter: TransactionLetterMetadata) => {
  const approvalSummary = letter.approval_summary ?? {}
  const authorizationNumber = approvalSummary.authorization_number
  const authorizedAmount = approvalSummary.total_authorized_amount

  const paragraphs = [
    `This has reference to your request. We hereby authorize the claim as per the details mentioned below.`,
    authorizationNumber
      ? `Authorization Number: <strong>${escapeHtml(
          authorizationNumber
        )}</strong>.`
      : null,
    authorizedAmount
      ? `Total Authorized Amount: <strong>${escapeHtml(
          authorizedAmount
        )}</strong>.`
      : null,
  ]
    .filter(Boolean)
    .map(text => `<p>${text}</p>`)
    .join('')

  const disclaimers = `
    <section>
      <h3>Important Notes</h3>
      <ul>
        <li>Authorization is based on the information shared at the time of approval.</li>
        <li>Any variation in documents submitted at discharge may lead to revisions.</li>
        <li>All non-admissible expenses and consumables must be settled directly by the patient.</li>
        <li>Please submit discharge documents within 7 days to ensure timely settlement.</li>
      </ul>
    </section>
  `

  return `
    ${paragraphs}
    ${buildPatientSection(letter)}
    ${buildFinancialSection(letter)}
    ${disclaimers}
    ${buildSignatureBlock(letter)}
  `
}

const buildDenialBody = (letter: TransactionLetterMetadata) => {
  const denialReason = letter.denial_reason || letter.remarks
  const reasonHtml = denialReason
    ? `<p><strong>Reason for Denial:</strong> ${escapeHtml(denialReason)}</p>`
    : ''

  return `
    <p>We refer to the cashless claim request submitted for the insured member. Based on the documents reviewed, we regret to inform you that the claim has been denied.</p>
    ${buildPatientSection(letter)}
    ${reasonHtml}
    <p>If you have any additional documents or clarifications to support admissibility, please share them within 15 days of receiving this letter.</p>
    ${buildSignatureBlock(letter)}
  `
}

const buildQueryBody = (letter: TransactionLetterMetadata) => {
  const details = letter.query_details ?? {}
  const categories = (details.issue_categories || []).filter(Boolean)

  const categoryHtml = categories.length
    ? `<p><strong>Issue Categories:</strong></p>
       <ul>${categories
         .map(item => `<li>${escapeHtml(item)}</li>`)
         .join('')}</ul>`
    : ''

  const repeatIssue = details.repeat_issue
    ? `<p><strong>Repeat Issue:</strong> ${escapeHtml(details.repeat_issue)}</p>`
    : ''
  const actionRequired = details.action_required
    ? `<p><strong>Action Required:</strong> ${escapeHtml(details.action_required)}</p>`
    : ''
  const remarks = details.remarks || letter.remarks
    ? `<p><strong>Remarks:</strong> ${escapeHtml(
        (details.remarks || letter.remarks) as string
      )}</p>`
    : ''

  return `
    <p>We request the following clarifications/supporting documents to proceed with the claim.</p>
    ${buildPatientSection(letter)}
    ${categoryHtml}
    ${repeatIssue}
    ${actionRequired}
    ${remarks}
    <p>Please share the requested information/documents within 7 days to avoid delays.</p>
    ${buildSignatureBlock(letter)}
  `
}

const buildLetterHtml = (letter: TransactionLetterMetadata) => {
  const title =
    letter.title ||
    LETTER_TYPE_LABELS[letter.type] ||
    'Claim Communication'

  const bodyContent =
    letter.type === 'claim_approved'
      ? buildApprovalBody(letter)
      : letter.type === 'claim_denial'
      ? buildDenialBody(letter)
      : buildQueryBody(letter)

  const hospitalName =
    letter.hospital?.name?.trim() || 'Hospital Team'

  return `<!DOCTYPE html>
  <html>
    <head>
      <meta charset="utf-8" />
      <title>${escapeHtml(title)}</title>
      <style>
        body {
          font-family: 'Helvetica Neue', Arial, sans-serif;
          margin: 24px;
          color: #1f2937;
          line-height: 1.6;
        }
        h1 {
          font-size: 20px;
          text-transform: uppercase;
          letter-spacing: 1px;
          text-align: center;
          margin-bottom: 16px;
        }
        h2 {
          font-size: 16px;
          margin-top: 24px;
          margin-bottom: 8px;
        }
        h3 {
          font-size: 14px;
          margin-top: 16px;
          margin-bottom: 6px;
        }
        p {
          margin: 8px 0;
        }
        ul {
          margin: 8px 0 8px 20px;
        }
        .intro-block {
          display: flex;
          justify-content: space-between;
          font-size: 12px;
          margin-bottom: 16px;
          color: #4b5563;
        }
        .recipient-block {
          margin-bottom: 20px;
        }
        .recipient-block p {
          margin: 4px 0;
        }
        .meta-line {
          font-size: 12px;
          color: #6b7280;
        }
        .detail-table {
          width: 100%;
          border-collapse: collapse;
          margin: 12px 0;
          font-size: 12px;
        }
        .detail-table th {
          text-align: left;
          padding: 6px 8px;
          background: #f3f4f6;
          border: 1px solid #e5e7eb;
          font-weight: 600;
        }
        .detail-table td {
          padding: 6px 8px;
          border: 1px solid #e5e7eb;
        }
        .signature-block {
          margin-top: 24px;
          font-size: 12px;
        }
      </style>
    </head>
    <body>
      <h1>${escapeHtml(title)}</h1>
      ${buildIntroSection(letter)}
      ${buildRecipientBlock(letter)}
      ${bodyContent}
    </body>
  </html>`
}

const downloadLetterPdf = async (
  letter: TransactionLetterMetadata,
  claimId?: string
) => {
  try {
    const html2pdfModule = await loadHtml2Pdf()
    const html = buildLetterHtml(letter)
    const worker = html2pdfModule
      .default()
      .set({
        margin: [10, 12, 10, 12],
        filename: `${claimId || letter.claim_number || 'claim-letter'}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      })
      .from(html)

    await worker.save()
    toast.success(`${LETTER_TYPE_LABELS[letter.type]} downloaded`)
  } catch (error: any) {
    console.error('Failed to generate letter PDF:', error)
    toast.error(error?.message || 'Failed to generate letter PDF')
  }
}

export function TransactionHistory({ transactions }: TransactionHistoryProps) {
  const hasLetters = transactions.some(
    transaction => Boolean(transaction.metadata?.letter)
  )
  const hasQuerySummary = transactions.some(
    transaction => Boolean(transaction.metadata?.query_details)
  )

  const columns: ColumnDef<Transaction>[] = [
    {
      accessorKey: 'transaction_type',
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="h-8 px-2 hover:bg-muted/50"
          >
            Action
            <ArrowUpDown className="ml-2 h-3 w-3" />
          </Button>
        )
      },
      cell: ({ row }) => {
        const label = getStatusLabel(row.getValue('transaction_type'))
        return (
          <Badge variant="outline" className="text-xs font-medium">
            {label}
          </Badge>
        )
      },
    },
    {
      accessorKey: 'performed_by_name',
      header: 'Performed By',
      cell: ({ row }) => {
        const name = row.original.performed_by_name || row.original.performed_by_email || 'System'
        const role = getRoleLabel(row.original.performed_by_role)
        return (
          <div className="flex flex-col gap-1">
            <span className="text-sm font-medium">{name}</span>
            <Badge variant="secondary" className="text-xs w-fit">
              {role}
            </Badge>
          </div>
        )
      },
    },
    {
      accessorKey: 'previous_status',
      header: 'Status Change',
      cell: ({ row }) => {
        const prev = row.original.previous_status
        const next = row.original.new_status
        return (
          <div className="flex items-center gap-2 text-xs">
            <span className="text-gray-500 capitalize">{prev?.replace('_', ' ')}</span>
            <span className="text-gray-400">→</span>
            <span className="text-gray-900 font-medium capitalize">{next?.replace('_', ' ')}</span>
          </div>
        )
      },
    },
    {
      accessorKey: 'remarks',
      header: 'Remarks',
      cell: ({ row }) => {
        const remarks = row.original.remarks
        const metadata = row.original.metadata

        // Show metadata details for specific transaction types
        if (row.original.transaction_type === 'DISPATCHED' && metadata) {
          return (
            <div className="text-sm space-y-1">
              <div className="text-gray-600">Mode: <span className="font-medium capitalize">{metadata.dispatch_mode}</span></div>
              {metadata.acknowledgment_number && (
                <div className="text-xs text-gray-500">Ack: {metadata.acknowledgment_number}</div>
              )}
            </div>
          )
        }
        if (row.original.transaction_type === 'CONTESTED' && metadata) {
          return (
            <div className="text-sm space-y-1 text-gray-600">
              {metadata.contest_reason && (
                <p className="whitespace-pre-line">{metadata.contest_reason}</p>
              )}
              {metadata.uploaded_files_count ? (
                <span className="text-xs text-gray-500">
                  Attachments: {metadata.uploaded_files_count}
                </span>
              ) : null}
            </div>
          )
        }

        return <span className="text-sm text-gray-600">{remarks || '-'}</span>
      },
    },
    {
      accessorKey: 'performed_at',
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="h-8 px-2 hover:bg-muted/50 float-right"
          >
            Timestamp
            <ArrowUpDown className="ml-2 h-3 w-3" />
          </Button>
        )
      },
      cell: ({ row }) => {
        return (
          <div className="text-right text-xs text-gray-500">
            {formatDateTime(row.getValue('performed_at'))}
          </div>
        )
      },
    },
  ]

  if (hasLetters) {
    columns.push({
      id: 'letter',
      header: 'Letters',
      cell: ({ row }) => {
        const letter = row.original.metadata?.letter as TransactionLetterMetadata | undefined
        if (!letter) {
          return <span className="text-xs text-gray-400">-</span>
        }

        const label = LETTER_TYPE_LABELS[letter.type] || 'Letter'
        const generatedAt = letter.generated_at ? formatDateTime(letter.generated_at) : null

        return (
          <div className="flex flex-col gap-1">
            <Button
              variant="outline"
              size="sm"
              className="w-fit"
              onClick={() => downloadLetterPdf(letter, row.original.claim_id)}
            >
              Download {label}
            </Button>
            {generatedAt && (
              <span className="text-[11px] text-gray-400 leading-tight">
                Generated: {generatedAt}
              </span>
            )}
          </div>
        )
      },
    })
  }

  if (hasQuerySummary) {
    columns.push({
      accessorKey: 'metadata',
      header: 'QC Query Summary',
      cell: ({ row }) => {
        const metadata = row.original.metadata
        if (!metadata || !metadata.query_details) {
          return <span className="text-xs text-gray-400">-</span>
        }

        const details = metadata.query_details
        const issueCategories: string[] = details.issue_categories || []
        const repeatIssue = details.repeat_issue
        const actionRequired = details.action_required

        return (
          <div className="text-xs space-y-2 text-gray-700">
            {issueCategories.length > 0 && (
              <div>
                <span className="font-semibold text-gray-600">Issue Categories:</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {issueCategories.map((category) => (
                    <span
                      key={category}
                      className="inline-flex items-center gap-1 rounded-full bg-orange-100 text-orange-700 px-2 py-0.5"
                    >
                      {category}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {repeatIssue && (
              <div>
                <span className="font-semibold text-gray-600">Repeat Issue:</span>{' '}
                <span className="uppercase">{repeatIssue}</span>
              </div>
            )}
            {actionRequired && (
              <div>
                <span className="font-semibold text-gray-600">Action Required:</span>
                <p className="mt-1 whitespace-pre-line text-gray-600">{actionRequired}</p>
              </div>
            )}
          </div>
        )
      },
    })
  }

  if (transactions.length === 0) {
    return <p className="text-gray-500 text-center py-8">No transaction history available</p>
  }

  return (
    <DataTable
      columns={columns}
      data={transactions}
      searchKey="performed_by_name"
      searchPlaceholder="Search by user..."
      showColumnToggle={true}
      showPagination={transactions.length > 10}
    />
  )
}
