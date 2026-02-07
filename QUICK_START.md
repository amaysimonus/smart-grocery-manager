# Smart Grocery Manager - Deployment & API Setup

## 🚀 **Quick Deployment Guide**

### **1️⃣ Deploy Your GitHub Repo to Zeabur**

#### **Step A: Push to GitHub First**
```bash
# Navigate to your project
cd "C:\Users\amay\Documents\grocery-manager v2"

# Add your GitHub repository
git remote add origin https://github.com/YOUR_USERNAME/smart-grocery-manager.git

# Push all code
git push -u origin main
```

#### **Step B: Deploy to Zeabur**
1. Go to [Zeabur.com](https://zeabur.com)
2. Click **"Create New Service"** or **"+"**
3. Select **"GitHub"** → Connect your GitHub account
4. Choose **"smart-grocery-manager"** repository
5. Set branch to **"main"**
6. Click **"Deploy Service"**

#### **Step C: Configure Environment Variables**
In Zeabur dashboard, add these environment variables:

```bash
# Essential for deployment
NODE_ENV=production
REACT_APP_API_URL=https://your-api-domain.com/api/v1
REACT_APP_ENV=production
```

**Your app will be live at**: `https://smart-grocery-manager.zeabur.app`

---

## 🔑 **Required API Services Setup**

### **🎯 OCR Service (Most Critical)**

#### **Option 1: Google Cloud Vision API (Recommended)**
```bash
# 1. Get API Key
# Go to: https://console.cloud.google.com
# Create project → Enable Vision API → Create credentials

# 2. Add to Zeabur Environment
REACT_APP_OCR_SERVICE=google_vision
GOOGLE_CLOUD_VISION_API_KEY=AIzaSyC...your-key-here
```

**Cost**: ~$1.50 per 1000 receipts  
**Setup Time**: 15 minutes  
**Accuracy**: 95%+ with receipt structure understanding

#### **Option 2: Tesseract.js (Free Start)**
```bash
# No API key needed - add this to Zeabur:
REACT_APP_OCR_SERVICE=tesseract
```
**Cost**: $0 (self-hosted)  
**Setup Time**: 5 minutes  
**Accuracy**: 85-90% for clear images

### **🔐 Authentication Services**

#### **Google Sign-In**
```bash
# Get credentials: https://console.cloud.google.com/apis/credentials
REACT_APP_GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
```

#### **Apple Sign-In (Optional Premium)**
```bash
# Requires $99/year Apple Developer account
REACT_APP_APPLE_CLIENT_ID=com.yourdomain.grocerymanager
```

### **💾 Database Service**

#### **Supabase (Recommended - All-in-One Free)**
```bash
# 1. Create account: https://supabase.com
# 2. Create new project
# 3. Get these keys from Project Settings > API

REACT_APP_SUPABASE_URL=https://your-project.supabase.co
REACT_APP_SUPABASE_ANON_KEY=your-anon-key
```

**Free Tier**: 10GB database + 500MB storage + Real-time

#### **Zeabur PostgreSQL Add-on**
```bash
# Direct integration with Zeabur hosting
DATABASE_URL=postgresql://user:pass@host:5432/dbname
```

### **📁 File Storage**

#### **Zeabur Object Storage**
```bash
# Create bucket in Zeabur dashboard > Storage
REACT_APP_STORAGE_ENDPOINT=https://storage.zeabur.com
REACT_APP_STORAGE_BUCKET=smart-grocery-uploads
```

---

## 📝 **Complete Environment Setup**

### **Copy this template for Zeabur:**
```bash
# Essential Configuration
NODE_ENV=production
REACT_APP_API_URL=https://api.yourdomain.com/api/v1
REACT_APP_ENV=production

# OCR Configuration
REACT_APP_OCR_SERVICE=google_vision
GOOGLE_CLOUD_VISION_API_KEY=AIzaSyC...your-key

# Database (Supabase Recommended)
REACT_APP_SUPABASE_URL=https://your-project.supabase.co
REACT_APP_SUPABASE_ANON_KEY=your-anon-key

# Storage
REACT_APP_STORAGE_ENDPOINT=https://storage.zeabur.com
REACT_APP_STORAGE_BUCKET=smart-grocery-uploads

# Authentication
REACT_APP_GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
```

---

## 🛠️ **Implementation Steps**

### **Day 1: Deploy & Test (2-3 hours)**
1. ✅ Push code to GitHub (15 minutes)
2. ✅ Deploy to Zeabur (10 minutes)  
3. ✅ Add basic environment variables (15 minutes)
4. ✅ Test deployment (30 minutes)

### **Day 2: Configure Services (2-4 hours)**
1. ✅ Set up Google Vision API (30 minutes)
2. ✅ Configure Supabase database (30 minutes)
3. ✅ Set up Zeabur storage (15 minutes)
4. ✅ Update environment variables (45 minutes)
5. ✅ Test full functionality (1 hour)

### **Day 3: Optimize (1-2 hours)**
1. ✅ Set up custom domain (optional, 30 minutes)
2. ✅ Configure SSL and security (15 minutes)
3. ✅ Set up monitoring (15 minutes)
4. ✅ Performance testing (30 minutes)

---

## 📊 **Service Costs Breakdown**

### **Free Path (Recommended Start)**
```
OCR: Tesseract.js = $0
Database: Supabase = $0 (10GB limit)
Storage: Zeabur = $0 (1GB limit)
Authentication: Supabase = $0
Total: $0/month
```

### **Production Path (Better Quality)**
```
OCR: Google Vision = $15-30/month
Database: Supabase = $0 (start) or $25/month
Storage: Zeabur = $0-10/month
Authentication: $0 (Google/Apple OAuth)
Total: $15-65/month
```

---

## 🔗 **Helpful Links**

### **Quick Setup**
- **Zeabur Dashboard**: https://zeabur.com
- **Google Cloud Console**: https://console.cloud.google.com  
- **Supabase**: https://supabase.com
- **GitHub Repository**: https://github.com/YOUR_USERNAME/smart-grocery-manager

### **Documentation References**
- [Zeabur Deployment Guide](./ZEABUR_DEPLOYMENT.md)
- [API Services Guide](./API_SERVICES.md)
- [Application README](./README.md)

---

## 🎯 **Success Checklist**

When you're done, you should have:

**Deployment:**
- [ ] GitHub repository pushed and up-to-date
- [ ] Zeabur service created and deployed
- [ ] Environment variables configured in Zeabur
- [ ] Application accessible at your domain

**Services:**
- [ ] OCR service working (test with receipt image)
- [ ] Database connected (test with budget creation)
- [ ] File storage working (test with image upload)
- [ ] Authentication working (test with Google sign-in)

**Optimization:**
- [ ] Custom domain configured (optional)
- [ ] SSL certificate active
- [ ] Monitoring and logging set up
- [ ] Performance tested

---

**🚀 Your Smart Grocery Manager will be live and ready for users!**

For real-time help or questions, the files in this repository provide:
- Step-by-step configuration
- Service setup instructions  
- Environment variable templates
- Troubleshooting guides
- Cost optimization tips

**Estimated Total Setup Time**: 4-8 hours
**Estimated Monthly Cost**: $0-65 (based on service choices)