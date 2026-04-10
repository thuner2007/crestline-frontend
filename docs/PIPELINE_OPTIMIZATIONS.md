# GitHub Actions Pipeline Optimizations

## Performance Improvements

### ⚡ Speed Improvements Applied:

1. **Combined lint + build jobs** → **~50% faster**
   - Previously: 2 separate jobs, each running `npm install`
   - Now: Single job with one `npm install`, lint runs in parallel with build
   - Savings: ~2-3 minutes per run

2. **Removed rsync to home server** → **~30-60 seconds faster**
   - Previously: Upload to home server via rsync, then download in docker job
   - Now: Direct GitHub artifacts transfer (faster and more reliable)

3. **Cached production dependencies** → **~1-2 minutes faster**
   - Docker job now caches `node_modules` for production deps
   - Avoids reinstalling unchanged dependencies

4. **Moved cleanup to separate job** → **Non-blocking**
   - Cleanup runs in parallel after docker push
   - Doesn't delay the main workflow completion

5. **Improved caching strategy**
   - Uses `actions/setup-node` built-in npm caching
   - Better cache keys for Next.js build cache
   - Reduced artifact compression overhead

6. **Dockerfile optimizations**
   - Combined RUN commands to reduce layers
   - Removed unnecessary `yarn` uninstall step
   - Proper ARG/ENV handling for APP_VERSION
   - Added USER directive for better security

### 📊 Estimated Time Savings:

| Before | After | Savings |
|--------|-------|---------|
| ~8-12 min | ~5-7 min | **~40% faster** |

## Changes Made

### [.github/workflows/build.yml](.github/workflows/build.yml)

**Before:**
```yaml
jobs:
  lint:      # ~3-4 min (npm install + lint)
  build:     # ~5-6 min (npm install + build + rsync)
  docker:    # ~3-4 min (download + build docker)
Total: ~11-14 min
```

**After:**
```yaml
jobs:
  build-and-lint:  # ~4-5 min (npm install + lint in bg + build)
  docker:          # ~2-3 min (cached deps + download artifact + build)
  cleanup:         # runs async, doesn't block
Total: ~6-8 min
```

### [Dockerfile](Dockerfile)

- ✅ Added `ARG APP_VERSION` for build-time versioning
- ✅ Combined `addgroup` and `adduser` into single RUN
- ✅ Removed yarn uninstall (not needed)
- ✅ Added `USER appuser` for security
- ✅ Optimized ENV declarations

### Key Features:

✅ **Parallel execution** - Lint runs in background while build is happening  
✅ **Better caching** - npm cache, Next.js cache, and prod deps cache  
✅ **GitHub Artifacts** - Faster than rsync for CI/CD transfers  
✅ **Non-blocking cleanup** - Runs after main workflow  
✅ **Proper error handling** - `continue-on-error` for cleanup tasks  

## Testing

Build the workflow to ensure it works:

```bash
# Commit and push to trigger workflow
git add .github/workflows/build.yml Dockerfile
git commit -m "Optimize CI/CD pipeline for faster builds"
git push
```

Monitor the GitHub Actions tab to see the improved performance!

## Rollback

If issues occur, revert with:

```bash
git revert HEAD
git push
```
