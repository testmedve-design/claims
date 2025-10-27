# RM System - Quick Setup Guide

## 🎯 Overview

The RM (Relationship Manager) system has been successfully implemented! This guide will help you set it up and start using it.

## ✅ What's Been Built

### Backend (Complete)
- ✅ RM role added to authentication system
- ✅ RM-specific middleware with entity-based access control
- ✅ Complete REST API with 5 endpoints
- ✅ Transaction history tracking
- ✅ Settlement data management
- ✅ Integration with existing claim system

### Frontend (Complete)
- ✅ RM Inbox page with filtering
- ✅ RM Claim Processing page with dynamic forms
- ✅ Settlement forms for SETTLED/PARTIALLY SETTLED/RECONCILIATION
- ✅ Sidebar navigation for RM users
- ✅ Transaction history display
- ✅ Document viewing

## 🚀 Quick Start

### Step 1: Start the Backend

```bash
cd backend
python app.py
```

Backend will run on `http://localhost:5002`

### Step 2: Start the Frontend

```bash
cd frontend
npm run dev
```

Frontend will run on `http://localhost:3000`

### Step 3: Create an RM User in Firestore

Go to Firebase Console → Firestore → `users` collection

Create a new document with this structure:

```json
{
  "uid": "rm_user_123",
  "email": "rm@example.com",
  "role": "rm",
  "displayName": "RM User Name",
  "entity_assignments": {
    "payers": [
      {
        "id": "payer_1",
        "name": "Star Health Insurance"
      },
      {
        "id": "payer_2",
        "name": "HDFC Ergo"
      }
    ],
    "hospitals": [
      {
        "id": "hospital_1",
        "name": "Apollo Hospital",
        "code": "APL001"
      },
      {
        "id": "hospital_2",
        "name": "Fortis Hospital",
        "code": "FOR002"
      }
    ]
  }
}
```

### Step 4: Create a Test Claim

In Firestore → `claims` collection:

```json
{
  "claim_id": "CLM_TEST_001",
  "claim_status": "dispatched",
  "rm_status": "RECEIVED",
  "hospital_id": "hospital_1",
  "hospital_name": "Apollo Hospital",
  "created_at": "2024-01-15T10:00:00Z",
  "submission_date": "2024-01-15T10:00:00Z",
  "form_data": {
    "payer_name": "Star Health Insurance",
    "patient_name": "John Doe",
    "age": 45,
    "gender": "Male",
    "claimed_amount": 150000,
    "total_bill_amount": 150000
  }
}
```

### Step 5: Login and Test

1. Go to `http://localhost:3000/login`
2. Login with the RM user credentials
3. You'll be redirected to `/rm-inbox`
4. You should see the test claim
5. Click "Process" to open the claim

## 📋 RM Statuses Explained

### Active Statuses
- **RECEIVED** - Just arrived in RM inbox
- **INPROGRESS** - Currently being worked on
- **QUERY RAISED** - Waiting for clarification
- **APPROVED** - Approved, waiting for payment

### Settlement Statuses (Require Financial Details)
- **SETTLED** - Fully paid
- **PARTIALLY SETTLED** - Partial payment received
- **RECONCILIATION** - In reconciliation process

### Final Statuses
- **CLOSED** - Complete and closed
- **CANCELLED** - Cancelled
- **REPUDIATED** - Rejected by payer
- **NOT FOUND** - Payer couldn't locate claim

## 🎨 Using the RM System

### Process a Claim

1. **Open Claim**:
   - From RM Inbox, click "Process" on any claim
   - View claim details in tabs (Patient, Payer, Financial)

2. **Update Status**:
   - Select RM Status from dropdown
   - Enter Status Raised Date
   - Add remarks

3. **For Settlement Statuses** (SETTLED/PARTIALLY SETTLED/RECONCILIATION):
   - Fill in settlement date
   - Select payment mode
   - Enter bank details
   - Fill financial amounts:
     - Settled amount
     - TDS details
     - Disallowed amount
     - Discounts
   - Add settlement remarks

4. **Save Changes**:
   - Click "UPDATE" to save
   - Transaction is recorded automatically
   - Redirected back to inbox

5. **Re-Evaluate**:
   - Click "Re-Evaluate" if claim needs review
   - Enter remarks
   - Status changed to INPROGRESS
   - Can edit and update again

## 🔐 Access Control

### Entity-Based Filtering

RMs only see claims that match BOTH:
1. **Assigned Payer** - Claim's payer_name must match one of RM's assigned payers
2. **Assigned Hospital** - Claim's hospital_id/hospital_name must match one of RM's assigned hospitals

Example:
```
RM assigned to:
- Payer: "Star Health"
- Hospital: "Apollo"

RM will see:
✅ Claims from Star Health at Apollo Hospital
❌ Claims from Star Health at other hospitals
❌ Claims from other payers at Apollo Hospital
```

## 📊 Data Fields

### Common Fields (All Statuses)
- RM Status *required*
- Status Raised Date
- Status Raised Remarks

### Settlement Fields (SETTLED/PARTIALLY SETTLED/RECONCILIATION)

**Banking Information**:
- Claim Settlement Date *
- Payment Mode *
- Payer Bank
- Payer Account
- Provider Bank Name
- Provider Account No
- Payment Reference No

**Financial Details**:
- Settled + TDS Amount
- Settled Amount (Without TDS)
- TDS Percentage
- TDS Amount
- Disallowed Amount
- Disallowed Reasons
- Discount As Per Payer
- UITITSL Service Fees
- Excess Paid
- Contested Amount From Payer

**Remarks**:
- Settled Remarks
- Medverve Review Remarks

## 🧪 API Endpoints

All endpoints are under `/api/rm/`:

1. **GET /api/rm/get-claims** - Get claims for RM inbox
2. **GET /api/rm/get-claim-details/:claimId** - Get claim details
3. **POST /api/rm/update-claim/:claimId** - Update claim status/data
4. **POST /api/rm/reevaluate-claim/:claimId** - Re-evaluate claim
5. **GET /api/rm/get-rm-stats** - Get RM statistics

## 🎯 Testing Checklist

- [ ] Backend running on port 5002
- [ ] Frontend running on port 3000
- [ ] RM user created in Firestore with proper entity_assignments
- [ ] Test claim created with matching payer and hospital
- [ ] RM can login successfully
- [ ] RM inbox shows filtered claims
- [ ] Can open and view claim details
- [ ] Can update claim status
- [ ] Settlement form appears for settlement statuses
- [ ] Can save updates successfully
- [ ] Transaction history shows in sidebar
- [ ] Re-evaluate button works

## 🐛 Troubleshooting

### No Claims Showing
- Check that claims have `claim_status: "dispatched"`
- Verify payer name matches exactly (case-insensitive)
- Verify hospital ID or name matches
- Check browser console for errors

### Can't Update Claim
- Ensure you're logged in as RM
- Check network tab for API errors
- Verify claim ID is correct
- Check backend logs for errors

### Settlement Fields Not Showing
- Verify status is one of: SETTLED, PARTIALLY SETTLED, RECONCILIATION
- Check browser console for React errors
- Refresh the page

### Backend Errors
```bash
# Check backend logs
cd backend
python app.py

# Look for error messages
# Common issues:
# - Firebase credentials missing
# - Port already in use
# - Python dependencies missing
```

### Frontend Errors
```bash
# Check frontend logs
cd frontend
npm run dev

# Look for compilation errors
# Common issues:
# - Node modules not installed
# - Port already in use
# - TypeScript errors
```

## 📚 Documentation

For detailed documentation, see:
- `/docs/07_RM_SYSTEM.md` - Complete system documentation
- Backend code: `/backend/routes/rm_routes.py`
- Frontend inbox: `/frontend/src/app/rm-inbox/page.tsx`
- Frontend process: `/frontend/src/app/rm-inbox/process/[claimId]/page.tsx`

## 🎉 Next Steps

1. **Create Production RM Users**:
   - Add real RM users in Firestore
   - Assign proper payers and hospitals
   - Set up email notifications (future enhancement)

2. **Test Workflows**:
   - Test each status transition
   - Verify settlement calculations
   - Test re-evaluation flow

3. **Configure Entities**:
   - Set up all payers in the system
   - Configure hospital assignments
   - Define payment modes

4. **Train Users**:
   - Share this guide with RMs
   - Conduct training sessions
   - Set up support process

## 💡 Tips

- Use the "Active Claims" tab for claims that need action
- Use "Settled Claims" tab to view completed settlements
- Transaction history shows all past actions
- Re-evaluate feature allows fixing mistakes
- Status raised date and remarks are important for auditing

## 🆘 Support

If you encounter any issues:

1. Check the browser console (F12 → Console tab)
2. Check the backend terminal for errors
3. Review the documentation in `/docs/07_RM_SYSTEM.md`
4. Check Firestore data structure
5. Verify entity assignments are correct

---

**System Status**: ✅ Complete and Ready for Use

**Version**: 1.0.0

**Last Updated**: January 2024

