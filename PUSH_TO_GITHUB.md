# Push to GitHub - Quick Guide

## ✅ Pre-Push Checklist

Everything is ready! Here's what's already configured:

- ✅ **Codecov Token**: Added to GitHub repository secrets
- ✅ **GitHub Actions**: CI/CD workflow configured
- ✅ **Codecov Badge**: Added to README
- ✅ **All Enhancements**: Prettier, Husky, Storybook, etc.
- ✅ **223 Tests**: All passing with 93.5% coverage

## 🚀 Push to GitHub (Step-by-Step)

### Step 1: Configure Git for This Repository

```bash
# Navigate to your project
cd /Users/vsnitkovsky/code/test/playground/portfolio-tracker

# Set your Git identity (local to this repo only)
git config user.name "Vadim Snitkovsky"
git config user.email "your-email@example.com"

# Verify it's set
git config user.name
git config user.email
```

### Step 2: Initialize Git Repository

```bash
# Initialize git (if not already done)
git init

# Check status
git status
```

### Step 3: Add All Files

```bash
# Add all files to staging
git add .

# Verify what will be committed
git status
```

### Step 4: Make Initial Commit

```bash
# Make your first commit
git commit -m "Initial commit: Portfolio Tracker v1.0.0

- React 19 + TypeScript 5.9 + Vite 7
- 223 tests with 93.5% coverage
- Multi-portfolio management
- Dividend tracking and cash flow analysis
- NAV erosion tracking
- Polygon.io API integration
- Storybook component documentation
- CI/CD with GitHub Actions
- Codecov integration
- Prettier + ESLint + Husky
- Docker support
- Vercel/Netlify deployment configs"
```

### Step 5: Create Main Branch

```bash
# Rename branch to main
git branch -M main
```

### Step 6: Add GitHub Remote

Choose **ONE** of these methods:

#### Option A: Using SSH (Recommended - Most Secure)

```bash
# Add remote using SSH
git remote add origin git@github.com:vadim-snitkovsky/portfolio-tracker.git

# Verify remote
git remote -v
```

**Note**: If you haven't set up SSH keys, see the "SSH Setup" section below.

#### Option B: Using HTTPS (Easier for First Time)

```bash
# Add remote using HTTPS
git remote add origin https://github.com/vadim-snitkovsky/portfolio-tracker.git

# Verify remote
git remote -v
```

**Note**: You'll need to use a Personal Access Token as your password.

### Step 7: Push to GitHub

```bash
# Push to GitHub
git push -u origin main
```

If using HTTPS, you'll be prompted:
- **Username**: `vadim-snitkovsky`
- **Password**: Your Personal Access Token (not your GitHub password!)

### Step 8: Verify Everything Works

1. **Check GitHub Actions**:
   - Go to: https://github.com/vadim-snitkovsky/portfolio-tracker/actions
   - You should see the CI workflow running
   - Wait for it to complete (should be green ✅)

2. **Check Codecov**:
   - Go to: https://codecov.io/gh/vadim-snitkovsky/portfolio-tracker
   - You should see your coverage report
   - Coverage badge in README should update

3. **Check Repository**:
   - Go to: https://github.com/vadim-snitkovsky/portfolio-tracker
   - All files should be there
   - README should display with badges

## 🔑 SSH Setup (If Using SSH)

### Check if you have SSH keys:

```bash
ls -la ~/.ssh
# Look for: id_rsa.pub, id_ed25519.pub, or id_ecdsa.pub
```

### If you don't have SSH keys, create them:

```bash
# Generate new SSH key
ssh-keygen -t ed25519 -C "your-email@example.com"

# Press Enter to accept default location
# Enter a passphrase (optional but recommended)

# Start SSH agent
eval "$(ssh-agent -s)"

# Add SSH key to agent
ssh-add ~/.ssh/id_ed25519

# Copy public key to clipboard
cat ~/.ssh/id_ed25519.pub | pbcopy
```

### Add SSH key to GitHub:

1. Go to: https://github.com/settings/keys
2. Click "New SSH key"
3. Title: "MacBook - Portfolio Tracker"
4. Key: Paste from clipboard (Cmd+V)
5. Click "Add SSH key"

### Test SSH connection:

```bash
ssh -T git@github.com
# Should say: "Hi vadim-snitkovsky! You've successfully authenticated..."
```

## 🎫 Personal Access Token Setup (If Using HTTPS)

### Create a Personal Access Token:

1. Go to: https://github.com/settings/tokens
2. Click "Generate new token" → "Generate new token (classic)"
3. Note: "Portfolio Tracker"
4. Expiration: Choose your preference (90 days, 1 year, or no expiration)
5. Select scopes:
   - ✅ `repo` (Full control of private repositories)
6. Click "Generate token"
7. **Copy the token immediately** (you won't see it again!)

### Store the token securely:

```bash
# Configure Git to use macOS Keychain
git config --local credential.helper osxkeychain
```

When you push for the first time:
- Username: `vadim-snitkovsky`
- Password: Paste your Personal Access Token

The token will be saved in your macOS Keychain for future use.

## 🔧 Troubleshooting

### Problem: "remote origin already exists"

```bash
# Remove existing remote
git remote remove origin

# Add it again
git remote add origin git@github.com:vadim-snitkovsky/portfolio-tracker.git
```

### Problem: "Permission denied (publickey)"

You need to set up SSH keys. See "SSH Setup" section above.

### Problem: "Authentication failed" (HTTPS)

You need to use a Personal Access Token, not your GitHub password. See "Personal Access Token Setup" above.

### Problem: "Updates were rejected"

```bash
# If the remote has commits you don't have locally
git pull origin main --rebase

# Then push again
git push -u origin main
```

### Problem: Pre-commit hook fails

```bash
# Fix linting issues
npm run lint:fix

# Format code
npm run format

# Try committing again
git commit -m "your message"
```

## 📋 After First Push

### 1. Enable GitHub Pages (Optional)

If you want to host Storybook:

1. Go to repository Settings → Pages
2. Source: GitHub Actions
3. Create `.github/workflows/storybook.yml` (optional)

### 2. Set Up Branch Protection (Recommended)

1. Go to Settings → Branches
2. Add rule for `main` branch:
   - ✅ Require status checks to pass before merging
   - ✅ Require branches to be up to date before merging
   - Select: CI workflow

### 3. Add Repository Topics

1. Go to repository main page
2. Click the gear icon next to "About"
3. Add topics: `portfolio`, `investment`, `dividend`, `react`, `typescript`, `vite`, `zustand`

### 4. Deploy to Vercel/Netlify (Optional)

See [SETUP_GUIDE.md](SETUP_GUIDE.md) for deployment instructions.

## 🎉 You're Done!

Your repository is now live on GitHub with:

- ✅ All code pushed
- ✅ CI/CD running automatically
- ✅ Codecov tracking coverage
- ✅ Professional README with badges
- ✅ Ready for collaboration

**Next Steps**:
- Share your repository
- Deploy to Vercel/Netlify
- Start building features!

---

## Quick Command Reference

```bash
# Daily workflow
git status                    # Check what changed
git add .                     # Stage all changes
git commit -m "message"       # Commit (pre-commit hook runs)
git push                      # Push to GitHub

# Create a new feature
git checkout -b feature/name  # Create feature branch
# ... make changes ...
git add .
git commit -m "feat: description"
git push -u origin feature/name
# Then create PR on GitHub

# Update from main
git checkout main
git pull
git checkout feature/name
git merge main
```

---

**Need help?** Check [SETUP_GUIDE.md](SETUP_GUIDE.md) or [CONTRIBUTING.md](CONTRIBUTING.md)

