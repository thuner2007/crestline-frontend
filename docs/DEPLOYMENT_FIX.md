# Deployment Fix Guide for Nginx + Stripe Issues

## Issues Identified

1. **Stripe Elements Blocked** - Missing CSP headers in nginx
2. **Chunk Loading Error** - Server actions causing chunk loading failures
3. **MIME Type Errors** - nginx not serving JavaScript files with correct content type

## Solutions Applied

✅ **Fixed**: Converted Stripe server action to API route (`/api/create-payment-intent`)
✅ **Fixed**: Updated `package.json` build script to set `APP_VERSION`
✅ **Fixed**: Created proper nginx config with CSP headers

## Solutions

### 1. Update Nginx Configuration

Replace your nginx config with the one in `nginx-fixed.conf`. Key changes:

- ✅ Added **Content-Security-Policy** header with Stripe domains:
  - `https://js.stripe.com`
  - `https://m.stripe.network`
  - `https://r.stripe.com`
  - `https://api.stripe.com`
  - `https://hooks.stripe.com`

- ✅ Changed `X-Frame-Options` from `DENY` to `SAMEORIGIN` (Stripe needs iframes)

- ✅ Added proper **MIME types** configuration

- ✅ Added specific location blocks for:
  - `/_next/static` - Next.js chunks with immutable cache
  - `/_next/image` - Image optimization
  - `/public/` - Static assets

### 2. Rebuild the Application

The application has been updated to:
- Use API route `/api/create-payment-intent` instead of server action (fixes chunk loading)
- Automatically set `APP_VERSION` during build

```bash
# Clean and rebuild
cd /home/thune/source/privat/revsticks_frontend
rm -rf .next
npm run build
```

The `package.json` build script now automatically sets `APP_VERSION` from git commit hash.

### 3. Apply the Nginx Configuration

```bash
# Backup current config
sudo cp /etc/nginx/sites-available/revsticks /etc/nginx/sites-available/revsticks.backup

# Copy new config
sudo cp nginx-fixed.conf /etc/nginx/sites-available/revsticks

# Test configuration
sudo nginx -t

# If test passes, reload nginx
sudo systemctl reload nginx
```

### 4. Redeploy to Server

```bash
# On your deployment server
cd /path/to/revsticks_frontend

# Pull latest changes
git pull

# Install dependencies (if needed)
npm install

# Build with version
rm -rf .next
npm run build

# Restart your Next.js app (adjust command based on your setup)
pm2 restart revsticks
# OR
systemctl restart revsticks
```

## Verification Steps

1. **Check nginx is serving files correctly:**
   ```bash
   curl -I https://stage.revsticks.ch/_next/static/chunks/main-app.js
   # Should show: Content-Type: application/javascript
   ```

2. **Verify CSP headers:**
   ```bash
   curl -I https://stage.revsticks.ch | grep -i content-security
   # Should show CSP header with stripe domains
   ```

3. **Test Stripe loading:**
   - Open browser DevTools (F12)
   - Go to checkout page
   - Check Console - should have no `ERR_BLOCKED_BY_CLIENT` errors
   - Check Network tab - all `r.stripe.com` requests should be 200 OK

4. **Verify chunk names:**
   - In Network tab, check for `.js` files
   - Should see proper chunk names with hashes, NO `.undefined.js` files
   - Payment intent should load from `/api/create-payment-intent` successfully

## Common Issues

### Still seeing chunk loading errors?
- The app uses API routes now instead of server actions
- Clear `.next` folder completely: `rm -rf .next`
- Rebuild: `npm run build`
- Clear browser cache completely (Ctrl+Shift+Delete)

### Stripe still blocked?
- Check browser ad blocker is disabled
- Verify CSP header is present: `curl -I https://stage.revsticks.ch`
- Clear browser cache and cookies

### MIME type still wrong?
- Ensure nginx reloaded: `sudo systemctl status nginx`
- Check nginx error log: `sudo tail -f /var/log/nginx/revsticks.error.log`
- Verify file exists: check if chunk file is actually built

## Quick Fix Commands

```bash
# Complete deployment fix
cd /home/thune/source/privat/revsticks_frontend
rm -rf .next
APP_VERSION=$(date +%Y%m%d-%H%M%S) npm run build
sudo cp nginx-fixed.conf /etc/nginx/sites-available/revsticks
sudo nginx -t && sudo systemctl reload nginx
```
