# 🚀 Deploy Both Backend & Frontend from Same Repository

## ✅ **YES! You can deploy both services from the same repository!**

Render supports deploying multiple services from a single repository using `render.yaml`. This is perfect for your Hospital Claims Management System.

---

## 📋 **What You'll Get:**

### **Backend Service:**
- **URL**: `https://hospital-claims-backend.onrender.com`
- **Type**: Flask API
- **Features**: Authentication, Claims, Documents, Processing

### **Frontend Service:**
- **URL**: `https://hospital-claims-frontend.onrender.com`
- **Type**: Next.js React App
- **Features**: User Interface, Dashboard, Forms

---

## 🔧 **Deployment Steps:**

### **Step 1: Push Updated Configuration**
The `render.yaml` file has been updated to include both services. Push the changes:

```bash
git add render.yaml
git commit -m "Add frontend service to render.yaml"
git push origin main
```

### **Step 2: Deploy on Render**

#### **Option A: Automatic Deployment (Recommended)**
1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click "New" → "Blueprint"
3. Connect repository: `https://github.com/testmedve-design/claims.git`
4. Render will automatically detect `render.yaml`
5. Click "Apply" - Both services will be created automatically!

#### **Option B: Manual Deployment**
1. **Deploy Backend:**
   - New → Web Service
   - Connect: `https://github.com/testmedve-design/claims.git`
   - Name: `hospital-claims-backend`
   - Environment: Python
   - Build: `pip install -r backend/requirements.txt`
   - Start: `python start_production.py`

2. **Deploy Frontend:**
   - New → Web Service
   - Connect: `https://github.com/testmedve-design/claims.git`
   - Name: `hospital-claims-frontend`
   - Environment: Node
   - Build: `cd frontend && npm install && npm run build`
   - Start: `cd frontend && npm start`

---

## ⚙️ **Environment Variables Setup:**

### **Backend Environment Variables:**
```bash
FLASK_ENV=production
DEBUG=false
SECRET_KEY=your-secret-key-here
JWT_SECRET_KEY=your-jwt-secret-key-here
FIREBASE_PROJECT_ID=mv20-a1a09
FIREBASE_STORAGE_BUCKET=mv20-a1a09.firebasestorage.app
FIREBASE_CREDENTIALS={"type":"service_account",...} # Paste full JSON
CORS_ORIGINS=https://hospital-claims-frontend.onrender.com
```

### **Frontend Environment Variables:**
```bash
NODE_ENV=production
NEXT_PUBLIC_API_URL=https://hospital-claims-backend.onrender.com
NEXT_PUBLIC_FIREBASE_API_KEY=your-firebase-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=mv20-a1a09.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=mv20-a1a09
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=mv20-a1a09.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id
```

---

## 🔗 **Service Communication:**

### **How They Connect:**
- **Frontend** → **Backend**: API calls to `https://hospital-claims-backend.onrender.com`
- **Backend** → **Frontend**: CORS configured for `https://hospital-claims-frontend.onrender.com`

### **URLs After Deployment:**
- **Backend API**: `https://hospital-claims-backend.onrender.com`
- **Frontend App**: `https://hospital-claims-frontend.onrender.com`
- **Health Check**: `https://hospital-claims-backend.onrender.com/api/firebase/health`

---

## 📁 **Repository Structure for Both Services:**

```
https://github.com/testmedve-design/claims.git
├── backend/                    # ✅ Backend service
│   ├── app.py                  # Flask app
│   ├── requirements.txt        # Python dependencies
│   └── routes/                 # API routes
├── frontend/                   # ✅ Frontend service
│   ├── package.json           # Node dependencies
│   ├── next.config.ts         # Next.js config
│   └── src/                    # React components
├── render.yaml                 # ✅ Both services config
├── start_production.py         # ✅ Backend startup
└── docs/                       # ✅ Documentation
```

---

## 🎯 **Benefits of Single Repository Deployment:**

### ✅ **Advantages:**
- **Single Source**: All code in one place
- **Easy Updates**: Push once, both services update
- **Consistent Versions**: Backend and frontend always in sync
- **Simplified Management**: One repository to manage
- **Cost Effective**: Free tier for both services

### ✅ **Render Features:**
- **Automatic Deployments**: Push to GitHub → Auto deploy
- **Environment Variables**: Secure configuration
- **Health Checks**: Automatic monitoring
- **Logs**: Centralized logging for both services
- **Scaling**: Easy to scale both services

---

## 🚀 **Deployment Process:**

### **1. Push Changes:**
```bash
git add render.yaml
git commit -m "Configure both backend and frontend services"
git push origin main
```

### **2. Deploy on Render:**
1. Go to Render Dashboard
2. New → Blueprint
3. Connect: `https://github.com/testmedve-design/claims.git`
4. Apply - Both services created automatically!

### **3. Set Environment Variables:**
- Add Firebase credentials to backend
- Add Firebase config to frontend
- Update CORS origins

### **4. Test Deployment:**
- Backend: `https://hospital-claims-backend.onrender.com/api/firebase/health`
- Frontend: `https://hospital-claims-frontend.onrender.com`

---

## ✅ **Ready to Deploy Both Services!**

Your repository is now configured to deploy:
- ✅ **Backend API** (Flask)
- ✅ **Frontend App** (Next.js)
- ✅ **From same repository**
- ✅ **Automatic deployment**
- ✅ **Production ready**

**Deploy both services with one click on Render!** 🚀

---

**Repository**: `https://github.com/testmedve-design/claims.git`  
**Render Blueprint**: Ready to deploy both services  
**Status**: ✅ **DEPLOYMENT READY**
