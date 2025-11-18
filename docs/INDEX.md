# 📚 Complete Documentation Index

## For Frontend Developers - START HERE!

### 🎯 New to the Project? Read These First:

1. **[00_README.md](./00_README.md)** ⭐ **START HERE**
   - Complete overview
   - Quick start guide
   - System architecture
   - Common issues & solutions

2. **[01_AUTHENTICATION.md](./01_AUTHENTICATION.md)** 🔐
   - How to login users
   - Token management
   - User roles explained
   - Authorization headers
   - Session management

---

## 📑 API Route Quick Reference

### Authentication Routes (`/api/auth`)
| Method | Endpoint | Description | Role Required |
|--------|----------|-------------|---------------|
| POST | `/login` | User login | None (Public) |
| GET | `/validate-token` | Validate JWT token | None (Public) |

**Documentation**: [01_AUTHENTICATION.md](./01_AUTHENTICATION.md)

---

### Claims Routes (`/api/v1/claims`)
| Method | Endpoint | Description | Role Required |
|--------|----------|-------------|---------------|
| GET | `/get-all-claims` | Get all claims for hospital | All roles |
| GET | `/get-claim/<claim_id>` | Get specific claim | All roles |
| GET | `/get-claims-stats` | Get statistics | All roles |
| POST | `/answer-query/<claim_id>` | Answer processor query | Hospital User |
| POST | `/contest-denial/<claim_id>` | Contest denied claim | Hospital User |
| POST | `/dispatch-claim/<claim_id>` | Dispatch cleared claim | Hospital User |
| GET | `/transactions/<claim_id>` | Get transaction history | All roles |
| GET | `/export` | Export claims CSV | All roles |

**Documentation**: [02_HOSPITAL_USER_CLAIMS.md](./02_HOSPITAL_USER_CLAIMS.md)

---

### Drafts Routes (`/api/v1/drafts`)
| Method | Endpoint | Description | Role Required |
|--------|----------|-------------|---------------|
| POST | `/create` | Create new draft | Hospital User |
| PUT | `/update/<draft_id>` | Update draft | Hospital User |
| DELETE | `/delete/<draft_id>` | Delete draft | Hospital User |
| GET | `/get-all` | Get all drafts | Hospital User |
| GET | `/get/<draft_id>` | Get specific draft | Hospital User |
| POST | `/submit/<draft_id>` | Submit draft as claim | Hospital User |

**Documentation**: [03_HOSPITAL_USER_DRAFTS.md](./03_HOSPITAL_USER_DRAFTS.md)

---

### Documents Routes (`/api/v1/documents`)
| Method | Endpoint | Description | Role Required |
|--------|----------|-------------|---------------|
| POST | `/upload` | Upload document | All roles |
| GET | `/get-claim-documents/<claim_id>` | Get documents | All roles |
| GET | `/download/<document_id>` | Download document | All roles |
| DELETE | `/delete/<document_id>` | Delete document | All roles |
| GET | `/view/<document_id>` | View document | All roles |

**Documentation**: [05_DOCUMENTS.md](./05_DOCUMENTS.md)

---

### Processor Routes (`/api/processor-routes`)
| Method | Endpoint | Description | Role Required |
|--------|----------|-------------|---------------|
| GET | `/get-claims` | Get claims to process | Processor (L1-L4) |
| GET | `/get-claim-for-processing/<claim_id>` | Get claim details | Processor (L1-L4) |
| POST | `/process-claim/<claim_id>` | Process claim | Processor (L1-L4) |
| POST | `/bulk-process` | Bulk process claims | Processor (L1-L4) |
| GET | `/get-processor-stats` | Get statistics | Processor (L1-L4) |
| POST | `/lock-claim/<claim_id>` | Lock claim | Processor (L1-L4) |
| POST | `/unlock-claim/<claim_id>` | Unlock claim | Processor (L1-L4) |
| GET | `/check-claim-lock/<claim_id>` | Check lock status | Processor (L1-L4) |
| POST | `/generate-cover-letter/<claim_id>` | Generate cover letter | Processor (L1-L4) |

**Documentation**: [04_PROCESSOR_CLAIMS.md](./04_PROCESSOR_CLAIMS.md)

---

### Review Request Routes (`/api/review-request`)
| Method | Endpoint | Description | Role Required |
|--------|----------|-------------|---------------|
| GET | `/get-claims` | Get claims for review | Review Request |
| GET | `/get-claim-full/<claim_id>` | Get full claim details | Review Request |
| GET | `/get-claim-details/<claim_id>` | Get claim details | Review Request |
| POST | `/review-claim/<claim_id>` | Submit review decision | Review Request |
| POST | `/escalate-claim/<claim_id>` | Escalate claim | Review Request |
| GET | `/get-review-stats` | Get review statistics | Review Request |

**Documentation**: [08_REVIEW_REQUEST.md](./08_REVIEW_REQUEST.md) ✅ **UPDATED!**

---

### RM Routes (`/api/rm`)
| Method | Endpoint | Description | Role Required |
|--------|----------|-------------|---------------|
| GET | `/get-claims` | Get RM claims | RM/Reconciler |
| GET | `/get-claim-details/<claim_id>` | Get claim details | RM/Reconciler |
| POST | `/update-claim/<claim_id>` | Update claim status | RM/Reconciler |
| POST | `/reevaluate-claim/<claim_id>` | Re-evaluate claim | RM/Reconciler |
| GET | `/get-rm-stats` | Get RM statistics | RM/Reconciler |

**Documentation**: [07_RM_ROUTES.md](./07_RM_ROUTES.md) ✅ **FULLY IMPLEMENTED**

---

### Resources Routes (`/api/resources`)
| Method | Endpoint | Description | Role Required |
|--------|----------|-------------|---------------|
| GET | `/specialties` | Get medical specialties | Optional |
| GET | `/doctors` | Get doctors by specialty | Optional |
| GET | `/treatments` | Get treatment lines | Optional |
| GET | `/payers` | Get payers for hospital | Required |
| GET | `/id-card-types` | Get ID card types | Optional |
| GET | `/payer-types` | Get payer types | Optional |
| GET | `/gender-options` | Get gender options | Optional |

**Documentation**: [06_RESOURCES_API.md](./06_RESOURCES_API.md)

---

### Notification Routes (`/api/notifications`)
| Method | Endpoint | Description | Role Required |
|--------|----------|-------------|---------------|
| GET | `/get-notifications` | Get user notifications | All roles |
| POST | `/mark-read/<notification_id>` | Mark as read | All roles |
| POST | `/mark-all-read` | Mark all as read | All roles |
| DELETE | `/delete/<notification_id>` | Delete notification | All roles |

**Documentation**: [09_NOTIFICATION_SYSTEM.md](./09_NOTIFICATION_SYSTEM.md) ✅ **NEW!**

---

## 👥 Hospital User APIs

### For Building Hospital User Features:

3. **[02_HOSPITAL_USER_CLAIMS.md](./02_HOSPITAL_USER_CLAIMS.md)** 📋
   - Get all claims
   - Get single claim details
   - Submit new claim
   - Answer processor queries
   - Contest denied claims
   - Dispatch cleared claims
   - Upload documents to claims

4. **[03_HOSPITAL_USER_DRAFTS.md](./03_HOSPITAL_USER_DRAFTS.md)** 💾
   - Save drafts
   - Update drafts
   - Delete drafts
   - Submit draft as claim
   - Upload documents to drafts
   - Auto-save implementation

---

## 🔧 Processor APIs

### For Building Processor Features:

5. **[04_PROCESSOR_CLAIMS.md](./04_PROCESSOR_CLAIMS.md)** ⚙️
   - Get claims to process (Unprocessed & Processed tabs)
   - Get claim details for processing
   - Process claim (Approve/Reject/Query)
   - Bulk process claims
   - Check claim lock status
   - Get processing statistics
   - Complete frontend TypeScript examples

6. **[LOCK_SYSTEM_IMPLEMENTATION.md](./LOCK_SYSTEM_IMPLEMENTATION.md)** 🔒
   - Complete lock system documentation
   - Lock/unlock endpoints
   - Frontend lock UI implementation
   - Lock state preservation
   - Auto-unlock mechanism
   - Security validation
   - Testing guide

---

## 💼 RM (Relationship Manager) APIs

### For Building RM Features:

7. **[07_RM_ROUTES.md](./07_RM_ROUTES.md)** 📊 **✅ FULLY IMPLEMENTED**
   - Get RM claims (Active, Settled, All tabs)
   - Get claim details for RM processing
   - Update claim with RM status and settlement data
   - Re-evaluate claims
   - Get RM statistics
   - Complete frontend TypeScript examples
   - Settlement fields documentation
   - RM status workflow
   - Post-dispatch processing

---

## 🔍 Review Request APIs

### For Building Review Request Features:

8. **[08_REVIEW_REQUEST.md](./08_REVIEW_REQUEST.md)** 🔎 **✅ FULLY IMPLEMENTED & UPDATED**
   - Second-level review system
   - Get claims requiring review
   - Review claim decisions (approve/reject/escalate)
   - Escalate claims to higher authority
   - Review statistics and tracking
   - Financial amount reviews
   - Complete TypeScript examples
   - Frontend UI implementation guide

---

## 📄 Documents & Resources

### For File Upload & Dropdown Data:

5. **[05_DOCUMENTS.md](./05_DOCUMENTS.md)** 📎
   - Upload documents
   - Get claim documents
   - Download/View documents (Proxy endpoint)
   - Delete documents
   - Document types
   - Progress indicators
   - Multiple file uploads

6. **[06_RESOURCES_API.md](./06_RESOURCES_API.md)** 📊
   - Get specialties
   - Get doctors
   - Get treatment lines
   - Get dropdown options (ID types, payer types, etc.)
   - Cascading dropdowns implementation
   - Caching strategy

---

## 🔔 Notification System

### For Building Notification Features:

9. **[09_NOTIFICATION_SYSTEM.md](./09_NOTIFICATION_SYSTEM.md)** 🔔 **✅ FULLY IMPLEMENTED**
   - Real-time notification system
   - Notification events and triggers
   - Firestore notification storage
   - External service integration
   - Frontend notification UI
   - Recipient calculation
   - Notification cleanup
   - Read receipts

---

## 🔧 Backend Routes Overview

### Complete Backend API Reference:

10. **[10_BACKEND_ROUTES_OVERVIEW.md](./10_BACKEND_ROUTES_OVERVIEW.md)** ⚙️ **✅ COMPREHENSIVE REFERENCE**
   - Complete route structure
   - All endpoint reference with parameters
   - Role-based access control details
   - Middleware documentation
   - Utility modules (lock, transaction, notification)
   - Database collections and indexes
   - Best practices
   - Testing guide
   - Troubleshooting & debugging
   - Performance considerations

---

## 🗺️ Documentation Reading Order

### For Hospital User Module:
```
1. 00_README.md (Overview)
2. 01_AUTHENTICATION.md (Login)
3. 02_HOSPITAL_USER_CLAIMS.md (Claims)
4. 03_HOSPITAL_USER_DRAFTS.md (Drafts)
5. 05_DOCUMENTS.md (File Upload)
6. 06_RESOURCES_API.md (Dropdowns)
7. 09_NOTIFICATION_SYSTEM.md (Notifications)
```

### For Processor Module:
```
1. 00_README.md (Overview)
2. 01_AUTHENTICATION.md (Login)
3. 04_PROCESSOR_CLAIMS.md (Processing)
4. LOCK_SYSTEM_IMPLEMENTATION.md (Claim Locking)
5. 05_DOCUMENTS.md (View Files)
6. 09_NOTIFICATION_SYSTEM.md (Notifications)
```

### For RM Module:
```
1. 00_README.md (Overview)
2. 01_AUTHENTICATION.md (Login)
3. 07_RM_ROUTES.md (Settlement & Reconciliation)
4. 05_DOCUMENTS.md (View Files)
5. 09_NOTIFICATION_SYSTEM.md (Notifications)
✅ Fully Implemented
```

### For Review Request Module:
```
1. 00_README.md (Overview)
2. 01_AUTHENTICATION.md (Login)
3. 08_REVIEW_REQUEST.md (Second-Level Review)
4. 05_DOCUMENTS.md (View Files)
5. 09_NOTIFICATION_SYSTEM.md (Notifications)
✅ Fully Implemented & Updated
```

### For Backend Developers:
```
1. 10_BACKEND_ROUTES_OVERVIEW.md (Complete Reference)
2. 09_NOTIFICATION_SYSTEM.md (Notification Client)
3. LOCK_SYSTEM_IMPLEMENTATION.md (Lock Utils)
4. 01_AUTHENTICATION.md (Middleware)
✅ Complete Backend Documentation
```

---

## 🎯 Quick Reference

### Base URL
```
http://localhost:5002
```

### Authentication Header
```http
Authorization: Bearer <your_token>
```

### Common Status Codes
- `200` - Success
- `201` - Created
- `204` - No Content
- `400` - Bad Request (Validation error)
- `401` - Unauthorized (Invalid/expired token)
- `403` - Forbidden (Insufficient permissions)
- `404` - Not Found
- `409` - Conflict (Claim locked, duplicate)
- `500` - Server Error
- `503` - Service Unavailable

### User Roles
- `hospital_user` - Can create/view/submit claims
- `claim_processor` - Base processor (no limit specified)
- `claim_processor_l1` - Can approve up to ₹50,000
- `claim_processor_l2` - Can approve up to ₹200,000
- `claim_processor_l3` - Can approve up to ₹500,000
- `claim_processor_l4` - Can approve unlimited amounts
- `rm` or `reconciler` - Can handle settlements and reconciliation
- `review_request` - Can perform second-level reviews

### Claim Status Flow
```
qc_pending → qc_query ↔ qc_answered → qc_clear
              ↓
         need_more_info → qc_answered
              ↓
         claim_approved
              ↓
         dispatched → [Review Request] → reviewed → [RM Processing] → settled
              ↓
         claim_denial → claim_contested
```

### Processing Decisions
| Decision | New Status | Description |
|----------|------------|-------------|
| `qc_clear` | `qc_clear` | Clear claim for dispatch |
| `qc_query` | `qc_query` | Raise query to hospital |
| `need_more_info` | `need_more_info` | Request more information |
| `claim_approved` | `claim_approved` | Approve claim (if enabled) |
| `claim_denial` | `claim_denial` | Deny claim (if enabled) |

### Review Actions
| Action | New Status | Financial Fields Required |
|--------|------------|---------------------------|
| `reviewed` | `reviewed` | Yes |
| `approve` | `review_approved` | No |
| `reject` | `review_rejected` | No |
| `request_more_info` | `review_info_needed` | No |
| `escalate` | `review_escalated` | No |

### RM Status Options
| Status | Description | Settlement Data Required |
|--------|-------------|--------------------------|
| `received` | Received by payer | No |
| `query_raised` | Payer query | No |
| `settled` | Fully settled | Yes |
| `partially_settled` | Partial settlement | Yes |
| `reconciliation` | In reconciliation | Yes |
| `repudiated` | Rejected by payer | No |
| `cancelled` | Cancelled | No |
| `closed` | Closed | No |
| `not_found` | Not found | No |

---

## 💡 Best Practices

### API Best Practices
1. **Always check token expiry** - Handle 401 responses and refresh token
2. **Use TypeScript interfaces** - Type safety for API responses
3. **Implement error handling** - Show user-friendly error messages
4. **Add loading states** - Better UX during API calls
5. **Cache resources** - Reduce API calls for dropdown data
6. **Validate before submit** - Client-side validation first
7. **Auto-save drafts** - Prevent data loss (every 30 seconds)
8. **Show upload progress** - For file uploads
9. **Handle concurrent access** - Check claim locks before processing
10. **Test with all roles** - Hospital, Processor, RM, Review Request

### Frontend Best Practices
```typescript
// 1. Always handle errors gracefully
try {
  const response = await fetch(url, options);
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Request failed');
  }
  return await response.json();
} catch (error) {
  console.error('API Error:', error);
  toast.error(error.message);
}

// 2. Use loading states
const [loading, setLoading] = useState(true);
setLoading(true);
const data = await fetchClaims();
setLoading(false);

// 3. Cache resources
const [specialties, setSpecialties] = useState([]);
useEffect(() => {
  const cached = localStorage.getItem('specialties');
  if (cached) {
    setSpecialties(JSON.parse(cached));
  } else {
    fetchSpecialties().then(data => {
      setSpecialties(data);
      localStorage.setItem('specialties', JSON.stringify(data));
    });
  }
}, []);

// 4. Handle claim locks
const lockClaim = async (claimId) => {
  try {
    await fetch(`${API_BASE_URL}/processor-routes/lock-claim/${claimId}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    if (error.message.includes('locked')) {
      alert('Claim is locked by another processor');
    }
  }
};

// 5. Auto-save drafts
useEffect(() => {
  const interval = setInterval(() => {
    if (formData && isDirty) {
      saveDraft(formData);
    }
  }, 30000); // Every 30 seconds
  
  return () => clearInterval(interval);
}, [formData, isDirty]);
```

---

## 🔍 Need Help?

### Can't find what you need?
1. Check the main **00_README.md** first
2. Look at **10_BACKEND_ROUTES_OVERVIEW.md** for complete API reference
3. Check the specific module documentation (01-09)
4. Review the guides in `guides/` folder
5. Check status reports in `status/` folder

### Common Questions:

**Q: How do I authenticate users?**  
A: See [01_AUTHENTICATION.md](./01_AUTHENTICATION.md) - Complete login flow with Firebase Auth

**Q: How do I submit a claim?**  
A: See [02_HOSPITAL_USER_CLAIMS.md](./02_HOSPITAL_USER_CLAIMS.md#3-submit-new-claim) - Full submission process

**Q: How do I upload files?**  
A: See [05_DOCUMENTS.md](./05_DOCUMENTS.md#1-upload-document) - Upload with compression

**Q: How do I process claims?**  
A: See [04_PROCESSOR_CLAIMS.md](./04_PROCESSOR_CLAIMS.md#3-process-claim) - Process with locking

**Q: How does claim locking work?**  
A: See [LOCK_SYSTEM_IMPLEMENTATION.md](./LOCK_SYSTEM_IMPLEMENTATION.md) - Complete lock system

**Q: How do I get dropdown options?**  
A: See [06_RESOURCES_API.md](./06_RESOURCES_API.md) - Resources API with caching

**Q: What are the claim statuses?**  
A: See [00_README.md](./00_README.md#-claim-statuses) or this document's Quick Reference

**Q: How does the notification system work?**  
A: See [09_NOTIFICATION_SYSTEM.md](./09_NOTIFICATION_SYSTEM.md) - Complete notification guide

**Q: Where can I find all backend routes?**  
A: See [10_BACKEND_ROUTES_OVERVIEW.md](./10_BACKEND_ROUTES_OVERVIEW.md) - Comprehensive API reference

**Q: How does the RM module work?**  
A: See [07_RM_ROUTES.md](./07_RM_ROUTES.md) - RM settlement & reconciliation

**Q: How does the Review Request module work?**  
A: See [08_REVIEW_REQUEST.md](./08_REVIEW_REQUEST.md) - Second-level review system

**Q: What are the processor approval limits?**  
A: L1: ₹50K, L2: ₹200K, L3: ₹500K, L4: Unlimited

**Q: How do I handle errors?**  
A: Check status codes, parse error messages, show user-friendly toasts

**Q: How do I test my implementation?**  
A: Use Postman collection in `/tests/postman/` with test credentials

---

## 📞 Support

Contact the backend team for:
- Test credentials
- Database issues
- API bugs
- New feature requests
- Documentation clarifications
- Access to test environment

---

## 📦 Complete Documentation List

### Core Documentation (Read These First)
1. **[00_README.md](./00_README.md)** - Overview & Quick Start ⭐
2. **[01_AUTHENTICATION.md](./01_AUTHENTICATION.md)** - Authentication & Authorization 🔐
3. **[10_BACKEND_ROUTES_OVERVIEW.md](./10_BACKEND_ROUTES_OVERVIEW.md)** - Complete Backend Reference ⚙️ ✅

### Module-Specific Documentation
3. **[02_HOSPITAL_USER_CLAIMS.md](./02_HOSPITAL_USER_CLAIMS.md)** - Hospital User Claims APIs 📋
4. **[03_HOSPITAL_USER_DRAFTS.md](./03_HOSPITAL_USER_DRAFTS.md)** - Drafts Management 💾
5. **[04_PROCESSOR_CLAIMS.md](./04_PROCESSOR_CLAIMS.md)** - Processor APIs ⚙️
6. **[07_RM_ROUTES.md](./07_RM_ROUTES.md)** - RM Operations 📊 ✅
7. **[08_REVIEW_REQUEST.md](./08_REVIEW_REQUEST.md)** - Review Request System 🔎 ✅

### Feature Documentation
8. **[05_DOCUMENTS.md](./05_DOCUMENTS.md)** - Document Management 📎
9. **[06_RESOURCES_API.md](./06_RESOURCES_API.md)** - Resources & Dropdowns 📊
10. **[09_NOTIFICATION_SYSTEM.md](./09_NOTIFICATION_SYSTEM.md)** - Notification System 🔔 ✅
11. **[LOCK_SYSTEM_IMPLEMENTATION.md](./LOCK_SYSTEM_IMPLEMENTATION.md)** - Claim Locking 🔒

### Additional Documentation
12. **[CHANGELOG.md](./CHANGELOG.md)** - Version History & Changes
13. **[FINAL_DOCUMENTATION_SUMMARY.md](./FINAL_DOCUMENTATION_SUMMARY.md)** - Overview of All Docs
14. **[ROLE_BASED_DOCUMENTATION_SUMMARY.md](./ROLE_BASED_DOCUMENTATION_SUMMARY.md)** - Role-Based Guide

---

## 🚀 Implementation Status

### ✅ Fully Implemented & Documented
- Authentication System
- Hospital User Claims
- Hospital User Drafts
- Document Management
- Resources API
- Processor Claims (with Locking)
- **RM Routes (Settlement & Reconciliation)** ✅
- **Review Request System (Second-Level Review)** ✅
- **Notification System (Real-time)** ✅
- **Complete Backend API Reference** ✅

### 🎯 All Modules Production Ready
All four user roles are fully implemented:
- ✅ Hospital Users
- ✅ Claim Processors (L1-L4)
- ✅ RM/Reconcilers
- ✅ Review Request Users

---

**Last Updated**: January 2025  
**Version**: 2.0  
**Backend Version**: Python 3.9 + Flask v2.0  
**Database**: Firebase Firestore  
**Authentication**: Firebase Auth  
**Storage**: Firebase Storage

---

**Happy Coding! 🚀**

**Need something specific? Check the [Backend Routes Overview](./10_BACKEND_ROUTES_OVERVIEW.md) for the complete API reference!**
