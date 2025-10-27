# RM System - Quick Reference Card

## 🚀 Start Servers

```bash
# Terminal 1 - Backend
cd backend
python app.py

# Terminal 2 - Frontend  
cd frontend
npm run dev
```

## 👤 Create RM User (Firestore)

```javascript
// Collection: users
{
  uid: "your_rm_uid",
  email: "rm@example.com",
  role: "rm",
  displayName: "RM Name",
  entity_assignments: {
    payers: [
      { id: "p1", name: "Insurance Company Name" }
    ],
    hospitals: [
      { id: "h1", name: "Hospital Name", code: "H001" }
    ]
  }
}
```

## 📋 Create Test Claim (Firestore)

```javascript
// Collection: claims
{
  claim_id: "CLM_TEST_001",
  claim_status: "dispatched",  // IMPORTANT!
  rm_status: "RECEIVED",
  hospital_id: "h1",
  hospital_name: "Hospital Name",
  created_at: new Date(),
  submission_date: new Date(),
  form_data: {
    payer_name: "Insurance Company Name",  // Must match!
    patient_name: "Test Patient",
    claimed_amount: 100000
  }
}
```

## 🎯 RM Statuses

### Active
- RECEIVED - Initial status
- INPROGRESS - Being worked on
- QUERY RAISED - Needs clarification
- APPROVED - Ready for payment

### Settlement (Shows Extra Form)
- **SETTLED** ✓
- **PARTIALLY SETTLED** ✓
- **RECONCILIATION** ✓

### Final
- CLOSED - Complete
- CANCELLED - Cancelled
- REPUDIATED - Rejected
- NOT FOUND - Not found by payer

## 💰 Settlement Form Fields (22 Total)

When status is SETTLED/PARTIALLY SETTLED/RECONCILIATION:

### Required
- Claim Settlement Date *
- Payment Mode * (EFT/NEFT/RTGS/Cheque)

### Banking
- Payer Bank & Account
- Provider Bank & Account
- Payment Reference No

### Amounts
- Settled + TDS Amount
- Settled Amount (Without TDS)
- TDS % and Amount
- Disallowed Amount
- Discount
- Service Fees
- Excess Paid
- Contested Amount

### Remarks
- Settled Remarks
- Medverve Review Remarks

## 🌐 API Endpoints

Base URL: `http://localhost:5002/api/rm`

```
GET  /get-claims?tab=active&limit=50
GET  /get-claim-details/:claimId
POST /update-claim/:claimId
POST /reevaluate-claim/:claimId
GET  /get-rm-stats
```

## 📱 Frontend Routes

```
/rm-inbox                           - RM inbox (list)
/rm-inbox/process/[claimId]        - Process claim
```

## 🔑 User Flow

1. Login as RM → Auto redirect to /rm-inbox
2. See claims (filtered by your payers & hospitals)
3. Click "Process" on a claim
4. Select RM Status
5. If settlement status → Fill settlement form
6. Click UPDATE → Saved!
7. Or click Re-Evaluate → Mark for review

## 🎨 Status Colors

- Blue: RECEIVED, INPROGRESS
- Orange: QUERY RAISED
- Green: SETTLED, APPROVED
- Yellow: PARTIALLY SETTLED
- Purple: RECONCILIATION
- Red: REPUDIATED, NOT FOUND
- Gray: CANCELLED, CLOSED

## ⚠️ Common Issues

### No claims showing?
- Check claim_status = "dispatched"
- Check payer name matches exactly
- Check hospital ID/name matches
- Look at browser console

### Can't update?
- Verify you're logged in as RM
- Check network tab for errors
- Ensure claim exists
- Check backend logs

### Settlement form not showing?
- Status must be SETTLED/PARTIALLY SETTLED/RECONCILIATION
- Refresh page
- Check browser console

## 📂 File Locations

### Backend
```
backend/
  middleware.py           - RM auth added
  app.py                  - RM routes registered
  routes/
    rm_routes.py          - All RM endpoints
```

### Frontend
```
frontend/src/
  app/
    rm-inbox/
      page.tsx                    - Inbox list
      layout.tsx                  - Layout wrapper
      process/
        [claimId]/
          page.tsx                - Process page
  components/
    layout/
      Sidebar.tsx                 - RM nav added
```

### Docs
```
docs/
  07_RM_SYSTEM.md                 - Full documentation
RM_SETUP_GUIDE.md                 - Setup guide
RM_SYSTEM_SUMMARY.md              - Implementation summary
RM_QUICK_REFERENCE.md             - This file
```

## 🔧 Quick Test

```bash
# 1. Start servers (both terminals)
# 2. Create RM user in Firestore
# 3. Create test claim in Firestore
# 4. Go to http://localhost:3000/login
# 5. Login with RM credentials
# 6. Should see /rm-inbox with test claim
# 7. Click "Process"
# 8. Select SETTLED
# 9. Fill settlement date and payment mode
# 10. Click UPDATE
# 11. Should redirect to inbox
# 12. Check Firestore - rm_data should be saved
```

## 📞 Support

- Full docs: `/docs/07_RM_SYSTEM.md`
- Setup guide: `/RM_SETUP_GUIDE.md`
- Summary: `/RM_SYSTEM_SUMMARY.md`

## ✅ Production Checklist

- [ ] Backend running
- [ ] Frontend running
- [ ] Firebase configured
- [ ] RM users created
- [ ] Entity assignments set
- [ ] Test claims created
- [ ] Login works
- [ ] Inbox loads
- [ ] Claims filtered correctly
- [ ] Process page opens
- [ ] Settlement form shows
- [ ] Update saves data
- [ ] Re-evaluate works
- [ ] Transaction history shows

---

**Version**: 1.0.0  
**Status**: ✅ Production Ready  
**Last Updated**: January 2024

---

*Keep this card handy for quick reference!*

