# Google Maps API Setup Guide

This guide will help you set up Google Maps for the ParkPal web dashboard.

---

## Quick Start

### Step 1: Get Google Maps API Key

1. **Go to Google Cloud Console:**
   - Visit: https://console.cloud.google.com/

2. **Create or Select Project:**
   - Click "Select a project" dropdown
   - Click "New Project"
   - Name: "ParkPal" (or your choice)
   - Click "Create"

3. **Enable Maps JavaScript API:**
   - In left sidebar, go to "APIs & Services" → "Library"
   - Search for "Maps JavaScript API"
   - Click on it
   - Click "Enable"

4. **Create API Key:**
   - Go to "APIs & Services" → "Credentials"
   - Click "+ CREATE CREDENTIALS" → "API key"
   - Copy the generated API key
   - (Optional) Click "Restrict Key" to secure it

### Step 2: Add API Key to Project

1. **Create Environment File:**
   ```bash
   cd /Users/bryanangeloyaneza/Projects/frontend/web
   cp .env.local.example .env.local
   ```

2. **Edit .env.local:**
   ```bash
   # Open in your editor
   nano .env.local

   # Or
   code .env.local
   ```

3. **Add Your API Key:**
   ```env
   VITE_GOOGLE_MAPS_API_KEY=AIzaSyC-xxxxxxxxxxxxxxxxxxxxxxxxxxx
   VITE_API_URL=http://localhost:3001
   ```

4. **Save and Restart Dev Server:**
   ```bash
   # Stop server (Ctrl+C)
   # Restart
   npm run dev
   ```

---

## API Key Restrictions (Recommended)

### Application Restrictions
1. Go to API Key settings
2. Under "Application restrictions"
3. Select "HTTP referrers (web sites)"
4. Add allowed URLs:
   ```
   http://localhost:5173/*
   http://localhost:*
   https://yourdomain.com/*
   ```

### API Restrictions
1. Under "API restrictions"
2. Select "Restrict key"
3. Select only: **Maps JavaScript API**

---

## Troubleshooting

### Error: "InvalidKeyMapError"
**Cause:** API key is missing or invalid

**Fix:**
1. Check `.env.local` file exists
2. Verify `VITE_GOOGLE_MAPS_API_KEY=` has your actual key
3. Restart dev server after adding key
4. Check browser console for specific error

### Error: "This API project is not authorized to use this API"
**Cause:** Maps JavaScript API not enabled

**Fix:**
1. Go to Google Cloud Console
2. Enable "Maps JavaScript API"
3. Wait 1-2 minutes for changes to propagate

### Map Shows "For development purposes only"
**Cause:** Billing not enabled on Google Cloud project

**Fix:**
1. Enable billing in Google Cloud Console
2. Or: Use map with watermark during development
3. Production requires billing account

### Markers Not Showing
**Cause:** Advanced Markers require newer API

**Fix:**
- Already handled in code (using `v=beta` and `libraries=marker`)
- If still issues, check browser console for errors

---

## Features Enabled

With Google Maps API key configured, you get:

✅ **Interactive Map**
- Pan, zoom, rotate
- Street view
- Satellite view

✅ **Advanced Markers**
- Custom pin styles
- Price labels on markers
- Green (available) / Red (occupied)
- Click to view details

✅ **User Location**
- Blue pin shows your location
- "Recenter" button
- Auto-fit bounds to show all slots

✅ **Search & Filter**
- Filter by location, type
- Updates map markers in real-time

---

## Without API Key (Fallback)

If no API key is configured, the app still works:

✅ **Sidebar List View**
- Search functionality
- Filter slots
- View all details
- Click to reserve

❌ **Map Disabled**
- Shows setup instructions
- Sidebar remains fully functional

---

## Cost Information

### Free Tier (Google Maps Platform)
- **$200/month free credit**
- First 28,000 map loads/month: Free
- Typical usage: ~100 loads/day = Free

### Paid Usage
- Map loads: $7 per 1,000 (after free tier)
- Advanced markers: Included
- Geolocation API: $5 per 1,000 requests

**For ParkPal:**
- Development: Free tier sufficient
- Production: Monitor usage, estimate ~$10-50/month for 1,000 users

---

## Security Best Practices

### 1. Restrict API Key
```
✅ DO: Add referrer restrictions
✅ DO: Limit to Maps JavaScript API only
❌ DON'T: Use same key for backend
❌ DON'T: Commit .env.local to Git
```

### 2. Environment Variables
```bash
# .gitignore should include:
.env.local
.env*.local

# Only commit:
.env.local.example
```

### 3. Production Deployment
```bash
# Set environment variable in hosting platform:
VITE_GOOGLE_MAPS_API_KEY=your_production_key

# Examples:
# Vercel: Environment Variables section
# Netlify: Site settings → Environment
# AWS Amplify: Environment variables
```

---

## Alternative: OpenStreetMap (Free)

If you prefer not to use Google Maps, you can integrate OpenStreetMap (free):

### Option 1: Leaflet.js
```bash
npm install leaflet react-leaflet
```

### Option 2: Mapbox (Free tier: 50k loads/month)
```bash
npm install mapbox-gl react-map-gl
```

**Note:** Code changes required. Google Maps currently implemented.

---

## Testing the Map

### 1. Verify Setup
```bash
# Check .env.local exists
cat frontend/web/.env.local

# Should show:
# VITE_GOOGLE_MAPS_API_KEY=AIzaSy...
```

### 2. Test in Browser
```bash
# Start dev server
npm run dev

# Open browser
# http://localhost:5173/map

# Check:
# ✅ Map loads without errors
# ✅ Markers appear on map
# ✅ Blue pin shows your location
# ✅ Click markers → Show details
# ✅ No console errors
```

### 3. Check Console
```javascript
// Browser DevTools → Console
// Should see:
✓ Map initialized
✓ X markers added

// Should NOT see:
✗ InvalidKeyMapError
✗ Cannot read properties of undefined
```

---

## Quick Commands Reference

```bash
# Setup
cp .env.local.example .env.local
# Add your API key to .env.local

# Development
npm run dev
# → http://localhost:5173/map

# Production Build
npm run build
# Ensure VITE_GOOGLE_MAPS_API_KEY set in hosting platform

# Check Environment
echo $VITE_GOOGLE_MAPS_API_KEY
# (In shell, not .env file)
```

---

## Support Links

- **Google Cloud Console:** https://console.cloud.google.com/
- **Maps JavaScript API Docs:** https://developers.google.com/maps/documentation/javascript
- **Advanced Markers Guide:** https://developers.google.com/maps/documentation/javascript/advanced-markers
- **Pricing Calculator:** https://mapsplatform.google.com/pricing/
- **API Key Best Practices:** https://developers.google.com/maps/api-security-best-practices

---

## Summary

1. Get API key from Google Cloud Console
2. Add to `.env.local` file
3. Restart dev server
4. Map should load with markers
5. Restrict key for production

**That's it! Your interactive map is ready to use. 🗺️**
