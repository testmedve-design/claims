# Hospital Claims Management System

A comprehensive hospital claims management system built with Flask (Python) backend and Next.js (React) frontend, integrated with Firebase for authentication, database, and file storage.

## 🚀 Features

### ✅ Core Functionality
- **Claims Management**: Submit, track, and manage insurance claims
- **Draft System**: Save incomplete claims and submit later
- **Document Checklist**: Dynamic document requirements based on payer and specialty
- **Document Upload**: Secure file upload and management
- **Authentication**: Role-based access control with Firebase Auth
- **Workflow Management**: Inbox system for claim processing
- **User Management**: Complete user administration system
- **Letter Generation**: Processor actions auto-generate approval, denial, and need-more-info letters that can be downloaded from transaction history
- **Dispute Resolution**: Hospital users can answer queries, supply additional information, or contest denials with supporting documents

### ✅ API Modules (9 Complete Modules)
1. **Authentication API** - User login and token management
2. **Claims API** - Claim submission and management
3. **Drafts API** - Draft save/retrieve/submit functionality
4. **Checklist API** - Document requirements management
5. **Documents API** - File upload/download management
6. **Resources API** - Reference data (payers, specialties, doctors)
7. **Inbox API** - Workflow and assignment management
8. **Users API** - User profile and administration
9. **Firebase API** - Health checks and system monitoring

## 🛠️ Technology Stack

### Backend
- **Python 3.13+**
- **Flask** - Web framework
- **Firebase Admin SDK** - Authentication and database
- **Firestore** - NoSQL database
- **Firebase Storage** - File storage

### Frontend
- **Next.js 15** - React framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **React Hook Form** - Form management
- **Shadcn/ui** - UI components

## 📋 Prerequisites

- Python 3.13+
- Node.js 18+
- Firebase project with Firestore and Storage enabled
- Firebase service account key

## 🚀 Quick Start

### 1. Clone the Repository
```bash
git clone https://github.com/medverve/Claims.git
cd Claims
```

### 2. Backend Setup
```bash
# Create virtual environment
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
cd backend
pip install -r requirements.txt

# Add Firebase service account key
# Place your ServiceAccountKey.json in the backend/ directory

# Start the backend server
cd ..
./scripts/start_backend.sh
```

The backend will be available at `http://localhost:5002`

### 3. Frontend Setup
```bash
# Start the frontend development server
./scripts/start_frontend.sh
```

The frontend will be available at `http://localhost:3000`

## 📚 API Documentation

Complete API documentation is available in the `docs/api/` directory:

- **`docs/api/API_DOCUMENTATION_OVERVIEW.md`** - Master overview and quick start
- **`docs/api/API_DOCUMENTATION_AUTH.md`** - Authentication API
- **`docs/api/API_DOCUMENTATION_CLAIMS.md`** - Claims API
- **`docs/api/API_DOCUMENTATION_DRAFTS.md`** - Drafts API
- **`docs/api/API_DOCUMENTATION_CHECKLIST.md`** - Document Checklist API
- **`docs/api/API_DOCUMENTATION_DOCUMENTS.md`** - Documents API
- **`docs/api/API_DOCUMENTATION_RESOURCES.md`** - Resources API
- **`docs/api/API_DOCUMENTATION_INBOX.md`** - Inbox API
- **`docs/api/API_DOCUMENTATION_USERS.md`** - Users API
- **`docs/api/API_DOCUMENTATION_FIREBASE.md`** - Firebase API

## 🔐 Authentication

### Test Credentials
- **Email**: `employee@test.com`
- **Password**: `password123`
- **Role**: `hospital_user`

### Allowed Roles
- `hospital_user` - Hospital staff who can submit claims
- `claim_processor` - Staff who can process claims
- `reconciler` - Staff who can reconcile claims

## 🧪 Testing

### Test API Endpoints
```bash
# Login
curl -X POST "http://localhost:5002/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email": "employee@test.com", "password": "password123"}'

# Get Checklist (Test endpoint)
curl -X GET "http://localhost:5002/api/v1/checklist/get-checklist-test?payer_name=CGHS&specialty=Cardiology"

# Get Drafts (Test endpoint)
curl -X GET "http://localhost:5002/api/v1/drafts/get-drafts-test"
```

## 📊 Current Status

### ✅ Working Components
- **Authentication System** - Login and token generation
- **Checklist System** - Document requirements display
- **Drafts System** - Save and retrieve drafts
- **Claims System** - Submit and manage claims
- **Document Management** - Upload and download files
- **User Management** - Profile and administration

### ⚠️ Development Notes
- Test endpoints are active for development
- Authentication middleware needs token type fix for production
- All core functionality is working

## 🔧 Configuration

### Environment Variables
Create a `.env` file in the backend directory:
```env
FIREBASE_CREDENTIALS_PATH=ServiceAccountKey.json
FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
```

For the frontend, create `frontend/.env.local` (or set the variables in your hosting environment):
```env
NEXT_PUBLIC_FIREBASE_API_KEY=your-web-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=1234567890
NEXT_PUBLIC_FIREBASE_APP_ID=1:1234567890:web:abcdef123456
```

### Firebase Setup
1. Create a Firebase project
2. Enable Firestore Database
3. Enable Firebase Storage
4. Generate service account key
5. Place `ServiceAccountKey.json` in `backend/` directory

## 📁 Project Structure

```
├── backend/                      # Flask backend
│   ├── app/                      # Main application
│   │   ├── routes/               # API endpoints
│   │   ├── middleware/           # Authentication middleware
│   │   └── config/               # Configuration files
│   ├── requirements.txt          # Python dependencies
│   ├── ServiceAccountKey.json   # Firebase service account
│   └── app.py                    # Main application entry point
├── frontend/                     # Next.js frontend
│   ├── src/app/                  # App pages
│   ├── src/components/          # React components
│   ├── src/services/             # API services
│   └── src/types/                # TypeScript types
├── docs/                         # Documentation
│   ├── api/                      # API documentation
│   ├── guides/                   # Setup and usage guides
│   └── status/                   # Status reports
├── scripts/                       # Utility scripts
│   ├── start_backend.sh          # Backend startup script
│   └── start_frontend.sh         # Frontend startup script
└── README.md                     # This file
└── docs/CHANGELOG.md             # Recent feature updates and release notes
```

## 🚀 Deployment

### Production Checklist
1. Fix authentication middleware token type handling
2. Remove test endpoints
3. Configure production Firebase project
4. Set up environment variables
5. Configure HTTPS
6. Set up monitoring and logging

## 📞 Support

For support and questions:
- Check the API documentation files in `docs/api/`
- Review `docs/guides/CURRENT_STATUS_AND_FIXES.md` for current issues
- Check troubleshooting guides in `docs/guides/`

## 📄 License

This project is proprietary software developed for MedVerve.

## 🔄 Version

- **Version**: 1.0.0
- **Last Updated**: January 15, 2024
- **Status**: Development Ready