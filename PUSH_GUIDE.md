# 🚀 Step-by-Step Guide: Pushing Updates to HostelHome Marketing

This document provides a clear, step-by-step guide for saving, committing, and pushing updates made to the **HostelHome Marketing** website repository to GitHub and triggering automatic live deployment.

---

## 📌 Repository Overview

| Property | Value |
| :--- | :--- |
| **Directory** | `HostelHome/HostelHome-Marketing` |
| **GitHub Remote** | `https://github.com/DBRPGROW247/HostelHome-Marketing.git` |
| **Default Branch** | `main` |
| **Deployment Target** | Cloudflare Pages / Production (`https://hostelhomeapp.in`) |

---

## ⚡ Quick Reference (For Everyday Updates)

If you are already familiar with Git and just want the standard routine:

```bash
# 1. Navigate to the marketing folder (if not already there)
cd c:\Praj\DBRP\Application\HostelHome\HostelHome-Marketing

# 2. Check changed files
git status

# 3. Stage all modified & new files
git add .

# 4. Commit changes with a descriptive message
git commit -m "feat: describe your update here"

# 5. Pull latest remote changes to prevent conflicts(optional)
git pull origin main

# 6. Push updates to GitHub (triggers live deployment)
git push origin main
```

---

## 📋 Comprehensive Step-by-Step Guide

### Step 1: Open Terminal in the Marketing Folder

Make sure your terminal (PowerShell, Command Prompt, or Git Bash) is opened inside the `HostelHome-Marketing` directory:

```powershell
cd "c:\Praj\DBRP\Application\HostelHome\HostelHome-Marketing"
```

Verify you are on the `main` branch:
```powershell
git branch
```
*(You should see `* main` highlighted).*

---

### Step 2: Review Your Changes

Before staging or committing, always review what has been modified:

1. **Check file status:**
   ```powershell
   git status
   ```
   *Files in red are unstaged modified or untracked files.*

2. **Inspect exact code differences:**
   ```powershell
   git diff
   ```
   *(Press `q` to exit diff view).*

3. **Mobile & Quality Checklist before pushing:**
   - [ ] Verify responsive layout across mobile and desktop screens.
   - [ ] Ensure all meta tags, canonical URLs, and open-graph links point to valid URLs (`https://hostelhomeapp.in`).
   - [ ] Check that local asset paths (images, stylesheets, icons) are correctly linked.

---

### Step 3: Stage the Changes

Select the files you want to include in this update:

- **Stage all changes and new files:**
  ```powershell
  git add .
  ```

- **Or stage specific files individually:**
  ```powershell
  git add index.html
  git add pricing.html
  ```

Re-run `git status` to confirm. Staged files will now appear in **green**.

---

### Step 4: Commit Your Changes

Write a concise, descriptive commit message explaining the change:

```powershell
git commit -m "type: brief description of changes"
```

#### Recommended Commit Conventions:
- **`feat:`** for new features, sections, or pages
  ```powershell
  git commit -m "feat: add Google Play Store download badges and modal popup"
  ```
- **`fix:`** for bug fixes or display corrections
  ```powershell
  git commit -m "fix: resolve mobile navigation drawer overflow issue"
  ```
- **`update:`** for content, text, or pricing adjustments
  ```powershell
  git commit -m "update: revise pricing tier features and WhatsApp contact link"
  ```
- **`docs:`** for documentation changes
  ```powershell
  git commit -m "docs: add push and deployment workflow guide"
  ```
- **`seo:`** for meta tag and search engine optimizations
  ```powershell
  git commit -m "seo: update meta descriptions, og tags, and sitemap"
  ```

---

### Step 5: Pull Remote Changes (Sync First)

Always pull before pushing to make sure no updates were made remotely (e.g. from GitHub web or another machine):

```powershell
git pull origin main
```

If your local branch is already up to date, it will output:
`Already up to date.`

---

### Step 6: Push to GitHub

Send your committed changes to the GitHub repository:

```powershell
git push origin main
```

> **Note on Authentication:**
> If prompted for GitHub credentials:
> 1. Sign in via your browser using the Git Credential Manager prompt, **OR**
> 2. Use your GitHub Username and a **Personal Access Token (PAT)** with `repo` permissions as the password.

---

### Step 7: Verify Live Deployment

1. **Check GitHub Repository:**
   Visit `https://github.com/DBRPGROW247/HostelHome-Marketing` and confirm your latest commit appears at the top of the `main` branch.
2. **Automated Cloudflare Pages Deployment:**
   - Cloudflare Pages automatically detects the new commit on `main` and initiates a zero-downtime deployment.
   - Typically completes in **30–60 seconds**.
3. **Verify in Browser:**
   - Open `https://hostelhomeapp.in`
   - Perform a hard refresh to bypass cached files:
     - **Windows / Chrome / Edge:** `Ctrl + F5` or `Ctrl + Shift + R`
     - **Mobile:** Open in an Incognito / Private tab to see fresh cache.

---

## 🛠️ Helpful Commands & Troubleshooting

### Discard Unwanted Local Changes (Before Staging)
To revert a specific file back to the last commit:
```powershell
git restore <filename>
```
To revert all unstaged changes in the directory:
```powershell
git restore .
```

### Unstage Files (After `git add` but before commit)
```powershell
git restore --staged <filename>
```

### Amend Last Commit Message
If you made a typo in your last commit message (before pushing):
```powershell
git commit --amend -m "fix: updated commit message"
```

### View Recent Commit History
```powershell
git log -n 5 --oneline
```

### Check Remote Repository URL
```powershell
git remote -v
```
