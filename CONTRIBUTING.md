# Contributing to Snack Track App

## Quick Start

1. **Clone the repo** (first time only)
   ```bash
   git clone https://github.com/harry-david-brown/SnackTrackApp.git
   cd SnackTrackApp
   ```

2. **Run setup** (first time only)
   ```bash
   # Windows:
   scripts\setup.bat
   
   # Mac/Linux:
   npm run setup
   ```

3. **Start developing**
   ```bash
   npm start
   ```

---

## Git Workflow (Making Changes)

### 1. Always Start Fresh
Before you start working, get the latest code:

```bash
git checkout main
git pull origin main
```

### 2. Create a Branch
Never work directly on `main`. Create a new branch for your changes:

```bash
git checkout -b your-name/feature-description
```

**Examples:**
- `john/fix-login-button`
- `sarah/add-dark-mode`
- `mike/update-dashboard`

### 3. Make Your Changes
- Edit files
- Test your changes: `npm start`
- Run tests: `npm test`

### 4. Save Your Changes
```bash
# See what files you changed
git status

# Add your changes
git add .

# Commit with a clear message
git commit -m "fix: describe what you fixed"
```

**Good commit messages:**
- `fix: login button now works on mobile`
- `feat: add dark mode toggle to settings`
- `docs: update README with new setup steps`

### 5. Push Your Branch
```bash
git push origin your-name/feature-description
```

### 6. Create a Pull Request
1. Go to https://github.com/harry-david-brown/SnackTrackApp
2. Click the green "Compare & pull request" button
3. Write a description of what you changed
4. Click "Create pull request"
5. Wait for review and approval

---

## Common Commands

```bash
# Check what branch you're on
git branch

# Switch to a different branch
git checkout branch-name

# See what files you changed
git status

# Undo changes to a file (before commit)
git checkout -- filename

# Get latest changes from main
git checkout main
git pull origin main

# Delete a branch after it's merged
git branch -d branch-name
```

---

## If You Get Stuck

### "I'm on the wrong branch!"
```bash
# Save your changes
git stash

# Switch to the right branch
git checkout correct-branch-name

# Get your changes back
git stash pop
```

### "I need to update my branch with latest main"
```bash
# Get latest from main
git checkout main
git pull origin main

# Go back to your branch
git checkout your-branch

# Merge main into your branch
git merge main
```

### "I messed up, start over"
```bash
# Discard all your changes
git checkout main
git reset --hard origin/main

# Delete your branch and start fresh
git branch -D your-branch
git checkout -b your-branch
```

---

## Rules

1. **Never push directly to `main`** - Always use a branch and pull request
2. **Always pull before you start** - Get the latest code
3. **Test before you push** - Run `npm start` and make sure it works
4. **Write clear commit messages** - Explain what you did
5. **Ask for help** - If you're stuck, just ask!

---

## Need Help?

- **Git confused?** - Just ask! It's easier to fix than you think
- **Code not working?** - Run `npm run setup` again
- **Tests failing?** - Run `npm test` to see what's wrong

