# Analytics Page Specification

## Overview

This document outlines the analytics and metrics needed for each role in the Claims Management System. The analytics page should provide role-specific insights to help users understand their workload, performance, and trends.

**Base URL**: `http://localhost:5002`  
**Route**: `/analytics` (role-based access)

---

## 🏥 1. Hospital User Analytics

### Purpose
Help hospital users track their claim submission patterns, success rates, and identify areas for improvement.

### Key Metrics & Visualizations

#### 1.1 Overview Dashboard Cards
- **Total Claims Submitted** (all time)
- **Active Claims** (qc_pending, qc_query, qc_answered)
- **Approved Claims** (claim_approved, qc_clear, dispatched)
- **Rejected Claims** (claim_denial, rejected)
- **Pending Queries** (qc_query - needs response)
- **Average Claim Amount** (₹)
- **Total Claimed Amount** (₹)
- **Total Approved Amount** (₹)

#### 1.2 Claim Status Distribution
- **Chart Type**: Pie/Donut Chart
- **Data**: Breakdown by claim_status
  - qc_pending
  - qc_query
  - qc_answered
  - qc_clear
  - claim_approved
  - claim_denial
  - dispatched
  - rejected

#### 1.3 Claims Over Time
- **Chart Type**: Line Chart
- **X-Axis**: Date (daily/weekly/monthly)
- **Y-Axis**: Number of claims
- **Series**:
  - Claims submitted
  - Claims approved
  - Claims rejected
  - Queries raised

#### 1.4 Claim Amount Trends
- **Chart Type**: Bar/Line Chart
- **X-Axis**: Date (monthly)
- **Y-Axis**: Amount (₹)
- **Series**:
  - Total claimed amount
  - Total approved amount
  - Average claim amount

#### 1.5 Payer Performance
- **Chart Type**: Horizontal Bar Chart
- **Data**: Claims by payer_name
  - Total claims per payer
  - Approval rate per payer
  - Average processing time per payer
  - Average approved amount per payer

#### 1.6 Query Analysis
- **Metrics**:
  - Total queries raised
  - Average response time
  - Queries by type (if tracked)
  - Most common query reasons

#### 1.7 Processing Time Metrics
- **Average Time to Approval** (days)
- **Average Time to Query Response** (days)
- **Average Time in Each Status** (days)
  - Time in qc_pending
  - Time in qc_query
  - Time in qc_answered

#### 1.8 Top Claims by Amount
- **Table**: Top 10 highest claimed amounts
  - Claim ID
  - Patient Name
  - Claimed Amount
  - Approved Amount
  - Status
  - Submission Date

#### 1.9 Draft Analytics
- **Total Drafts Created**
- **Drafts Converted to Claims**
- **Average Draft Age** (days)
- **Drafts by Status** (if tracked)

#### 1.10 Monthly Summary Table
- **Columns**: Month, Submitted, Approved, Rejected, Approval Rate, Total Amount

### Filters
- **Date Range**: Start date, End date
- **Status**: All, qc_pending, qc_query, approved, rejected
- **Payer**: Dropdown of payers
- **Claim Type**: INPATIENT, OUTPATIENT, DIALYSIS
- **Time Period**: Last 7 days, Last 30 days, Last 90 days, Last 6 months, Last year, Custom

### Data Endpoints Needed
```
GET /api/v1/analytics/hospital-user/overview
GET /api/v1/analytics/hospital-user/status-distribution
GET /api/v1/analytics/hospital-user/claims-over-time
GET /api/v1/analytics/hospital-user/amount-trends
GET /api/v1/analytics/hospital-user/payer-performance
GET /api/v1/analytics/hospital-user/query-analysis
GET /api/v1/analytics/hospital-user/processing-times
GET /api/v1/analytics/hospital-user/top-claims
```

---

## ⚙️ 2. Claim Processor Analytics

### Purpose
Help processors track their workload, processing efficiency, and performance metrics.

### Key Metrics & Visualizations

#### 2.1 Overview Dashboard Cards
- **Total Claims Processed** (all time)
- **Pending Claims** (qc_pending, qc_answered)
- **Claims Cleared Today** (qc_clear)
- **Queries Raised Today** (qc_query)
- **Average Processing Time** (hours)
- **Claims Processed This Week**
- **Claims Processed This Month**
- **Approval Rate** (%)

#### 2.2 Workload Distribution
- **Chart Type**: Pie Chart
- **Data**: Claims by status
  - qc_pending (unprocessed)
  - qc_answered (awaiting review)
  - qc_clear (cleared)
  - qc_query (queries raised)
  - claim_approved
  - claim_denial

#### 2.3 Processing Volume Over Time
- **Chart Type**: Line/Bar Chart
- **X-Axis**: Date (daily)
- **Y-Axis**: Number of claims
- **Series**:
  - Claims processed
  - Claims cleared
  - Queries raised
  - Claims approved

#### 2.4 Processing Time Analysis
- **Chart Type**: Histogram/Box Plot
- **Metrics**:
  - Average processing time per claim
  - Distribution of processing times
  - Time to clear vs time to query
  - Processing time by claim amount

#### 2.5 Decision Distribution
- **Chart Type**: Donut Chart
- **Data**: Processing decisions
  - Cleared (qc_clear)
  - Queried (qc_query)
  - Approved (claim_approved)
  - Denied (claim_denial)
  - Need More Info

#### 2.6 Hospital Performance
- **Chart Type**: Horizontal Bar Chart
- **Data**: Claims by hospital
  - Total claims processed per hospital
  - Average processing time per hospital
  - Query rate per hospital
  - Clear rate per hospital

#### 2.7 Claim Amount Analysis
- **Chart Type**: Bar Chart
- **Data**: Claims by amount range
  - < ₹50,000
  - ₹50,000 - ₹1,00,000
  - ₹1,00,000 - ₹2,50,000
  - ₹2,50,000 - ₹5,00,000
  - > ₹5,00,000
- **Metrics**: Count and average processing time per range

#### 2.8 Lock Statistics
- **Total Claims Locked**
- **Average Lock Duration** (hours)
- **Claims Locked by Me**
- **Expired Locks**

#### 2.9 Query Patterns
- **Total Queries Raised**
- **Most Common Query Reasons** (if tracked)
- **Average Time to Raise Query**
- **Query Resolution Rate**

#### 2.10 Daily/Weekly Performance
- **Table**: Date, Claims Processed, Cleared, Queried, Avg Time, Approval Rate

#### 2.11 Payer Performance
- **Chart Type**: Table/Bar Chart
- **Data**: Claims by payer
  - Total processed
  - Average processing time
  - Query rate
  - Clear rate

### Filters
- **Date Range**: Start date, End date
- **Status**: All, qc_pending, qc_clear, qc_query
- **Hospital**: Dropdown of assigned hospitals
- **Payer**: Dropdown of payers
- **Time Period**: Today, This Week, This Month, Last Month, Custom

### Data Endpoints Needed
```
GET /api/v1/analytics/processor/overview
GET /api/v1/analytics/processor/workload-distribution
GET /api/v1/analytics/processor/processing-volume
GET /api/v1/analytics/processor/processing-times
GET /api/v1/analytics/processor/decision-distribution
GET /api/v1/analytics/processor/hospital-performance
GET /api/v1/analytics/processor/amount-analysis
GET /api/v1/analytics/processor/lock-statistics
GET /api/v1/analytics/processor/query-patterns
```

---

## 🔍 3. Review Request Analytics

### Purpose
Help review request users track their review workload, review decisions, and financial analysis.

### Key Metrics & Visualizations

#### 3.1 Overview Dashboard Cards
- **Total Claims Reviewed** (all time)
- **Pending Reviews** (pending, under_review)
- **Completed Reviews** (completed)
- **Escalated Claims**
- **Average Review Time** (hours)
- **Total Amount Reviewed** (₹)
- **Total Amount Approved** (₹)
- **Total Amount Disallowed** (₹)

#### 3.2 Review Status Distribution
- **Chart Type**: Pie Chart
- **Data**: Claims by review_status
  - pending
  - under_review
  - reviewed
  - review_approved
  - review_rejected
  - review_info_needed
  - review_completed
  - review_escalated

#### 3.3 Review Volume Over Time
- **Chart Type**: Line Chart
- **X-Axis**: Date (daily)
- **Y-Axis**: Number of claims
- **Series**:
  - Claims reviewed
  - Claims approved
  - Claims rejected
  - Claims escalated

#### 3.4 Financial Review Analysis
- **Chart Type**: Stacked Bar Chart
- **X-Axis**: Date (monthly)
- **Y-Axis**: Amount (₹)
- **Series**:
  - Claimed Amount
  - Approved Amount
  - Disallowed Amount

#### 3.5 Approval vs Rejection Rate
- **Chart Type**: Donut Chart
- **Data**: Review decisions
  - Approved
  - Rejected
  - Request More Info
  - Escalated

#### 3.6 Disallowance Analysis
- **Chart Type**: Bar Chart
- **Data**: Average disallowed amount by payer
- **Metrics**:
  - Total disallowed amount
  - Average disallowed percentage
  - Top reasons for disallowance

#### 3.7 Review Time Analysis
- **Chart Type**: Histogram
- **Metrics**:
  - Average time to review
  - Distribution of review times
  - Time by claim amount
  - Time by payer

#### 3.8 Payer Performance
- **Chart Type**: Table/Bar Chart
- **Data**: Reviews by payer
  - Total reviews
  - Average approved amount
  - Average disallowed amount
  - Approval rate
  - Average review time

#### 3.9 Hospital Performance
- **Chart Type**: Horizontal Bar Chart
- **Data**: Reviews by hospital
  - Total reviews per hospital
  - Average claim amount per hospital
  - Approval rate per hospital

#### 3.10 Escalation Analysis
- **Total Escalations**
- **Escalation Rate** (%)
- **Most Common Escalation Reasons**
- **Average Time to Escalate**

#### 3.11 High-Value Claims
- **Table**: Top 10 highest value claims reviewed
  - Claim ID
  - Claimed Amount
  - Approved Amount
  - Disallowed Amount
  - Review Date
  - Reviewer

#### 3.12 Monthly Financial Summary
- **Table**: Month, Claims Reviewed, Total Claimed, Total Approved, Total Disallowed, Approval Rate

### Filters
- **Date Range**: Start date, End date
- **Review Status**: All, pending, under_review, completed
- **Payer**: Dropdown of payers
- **Hospital**: Dropdown of hospitals
- **Time Period**: Last 7 days, Last 30 days, Last 90 days, Custom

### Data Endpoints Needed
```
GET /api/v1/analytics/review-request/overview
GET /api/v1/analytics/review-request/status-distribution
GET /api/v1/analytics/review-request/review-volume
GET /api/v1/analytics/review-request/financial-analysis
GET /api/v1/analytics/review-request/approval-rejection-rate
GET /api/v1/analytics/review-request/disallowance-analysis
GET /api/v1/analytics/review-request/review-times
GET /api/v1/analytics/review-request/payer-performance
GET /api/v1/analytics/review-request/hospital-performance
GET /api/v1/analytics/review-request/escalation-analysis
```

---

## 💼 4. RM (Relationship Manager) Analytics

### Purpose
Help RMs track settlement performance, payment reconciliation, and payer relationships.

### Key Metrics & Visualizations

#### 4.1 Overview Dashboard Cards
- **Total Active Claims**
- **Settled Claims** (settled, partially_settled)
- **Pending Settlement**
- **Total Settled Amount** (₹)
- **Total TDS Deducted** (₹)
- **Total Net Payable** (₹)
- **Average Settlement Time** (days)
- **Settlement Rate** (%)

#### 4.2 Claim Status Distribution
- **Chart Type**: Pie Chart
- **Data**: Claims by RM status
  - received
  - query_raised
  - repudiated
  - settled
  - partially_settled
  - reconciliation
  - in_progress
  - approved
  - cancelled
  - closed

#### 4.3 Settlement Trends
- **Chart Type**: Line Chart
- **X-Axis**: Date (monthly)
- **Y-Axis**: Amount (₹)
- **Series**:
  - Total settled amount
  - Total claimed amount
  - Net payable amount
  - TDS amount

#### 4.4 Settlement Status Breakdown
- **Chart Type**: Stacked Bar Chart
- **X-Axis**: Date (monthly)
- **Y-Axis**: Number of claims
- **Series**:
  - Settled
  - Partially Settled
  - In Reconciliation
  - Pending

#### 4.5 Payer Performance
- **Chart Type**: Table/Bar Chart
- **Data**: Performance by payer
  - Total claims
  - Settled claims
  - Settlement rate
  - Average settlement time
  - Total settled amount
  - Average settlement percentage

#### 4.6 Settlement Time Analysis
- **Chart Type**: Histogram
- **Metrics**:
  - Average time to settlement
  - Distribution of settlement times
  - Time by payer
  - Time by claim amount

#### 4.7 Financial Reconciliation
- **Chart Type**: Stacked Area Chart
- **X-Axis**: Date (monthly)
- **Y-Axis**: Amount (₹)
- **Series**:
  - Claimed Amount
  - Settled Amount
  - TDS Amount
  - Net Payable

#### 4.8 TDS Analysis
- **Total TDS Deducted** (₹)
- **Average TDS Percentage** (%)
- **TDS by Payer**
- **TDS Trends Over Time**

#### 4.9 Payment Mode Distribution
- **Chart Type**: Pie Chart
- **Data**: Settlements by payment_mode
  - NEFT
  - RTGS
  - Cheque
  - DD
  - Other

#### 4.10 Hospital Performance
- **Chart Type**: Horizontal Bar Chart
- **Data**: Settlements by hospital
  - Total claims per hospital
  - Settlement rate per hospital
  - Average settlement amount per hospital

#### 4.11 Repudiation Analysis
- **Total Repudiated Claims**
- **Repudiation Rate** (%)
- **Repudiation by Payer**
- **Repudiation Reasons** (if tracked)

#### 4.12 Re-evaluation Metrics
- **Total Re-evaluations**
- **Re-evaluation Rate**
- **Average Time Between Settlement and Re-evaluation**

#### 4.13 Monthly Settlement Summary
- **Table**: Month, Claims Settled, Total Amount, TDS, Net Payable, Avg Settlement Time

#### 4.14 Outstanding Claims
- **Table**: Claims pending settlement
  - Claim ID
  - Claimed Amount
  - Days Pending
  - Payer
  - Hospital
  - Status

### Filters
- **Date Range**: Start date, End date
- **Status**: All, active, settled
- **Payer**: Dropdown of assigned payers
- **Hospital**: Dropdown of assigned hospitals
- **Settlement Status**: All, settled, partially_settled, reconciliation
- **Time Period**: Last 7 days, Last 30 days, Last 90 days, Last 6 months, Custom

### Data Endpoints Needed
```
GET /api/v1/analytics/rm/overview
GET /api/v1/analytics/rm/status-distribution
GET /api/v1/analytics/rm/settlement-trends
GET /api/v1/analytics/rm/settlement-status-breakdown
GET /api/v1/analytics/rm/payer-performance
GET /api/v1/analytics/rm/settlement-times
GET /api/v1/analytics/rm/financial-reconciliation
GET /api/v1/analytics/rm/tds-analysis
GET /api/v1/analytics/rm/payment-mode-distribution
GET /api/v1/analytics/rm/hospital-performance
GET /api/v1/analytics/rm/repudiation-analysis
GET /api/v1/analytics/rm/outstanding-claims
```

---

## 📊 Common Analytics Features (All Roles)

### 1. Export Functionality
- **Export to CSV**: All analytics data
- **Export to PDF**: Dashboard reports
- **Scheduled Reports**: Email reports (future)

### 2. Date Range Selector
- Quick filters: Today, This Week, This Month, Last Month, Last 3 Months, Last 6 Months, Last Year, Custom Range
- Preset ranges for common periods

### 3. Comparison Views
- **Period Comparison**: Compare current period vs previous period
- **Year-over-Year**: Compare same period year-over-year
- **Percentage Change Indicators**: Show increase/decrease

### 4. Drill-Down Capability
- Click on charts to see detailed data
- Filter by clicking on chart segments
- Navigate to claim details from analytics

### 5. Real-Time Updates
- Auto-refresh every 5-10 minutes
- Manual refresh button
- Loading states for async data

### 6. Responsive Design
- Mobile-friendly layouts
- Collapsible sections
- Chart responsiveness

---

## 🎨 UI/UX Recommendations

### Layout Structure
```
┌─────────────────────────────────────────────────┐
│  Analytics Dashboard                            │
│  [Date Range] [Filters] [Export] [Refresh]     │
├─────────────────────────────────────────────────┤
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐│
│  │ Card 1  │ │ Card 2  │ │ Card 3  │ │ Card 4  ││
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘│
├─────────────────────────────────────────────────┤
│  ┌───────────────────────┐ ┌─────────────────┐ │
│  │  Chart 1 (Large)      │ │  Chart 2        │ │
│  └───────────────────────┘ └─────────────────┘ │
├─────────────────────────────────────────────────┤
│  ┌───────────────────────┐ ┌─────────────────┐ │
│  │  Chart 3              │ │  Chart 4        │ │
│  └───────────────────────┘ └─────────────────┘ │
├─────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────┐│
│  │  Data Table                                 ││
│  └─────────────────────────────────────────────┘│
└─────────────────────────────────────────────────┘
```

### Chart Library Recommendations
- **Recharts** (React) or **Chart.js** - For line, bar, pie charts
- **D3.js** - For advanced custom visualizations
- **ApexCharts** - For interactive charts

### Color Scheme
- **Success/Approved**: Green (#10B981)
- **Pending/Warning**: Orange (#F59E0B)
- **Error/Rejected**: Red (#EF4444)
- **Info/Neutral**: Blue (#3B82F6)
- **Primary**: Brand color

---

## 🔧 Implementation Priority

### Phase 1: Core Metrics (MVP)
1. Overview dashboard cards for each role
2. Basic status distribution charts
3. Claims/processing volume over time
4. Simple filters (date range, status)

### Phase 2: Enhanced Analytics
1. Financial analysis charts
2. Performance metrics by payer/hospital
3. Processing time analysis
4. Export functionality

### Phase 3: Advanced Features
1. Comparison views
2. Drill-down capabilities
3. Scheduled reports
4. Custom dashboard configuration

---

## 📝 Data Requirements

### Common Data Points Needed
- Claim status history
- Timestamps for status changes
- Financial amounts (claimed, approved, settled, etc.)
- Payer and hospital information
- User actions (who did what, when)
- Processing times (calculated from timestamps)

### Database Queries
- Aggregate queries for counts
- Time-series queries for trends
- Group by queries for breakdowns
- Join queries for related data

### Performance Considerations
- Cache frequently accessed data
- Use database indexes for date/status queries
- Paginate large datasets
- Consider materialized views for complex aggregations

---

## 🚀 Next Steps

1. **Review and Prioritize**: Review this specification and prioritize features
2. **Backend API Development**: Create analytics endpoints for each role
3. **Frontend Component Development**: Build analytics dashboard components
4. **Testing**: Test with real data and different user roles
5. **Iteration**: Gather feedback and iterate on analytics

---

**Last Updated**: January 2025  
**Version**: 1.0  
**Status**: 📋 Specification

