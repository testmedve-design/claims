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

## 👥 Hospital User APIs

### For Building Hospital User Features:

3. **[02_HOSPITAL_USER_CLAIMS.md](./02_HOSPITAL_USER_CLAIMS.md)** 📋
   - Get all claims
   - Get single claim details
   - Submit new claim
   - Answer processor queries
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

---

## 📄 Documents & Resources

### For File Upload & Dropdown Data:

6. **[05_DOCUMENTS.md](./05_DOCUMENTS.md)** 📎
   - Upload documents
   - Get claim documents
   - Download/View documents (Proxy endpoint)
   - Delete documents
   - Document types
   - Progress indicators
   - Multiple file uploads

7. **[06_RESOURCES_API.md](./06_RESOURCES_API.md)** 📊
   - Get specialties
   - Get doctors
   - Get treatment lines
   - Get dropdown options (ID types, payer types, etc.)
   - Cascading dropdowns implementation
   - Caching strategy

---

## 📖 Additional Documentation

### Older/Reference Documentation:

#### API Documentation (api/)
- `API_DOCUMENTATION_OVERVIEW.md` - High-level API overview
- `API_DOCUMENTATION_AUTH.md` - Authentication details
- `API_DOCUMENTATION_CLAIMS.md` - Claims API reference
- `API_DOCUMENTATION_DRAFTS.md` - Drafts API reference
- `API_DOCUMENTATION_DOCUMENTS.md` - Documents API reference
- `API_DOCUMENTATION_RESOURCES.md` - Resources API reference
- `API_DOCUMENTATION_INBOX.md` - Inbox/Processing APIs
- `API_DOCUMENTATION_FIREBASE.md` - Firebase configuration
- `API_DOCUMENTATION_CHECKLIST.md` - API checklist

#### Guides (guides/)
- `FIREBASE_SETUP_GUIDE.md` - Firebase setup (if needed)
- `FIREBASE_API_KEY_GUIDE.md` - API key management
- `AUTHENTICATION_LOGOUT_GUIDE.md` - Logout implementation
- `DOCUMENT_CHECKLIST_GUIDE.md` - Document requirements
- `DRAFTS_ROUTES.md` - Drafts routes reference

#### Status Reports (status/)
- `APPLICATION_STATUS.md` - Current system status
- `BACKEND_STATUS_REPORT.md` - Backend health
- `ROLE_BASED_ROUTES_DOCUMENTATION.md` - Role-based access
- `CLEAN_SOLUTION.md` - Architecture overview
- Various other status and fix reports

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
```

### For Processor Module:
```
1. 00_README.md (Overview)
2. 01_AUTHENTICATION.md (Login)
3. 04_PROCESSOR_CLAIMS.md (Processing)
4. 05_DOCUMENTS.md (View Files)
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
- `400` - Bad Request
- `401` - Unauthorized (Invalid token)
- `403` - Forbidden (Insufficient permissions)
- `404` - Not Found
- `409` - Conflict (Claim locked)
- `500` - Server Error

### User Roles
- `hospital_user` - Can create/view claims
- `claim_processor` or `claim_processor_l4` - Can process claims

### Claim Statuses
- `qc_pending` - New, awaiting review
- `qc_query` - Processor raised query
- `qc_answered` - Hospital answered query
- `qc_clear` - QC cleared
- `claim_approved` - Approved
- `claim_denial` - Rejected
- `need_more_info` - More info needed

---

## 💡 Best Practices

1. **Always check token expiry** - Handle 401 responses
2. **Use TypeScript interfaces** - Type safety for API responses
3. **Implement error handling** - Show user-friendly messages
4. **Add loading states** - Better UX during API calls
5. **Cache resources** - Reduce API calls for dropdown data
6. **Validate before submit** - Client-side validation
7. **Auto-save drafts** - Prevent data loss
8. **Show upload progress** - For file uploads
9. **Handle concurrent access** - Check claim locks
10. **Test with both roles** - Hospital user and Processor

---

## 🔍 Need Help?

### Can't find what you need?
1. Check the main **00_README.md** first
2. Look in the specific module documentation (01-06)
3. Check the API reference in `api/` folder
4. Review the guides in `guides/` folder
5. Check status reports in `status/` folder

### Common Questions:

**Q: How do I authenticate users?**  
A: See [01_AUTHENTICATION.md](./01_AUTHENTICATION.md)

**Q: How do I submit a claim?**  
A: See [02_HOSPITAL_USER_CLAIMS.md](./02_HOSPITAL_USER_CLAIMS.md#3-submit-new-claim)

**Q: How do I upload files?**  
A: See [05_DOCUMENTS.md](./05_DOCUMENTS.md#1-upload-document)

**Q: How do I process claims?**  
A: See [04_PROCESSOR_CLAIMS.md](./04_PROCESSOR_CLAIMS.md#3-process-claim)

**Q: How do I get dropdown options?**  
A: See [06_RESOURCES_API.md](./06_RESOURCES_API.md)

**Q: What are the claim statuses?**  
A: See [00_README.md](./00_README.md#-claim-statuses)

---

## 📞 Support

Contact the backend team for:
- Test credentials
- Database issues
- API bugs
- New feature requests
- Documentation clarifications

---

**Last Updated**: October 2025  
**Version**: 1.0  
**Backend Version**: v1.0

---

**Happy Coding! 🚀**

