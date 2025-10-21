# BanosCookbook Deployment Guide

## 🚀 Production Deployment Checklist

### ✅ Completed Tasks
- [x] Fixed build configuration (removed error ignoring)
- [x] Fixed TypeScript errors (pdf-parse import)
- [x] Build tested successfully
- [x] Next.js 15.3.3 (security note: consider updating to 15.5.4+ when possible)

### 🔧 Pre-Deployment Setup

#### Environment Variables Required
Create `.env.local` or set in deployment platform:
```bash
# Required for AI features
GOOGLE_API_KEY=your_google_ai_api_key_here

# Application URL
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

#### Build Commands
```bash
# Install dependencies
npm install

# Build for production
npm run build

# Start production server
npm start
```

### 🌐 Deployment Options

#### Option 1: Vercel (Recommended)
**Why Vercel?**
- Best Next.js integration
- Automatic deployments from Git
- Edge functions support
- Built-in analytics

**Setup Steps:**
1. Connect GitHub repository to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy automatically on push to main branch

**Configuration:**
- Framework: Next.js (auto-detected)
- Build Command: `npm run build`
- Output Directory: `.next` (auto-detected)
- Install Command: `npm install`

#### Option 2: Firebase App Hosting
**Why Firebase?**
- Google Cloud integration
- Good for Google AI services
- Cost-effective for small apps

**Setup Steps:**
1. Install Firebase CLI: `npm install -g firebase-tools`
2. Login: `firebase login`
3. Initialize: `firebase init hosting`
4. Deploy: `firebase deploy`

**Current Configuration:**
- Max instances: 1 (cost-effective)
- Can be increased for higher traffic

### 🔒 Security Considerations

#### Environment Variables
- ✅ API keys properly configured
- ✅ No hardcoded secrets
- ⚠️ Consider using Vercel's environment variable encryption
\
#### Firebase Admin (important)

The repository no longer includes a service account file. Provide credentials via environment variables in production:

- Set `FIREBASE_SERVICE_ACCOUNT_JSON` to the stringified JSON of your service account (recommended for Vercel).
- Or set `GOOGLE_APPLICATION_CREDENTIALS` to the path of a secure file on the host.

Example (Vercel): add a secret named `FIREBASE_SERVICE_ACCOUNT_JSON` with the JSON contents.

If you previously committed a `*-firebase-adminsdk-*.json` file, delete it from the repo and rotate the service account keys.

#### Build Security
- ✅ TypeScript errors now caught in build
- ✅ ESLint errors now caught in build
- ⚠️ Next.js version has known vulnerabilities (update when possible)

### 📊 Performance Optimization

#### Build Output Analysis
```
Route (app)                                 Size  First Load JS
┌ ○ /                                    22.8 kB         151 kB
├ ○ /_not-found                            977 B         102 kB
├ ○ /add-recipe                          31.3 kB         150 kB
└ ƒ /recipes/[id]                        5.22 kB         121 kB
+ First Load JS shared by all             101 kB
```

#### Optimizations Applied
- ✅ Static generation for main pages
- ✅ Dynamic routes for recipe pages
- ✅ Image optimization configured
- ✅ Bundle size reasonable

### 🚀 Deployment Commands

#### For Vercel:
```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel --prod
```

#### For Firebase:
```bash
# Install Firebase CLI
npm install -g firebase-tools

# Login and deploy
firebase login
firebase deploy
```

### 🔍 Post-Deployment Checklist

1. **Test Core Features:**
   - [ ] Home page loads
   - [ ] Add recipe form works
   - [ ] Recipe pages display
   - [ ] AI features (image/PDF processing)

2. **Environment Variables:**
   - [ ] GOOGLE_API_KEY set correctly
   - [ ] NEXT_PUBLIC_APP_URL matches domain

3. **Performance:**
   - [ ] Page load times acceptable
   - [ ] Images load properly
   - [ ] No console errors

4. **Security:**
   - [ ] HTTPS enabled
   - [ ] No sensitive data in client bundle
   - [ ] API keys not exposed

### 🆘 Troubleshooting

#### Common Issues:
1. **Build Failures:** Check TypeScript/ESLint errors
2. **API Errors:** Verify GOOGLE_API_KEY is set
3. **Image Issues:** Check remote patterns in next.config.ts
4. **PDF Processing:** Ensure pdf-parse dependency is installed

#### Debug Commands:
```bash
# Check build locally
npm run build

# Check for type errors
npm run typecheck

# Check for lint errors
npm run lint

# Test production build locally
npm run build && npm start
```

### 📈 Monitoring

#### Recommended Tools:
- Vercel Analytics (if using Vercel)
- Google Analytics
- Error tracking (Sentry)
- Performance monitoring

#### Key Metrics:
- Page load times
- API response times
- Error rates
- User engagement

---

## 🎯 Next Steps

1. **Choose deployment platform** (Vercel recommended)
2. **Set up environment variables**
3. **Deploy to staging first**
4. **Test all features**
5. **Deploy to production**
6. **Set up monitoring**

For questions or issues, refer to the platform-specific documentation or contact the development team.
