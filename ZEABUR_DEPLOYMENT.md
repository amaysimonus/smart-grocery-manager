# Zeabur Deployment Guide

## 🚀 Quick Deployment to Zeabur

### Prerequisites
- GitHub repository with your Smart Grocery Manager code
- Zeabur account (free tier available)

### Step-by-Step Deployment

#### 1. Connect GitHub to Zeabur
1. Login to [Zeabur](https://zeabur.com)
2. Click "Create New Service" or "+" button
3. Select "GitHub" as deployment source
4. Authorize Zeabur to access your GitHub account
5. Select your `smart-grocery-manager` repository
6. Choose deployment branch: `main`

#### 2. Configure Deployment Settings

**Basic Settings:**
- **Service Name**: `smart-grocery-manager`
- **Region**: Choose nearest (Hong Kong recommended)
- **Plan**: Free tier (1GB RAM, 10GB storage)

**Build Configuration:**
```yaml
# zeabur-deployment.yaml
version: "2021-11-23"
name: smart-grocery-manager
services:
  app:
    source:
      type: git
      git:
        branch: main
        uri: https://github.com/YOUR_USERNAME/smart-grocery-manager.git
    build:
      commands:
        - cd client
        - npm install
        - npm run build
    output:
      type: static
      location: client/build
    environment:
      - name: NODE_ENV
        value: production
      - name: REACT_APP_API_URL
        value: ${REACT_APP_API_URL}
    cpu: 0.5
    memory: 512
    instance_count: 1
    ports:
      - port: 3000
        protocol: HTTP
```

#### 3. Environment Variables
Set these in Zeabur dashboard:

```bash
# Frontend Settings
NODE_ENV=production
REACT_APP_API_URL=https://your-api-domain.com/api/v1

# Optional: If you have backend deployed
REACT_APP_WS_URL=wss://your-api-domain.com
REACT_APP_ENV=production
```

#### 4. Deploy
1. Click "Deploy Service"
2. Wait for build completion (2-3 minutes)
3. Access your app at: `https://smart-grocery-manager.zeabur.app`

## 🔧 Required API Services

### 1. **OCR Processing Service**
**Options:**
- **Google Cloud Vision API** (Recommended)
  - Key: `GOOGLE_CLOUD_VISION_API_KEY`
  - Cost: ~$1.50 per 1000 images
  - Accuracy: 95%+ for receipt text

- **Tesseract.js** (Free, Self-hosted)
  - No API key required
  - Accuracy: 85-90% for clear receipts
  - Server resource intensive

- **AWS Textract**
  - Key: `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`
  - Cost: ~$1.00 per 1000 images

### 2. **Authentication Service**
**Google OAuth:**
```bash
REACT_APP_GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
REACT_APP_GOOGLE_CLIENT_SECRET=your-google-client-secret
```

**Apple Sign-In:**
```bash
REACT_APP_APPLE_CLIENT_ID=your.apple.signin.client.id
REACT_APP_APPLE_TEAM_ID=your.apple.team.id
```

### 3. **Database Service** (if you have backend)
**Options:**
- **Zeabur PostgreSQL Add-on**
- **PlanetScale** (MySQL compatible)
- **Supabase** (PostgreSQL + real-time)
- **Neon** (Serverless PostgreSQL)

### 4. **File Storage Service**
**Zeabur Object Storage:**
```bash
REACT_APP_STORAGE_ENDPOINT=https://storage.zeabur.com
REACT_APP_STORAGE_BUCKET=your-bucket-name
REACT_APP_STORAGE_ACCESS_KEY=your-access-key
REACT_APP_STORAGE_SECRET_KEY=your-secret-key
```

## 📝 Environment Configuration Files

### **.env.example**
```bash
# Production Environment Variables
REACT_APP_API_URL=https://api.yourdomain.com/api/v1
REACT_APP_ENV=production
REACT_APP_VERSION=1.0.0

# OCR Service
REACT_APP_OCR_SERVICE=google_vision
GOOGLE_CLOUD_VISION_API_KEY=your-google-api-key

# Authentication
REACT_APP_GOOGLE_CLIENT_ID=your-google-client-id
REACT_APP_APPLE_CLIENT_ID=your-apple-client-id

# Storage
REACT_APP_STORAGE_ENDPOINT=https://storage.zeabur.com
REACT_APP_STORAGE_BUCKET=smart-grocery-manager-uploads

# Analytics (Optional)
REACT_APP_GA_TRACKING_ID=G-XXXXXXXXXX
REACT_APP_SENTRY_DSN=https://your-sentry-dsn
```

## 🚀 One-Click Deploy Commands

### **Using GitHub Actions**
Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Zeabur

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          
      - name: Install dependencies
        run: |
          cd client
          npm ci
          
      - name: Build
        run: |
          cd client
          npm run build
          
      - name: Deploy to Zeabur
        uses: zeabur/action-deploy@v1
        with:
          token: ${{ secrets.ZEABUR_TOKEN }}
          app-name: smart-grocery-manager
```

### **Manual Git Push**
```bash
# Add Zeabur remote
git remote add zeabur https://your-git-token@zeabur.com:your-username/smart-grocery-manager.git

# Push to Zeabur
git push zeabur main
```

## 🔗 Post-Deployment Setup

### **Domain Configuration**
1. Go to Zeabur dashboard
2. Select your service
3. Go to "Settings" → "Domains"
4. Add custom domain: `your-grocery-app.com`
5. Update DNS records as provided

### **SSL Certificate**
- Automatic SSL provided by Zeabur
- Custom domains get auto-renewed certificates
- Force HTTPS redirect available

## 📊 Monitoring & Scaling

### **Zeabur Dashboard Features**
- **Real-time logs**: View application logs
- **Resource usage**: CPU, memory, storage
- **Deployment history**: Rollback capability
- **Auto-scaling**: Configure based on traffic
- **Health checks**: Automatic restart on failures

### **Scaling Recommendations**
```yaml
# Example: Scale for higher traffic
services:
  app:
    instance_count: 2  # Scale up
    cpu: 1.0          # More CPU
    memory: 1024       # More RAM
```

## 🔄 CI/CD Pipeline

### **GitHub Actions Workflow**
```yaml
# .github/workflows/zeabur-deploy.yml
name: Deploy to Zeabur

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v3
        
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          
      - name: Install dependencies
        run: |
          cd client
          npm ci
          
      - name: Run tests
        run: |
          cd client
          npm test -- --coverage --watchAll=false
          
      - name: Build application
        run: |
          cd client
          npm run build
          
      - name: Deploy to Zeabur
        if: github.ref == 'refs/heads/main'
        uses: zeabur/action-deploy@v1
        with:
          token: ${{ secrets.ZEABUR_TOKEN }}
          app-name: smart-grocery-manager
```

## 🛠️ Local Development Setup

### **Environment Variables for Local Dev**
Create `.env.local`:
```bash
# Local development
REACT_APP_API_URL=http://localhost:3001/api/v1
REACT_APP_ENV=development
REACT_APP_MOCK_API=true  # Use mock data for testing
```

## 📞 Troubleshooting

### **Common Issues & Solutions**

**Build Fails:**
- Check Node.js version: `node --version` (need 18+)
- Clear npm cache: `npm cache clean --force`
- Delete node_modules and reinstall

**Deploy Fails:**
- Verify environment variables in Zeabur dashboard
- Check build logs in Zeabur console
- Ensure git branch is `main`

**App Not Loading:**
- Check browser console for errors
- Verify API URL is accessible
- Check network connectivity

**OCR Not Working:**
- Verify API key is correct
- Check image format support
- Monitor API quota usage

---

## 🎯 Success Metrics

Your Smart Grocery Manager on Zeabur should provide:
- **99.9% uptime** with Zeabur's infrastructure
- **Global CDN** for fast asset delivery
- **Auto-scaling** for traffic spikes
- **Free SSL** and security
- **One-click deploys** from Git commits

**Deploy URL**: `https://smart-grocery-manager.zeabur.app`
**Admin**: `https://zeabur.com/apps/smart-grocery-manager`