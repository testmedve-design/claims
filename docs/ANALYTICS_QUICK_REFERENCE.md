# Analytics Page - Quick Reference

## 🎯 Overview
This is a quick reference guide for analytics requirements for each role. For detailed specifications, see [11_ANALYTICS_PAGE_SPECIFICATION.md](./11_ANALYTICS_PAGE_SPECIFICATION.md).

---

## 🏥 Hospital User Analytics

### Key Metrics
- ✅ Total claims submitted, active claims, approved/rejected counts
- ✅ Claim status distribution (pie chart)
- ✅ Claims over time (line chart)
- ✅ Claim amount trends
- ✅ Payer performance comparison
- ✅ Query analysis (response times, common reasons)
- ✅ Processing time metrics
- ✅ Top claims by amount

### Focus Areas
- **Submission patterns**: Track how many claims submitted over time
- **Success rates**: Approval vs rejection rates
- **Query management**: Response times and query patterns
- **Financial tracking**: Total claimed vs approved amounts

---

## ⚙️ Claim Processor Analytics

### Key Metrics
- ✅ Total claims processed, pending workload
- ✅ Processing volume over time
- ✅ Processing time analysis
- ✅ Decision distribution (cleared vs queried)
- ✅ Hospital performance metrics
- ✅ Claim amount analysis (by ranges)
- ✅ Lock statistics
- ✅ Query patterns

### Focus Areas
- **Workload management**: Track pending vs processed claims
- **Efficiency**: Average processing times
- **Decision patterns**: Clear rate vs query rate
- **Performance**: Claims processed per day/week/month

---

## 🔍 Review Request Analytics

### Key Metrics
- ✅ Total claims reviewed, pending reviews
- ✅ Review status distribution
- ✅ Review volume over time
- ✅ Financial review analysis (claimed vs approved vs disallowed)
- ✅ Approval vs rejection rates
- ✅ Disallowance analysis
- ✅ Review time analysis
- ✅ Payer and hospital performance
- ✅ Escalation analysis

### Focus Areas
- **Review workload**: Track pending and completed reviews
- **Financial analysis**: Detailed breakdown of amounts
- **Decision tracking**: Approval, rejection, escalation rates
- **Time efficiency**: Average review times

---

## 💼 RM (Relationship Manager) Analytics

### Key Metrics
- ✅ Active claims, settled claims count
- ✅ Settlement trends (amounts over time)
- ✅ Settlement status breakdown
- ✅ Payer performance (settlement rates, times)
- ✅ Financial reconciliation (claimed vs settled)
- ✅ TDS analysis
- ✅ Payment mode distribution
- ✅ Repudiation analysis
- ✅ Outstanding claims tracking

### Focus Areas
- **Settlement tracking**: Monitor settlement rates and amounts
- **Financial reconciliation**: Track all financial aspects
- **Payer relationships**: Performance by payer
- **Payment tracking**: TDS, payment modes, UTR numbers

---

## 📊 Common Features (All Roles)

### Must-Have
- ✅ Date range filters (Today, This Week, This Month, Custom)
- ✅ Status filters
- ✅ Overview dashboard cards
- ✅ Basic charts (pie, line, bar)
- ✅ Export to CSV

### Nice-to-Have
- ✅ Export to PDF
- ✅ Period comparison (current vs previous)
- ✅ Drill-down from charts to details
- ✅ Real-time auto-refresh
- ✅ Mobile-responsive design

---

## 🎨 Chart Types by Use Case

| Use Case | Chart Type | Example |
|----------|------------|----------|
| Status Distribution | Pie/Donut | Claim status breakdown |
| Trends Over Time | Line Chart | Claims submitted over months |
| Amount Trends | Bar/Line | Financial amounts over time |
| Performance Comparison | Horizontal Bar | Payer/hospital performance |
| Time Analysis | Histogram | Processing time distribution |
| Financial Breakdown | Stacked Bar | Claimed vs Approved vs Disallowed |

---

## 🔗 API Endpoints Structure

```
/api/v1/analytics/
├── hospital-user/
│   ├── overview
│   ├── status-distribution
│   ├── claims-over-time
│   ├── amount-trends
│   ├── payer-performance
│   └── ...
├── processor/
│   ├── overview
│   ├── workload-distribution
│   ├── processing-volume
│   ├── processing-times
│   └── ...
├── review-request/
│   ├── overview
│   ├── status-distribution
│   ├── financial-analysis
│   └── ...
└── rm/
    ├── overview
    ├── settlement-trends
    ├── payer-performance
    └── ...
```

---

## 📋 Implementation Checklist

### Phase 1: MVP
- [ ] Overview cards for each role
- [ ] Basic status distribution chart
- [ ] Claims/processing volume chart
- [ ] Date range filter
- [ ] Status filter

### Phase 2: Enhanced
- [ ] Financial analysis charts
- [ ] Performance metrics (payer/hospital)
- [ ] Processing time analysis
- [ ] Export to CSV

### Phase 3: Advanced
- [ ] Comparison views
- [ ] Drill-down capabilities
- [ ] Scheduled reports
- [ ] Custom dashboards

---

## 💡 Quick Tips

1. **Start Simple**: Begin with overview cards and basic charts
2. **Use Existing Data**: Leverage current stats endpoints as foundation
3. **Role-Specific**: Each role needs different metrics - don't try to make one-size-fits-all
4. **Performance**: Cache data, use indexes, paginate large datasets
5. **User Feedback**: Iterate based on what users actually need

---

**For detailed specifications, see**: [11_ANALYTICS_PAGE_SPECIFICATION.md](./11_ANALYTICS_PAGE_SPECIFICATION.md)

