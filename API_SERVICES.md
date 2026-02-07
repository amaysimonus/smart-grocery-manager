# API Services Required for Smart Grocery Manager

## 🔑 Required API Keys & Services

### 1. **OCR (Optical Character Recognition) Service**

#### **Recommended: Google Cloud Vision API**
```bash
# Environment Variables
REACT_APP_GOOGLE_CLOUD_VISION_API_KEY=AIzaSyC...your-api-key
REACT_APP_OCR_SERVICE=google_vision
```

**Cost**: ~$1.50 per 1000 receipt images  
**Accuracy**: 95%+ for text extraction from receipts  
**Features**: 
- Multi-language support (English, Traditional Chinese)
- Handwriting recognition
- Receipt structure understanding
- Fast processing (1-2 seconds per image)

**Alternative Options**:
- **Tesseract.js** (Free, self-hosted)
  - `REACT_APP_OCR_SERVICE=tesseract`
  - No API key required
  - 85-90% accuracy for clear receipts
  - Server resource intensive

- **AWS Textract** 
  - `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`
  - $1.00 per 1000 images
  - Good for structured receipt data

### 2. **Authentication Services**

#### **Google OAuth**
```bash
# Required for Google Sign-In
REACT_APP_GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
REACT_APP_GOOGLE_CLIENT_SECRET=your-google-client-secret

# OAuth Configuration
# Redirect URI: https://your-domain.com/auth/google/callback
# JavaScript origins: https://your-domain.com
```

**Setup Steps**:
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create new project: "Smart Grocery Manager"
3. Enable "Google Sign-In API"
4. Create OAuth 2.0 credentials
5. Add your domain as authorized JavaScript origin
6. Configure redirect URI

#### **Apple Sign-In**
```bash
# Required for Apple Sign-In
REACT_APP_APPLE_CLIENT_ID=com.yourdomain.grocerymanager
REACT_APP_APPLE_TEAM_ID=your-apple-developer-team-id
```

**Setup Steps**:
1. Login to [Apple Developer Portal](https://developer.apple.com)
2. Create new App ID: "Smart Grocery Manager"
3. Enable "Sign In with Apple"
4. Configure service ID and return URLs
5. Requires Apple Developer Program ($99/year)

### 3. **Database Service**

#### **Option 1: Zeabur PostgreSQL Add-on**
```bash
# Automatic with Zeabur hosting
DATABASE_URL=postgresql://username:password@host:port/database
```

#### **Option 2: Supabase (Recommended for Full-Stack)**
```bash
# Supabase provides Database + Auth + Storage + Real-time
REACT_APP_SUPABASE_URL=https://your-project.supabase.co
REACT_APP_SUPABASE_ANON_KEY=your-anon-key
REACT_APP_SUPABASE_SERVICE_ROLE_KEY=your-service-key
```

**Features**:
- PostgreSQL database
- Real-time subscriptions
- Built-in authentication (can replace Google/Apple OAuth)
- File storage (10GB free)
- Auto-generated API docs

#### **Option 3: PlanetScale**
```bash
# MySQL-compatible with Vitess
DATABASE_URL=mysql://username:password@host:port/database
REACT_APP_PLANETSCALE_USERNAME=your-username
REACT_APP_PLANETSCALE_PASSWORD=your-password
```

### 4. **File Storage Service**

#### **Zeabur Object Storage**
```bash
# For uploaded receipt images and exports
REACT_APP_STORAGE_ENDPOINT=https://storage.zeabur.com
REACT_APP_STORAGE_BUCKET=smart-grocery-uploads
REACT_APP_STORAGE_ACCESS_KEY=zeabur-access-key
REACT_APP_STORAGE_SECRET_KEY=zeabur-secret-key
REACT_APP_STORAGE_REGION=us-east-1
```

**Setup Steps**:
1. In Zeabur dashboard, go to "Storage" section
2. Create new bucket: "smart-grocery-uploads"
3. Generate access keys
4. Configure CORS for your domain

**Alternative: AWS S3**
```bash
REACT_APP_AWS_S3_BUCKET=your-s3-bucket
REACT_APP_AWS_ACCESS_KEY_ID=your-access-key
REACT_APP_AWS_SECRET_ACCESS_KEY=your-secret-key
REACT_APP_AWS_REGION=us-east-1
```

### 5. **Real-time Notifications**

#### **WebSocket Service**
```bash
# For real-time budget alerts and notifications
REACT_APP_WS_URL=wss://your-api-domain.com/ws
REACT_APP_NOTIFICATION_SERVICE=pusher

# Pusher (Easy Alternative)
REACT_APP_PUSHER_APP_ID=your-pusher-app-id
REACT_APP_PUSHER_KEY=your-pusher-key
REACT_APP_PUSHER_SECRET=your-pusher-secret
REACT_APP_PUSHER_CLUSTER=mt1
```

### 6. **Email Service** (Optional)

#### **SendGrid**
```bash
# For weekly reports and budget alerts
REACT_APP_SENDGRID_API_KEY=SG.your-sendgrid-api-key
REACT_APP_FROM_EMAIL=noreply@yourdomain.com
```

## 🔧 Environment Configuration

### **Complete .env.example**
```bash
# ===========================================
# Application Configuration
# ===========================================
REACT_APP_API_URL=https://api.yourdomain.com/api/v1
REACT_APP_ENV=production
REACT_APP_VERSION=1.0.0
REACT_APP_BUILD_DATE=2024-01-XX

# ===========================================
# OCR Service Configuration
# ===========================================
REACT_APP_OCR_SERVICE=google_vision
GOOGLE_CLOUD_VISION_API_KEY=AIzaSyC...your-api-key

# ===========================================
# Authentication Configuration
# ===========================================
REACT_APP_GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
REACT_APP_GOOGLE_CLIENT_SECRET=your-google-client-secret
REACT_APP_APPLE_CLIENT_ID=com.yourdomain.grocerymanager

# ===========================================
# Database Configuration
# ===========================================
REACT_APP_SUPABASE_URL=https://your-project.supabase.co
REACT_APP_SUPABASE_ANON_KEY=your-anon-key
REACT_APP_SUPABASE_SERVICE_ROLE_KEY=your-service-key

# ===========================================
# Storage Configuration
# ===========================================
REACT_APP_STORAGE_ENDPOINT=https://storage.zeabur.com
REACT_APP_STORAGE_BUCKET=smart-grocery-uploads
REACT_APP_STORAGE_ACCESS_KEY=your-storage-access-key
REACT_APP_STORAGE_SECRET_KEY=your-storage-secret-key

# ===========================================
# Real-time Configuration
# ===========================================
REACT_APP_WS_URL=wss://api.yourdomain.com/ws
REACT_APP_PUSHER_APP_ID=your-pusher-app-id
REACT_APP_PUSHER_KEY=your-pusher-key
REACT_APP_PUSHER_CLUSTER=mt1

# ===========================================
# Email Service Configuration
# ===========================================
REACT_APP_SENDGRID_API_KEY=SG.your-sendgrid-api-key
REACT_APP_FROM_EMAIL=noreply@yourdomain.com

# ===========================================
# Analytics and Monitoring
# ===========================================
REACT_APP_GA_TRACKING_ID=G-XXXXXXXXXX
REACT_APP_SENTRY_DSN=https://your-sentry-dsn
REACT_APP_HOTJAR_ID=your-hotjar-id
```

## 📊 Service Cost Estimates (Monthly)

### **Free Tier Options**
- **Tesseract.js**: $0 (self-hosted)
- **Supabase**: $0 (10GB database, 500MB storage)
- **Zeabur Object Storage**: $0 (1GB free)
- **Pusher**: $0 (100 connections/day)

### **Paid Services**
- **Google Vision API**: ~$15-30 for 1000-2000 receipt images
- **SendGrid**: $15 for 40,000 emails (weekly reports)
- **Custom Domain**: $10/year (optional)

## 🔧 Implementation Guide

### **Step 1: Choose OCR Service**
1. **For Development**: Start with Tesseract.js (free)
2. **For Production**: Use Google Vision API (better accuracy)
3. **Update REACT_APP_OCR_SERVICE** accordingly

### **Step 2: Set Up Authentication**
1. Create Google OAuth credentials
2. (Optional) Create Apple Sign-In
3. Add client IDs to environment

### **Step 3: Configure Database**
1. **Recommended**: Use Supabase for all-in-one solution
2. **Alternative**: Use Zeabur PostgreSQL add-on
3. Update database URL in environment

### **Step 4: Storage Setup**
1. Create storage bucket for receipt images
2. Configure CORS for your application domain
3. Set up CDN access if needed

### **Step 5: Deploy with Environment Variables**
1. Add all required variables to Zeabur dashboard
2. Update API URL to point to your backend
3. Test each service integration

## 🚀 Quick Start Template

### **Minimal Working Setup (Free Tier)**
```bash
# .env (Free services only)
REACT_APP_API_URL=https://api.yourdomain.com/api/v1
REACT_APP_ENV=production
REACT_APP_OCR_SERVICE=tesseract
REACT_APP_SUPABASE_URL=https://your-project.supabase.co
REACT_APP_SUPABASE_ANON_KEY=your-supabase-anon-key
```

This setup provides:
- ✅ Free OCR processing
- ✅ Free PostgreSQL database  
- ✅ Free real-time subscriptions
- ✅ Free file storage (10GB)
- ✅ Basic authentication via Supabase

## 🔒 Security Best Practices

1. **Never commit API keys to git repository**
2. **Use different keys for development/production**
3. **Rotate API keys regularly**
4. **Monitor usage and costs**
5. **Set up billing alerts**
6. **Use read-only permissions where possible**

## 📞 Support Resources

- **Google Cloud Vision**: [Documentation](https://cloud.google.com/vision/docs)
- **Supabase**: [Documentation](https://supabase.com/docs)
- **Zeabur Storage**: [Documentation](https://zeabur.com/docs/storage)
- **SendGrid**: [Documentation](https://docs.sendgrid.com)

---

**Total Estimated Monthly Cost**: $15-45 (depending on OCR usage)
**Free Tier Possible**: $0 (with Tesseract + Supabase free tier)