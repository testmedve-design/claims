# 🔍 Backend Testing Guide

## ✅ **Test Your Backend API Endpoints**

Use these URLs to test if your backend is working properly:

---

## 🎯 **Essential Tests:**

### **1. Health Check (Most Important)**
```
GET https://your-backend-service.onrender.com/api/firebase/health
```
**Expected Response:**
```json
{
  "success": true,
  "message": "Firebase connection successful",
  "timestamp": "2024-10-24T10:00:00Z"
}
```

### **2. Login Endpoint**
```
POST https://your-backend-service.onrender.com/api/auth/login
```
**Test with:**
```json
{
  "email": "test@example.com",
  "password": "testpassword"
}
```

### **3. Claims List**
```
GET https://your-backend-service.onrender.com/api/v1/claims/list
```

### **4. Resources Endpoints**
```
GET https://your-backend-service.onrender.com/api/v1/resources/specialties
GET https://your-backend-service.onrender.com/api/v1/resources/doctors
GET https://your-backend-service.onrender.com/api/v1/resources/treatment-lines
```

---

## 🔧 **How to Test:**

### **Method 1: Browser**
1. Open your browser
2. Go to: `https://your-backend-service.onrender.com/api/firebase/health`
3. You should see a JSON response

### **Method 2: curl (Terminal)**
```bash
curl https://your-backend-service.onrender.com/api/firebase/health
```

### **Method 3: Postman/Insomnia**
1. Create a new request
2. Set method to GET
3. Enter URL: `https://your-backend-service.onrender.com/api/firebase/health`
4. Send request

---

## 📊 **Expected Results:**

### **✅ Working Backend:**
- **Health Check**: Returns 200 with success message
- **Login**: Returns 401 (unauthorized) or 200 (if credentials valid)
- **Claims**: Returns 401 (unauthorized) - this is normal without auth
- **Resources**: Returns 200 with data

### **❌ Not Working:**
- **404 Error**: Route not found
- **500 Error**: Server error
- **Connection Error**: Service not running

---

## 🎯 **Quick Test Checklist:**

- [ ] **Health Check**: `GET /api/firebase/health` → 200 OK
- [ ] **Login**: `POST /api/auth/login` → 401 or 200
- [ ] **Claims**: `GET /api/v1/claims/list` → 401 (normal without auth)
- [ ] **Resources**: `GET /api/v1/resources/specialties` → 200 OK

---

## 🚀 **If Tests Pass:**

Your backend is working perfectly! You can now:
1. **Deploy the frontend**
2. **Connect frontend to backend**
3. **Use the complete application**

---

## ❌ **If Tests Fail:**

1. **Check Render logs** for errors
2. **Verify environment variables** are set
3. **Check Firebase credentials** are correct
4. **Redeploy** if needed

---

**Status**: ✅ **Ready to test your backend!**  
**Next Step**: ✅ **Run the tests above**
