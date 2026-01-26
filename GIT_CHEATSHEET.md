# Git Cheatsheet used for BlueSky Clone

## 1. The Daily Workflow (Saving Your Work)
When you have made changes to your code and want to save them to GitHub:

```bash
# 1. Check which files have changed
git status

# 2. Stage your changes (prepare them for saving)
git add .              # Stages ALL changed files
# OR
git add backend/file.cs # Stages specific file only

# 3. Commit your changes (save a snapshot locally)
git commit -m "Describe what you changed here"

# 4. Push to GitHub (upload your snapshot)
git push
```

## 2. Getting Updates (If you edit on another computer/browser)
If you made changes on GitHub directly or another machine:

```bash
git pull
```

## 3. Safe Experimentation (Branching)
Never break your working code. Create a copy (branch) to experiment:

```bash
# 1. Create and switch to a new branch
git checkout -b new-feature-name

# ... make your code changes ...

# 2. Save your changes on this new branch
git add .
git commit -m "Added new feature"

# 3. Push the new branch to GitHub
git push origin new-feature-name
```

## 4. Undoing Mistakes

```bash
# Discard changes in a specific file (DANGER: Cannot be undone)
git checkout -- filename.txt

# Discard ALL current changes in current folder (DANGER)
git checkout .

# Modify the last commit message (if you haven't pushed yet)
git commit --amend -m "New correct message"
```

## 5. Checking History

```bash
# See a list of all your commits
git log

# See a condensed one-line history
git log --oneline
```

## 6. GitHub Actions (Your CI Pipeline)
Since we added a CI workflow, you can check its status on GitHub:
1. Go to your repo: https://github.com/Tsutsuji2002/BlueSkyClone
2. Click the **Actions** tab.
3. You will see your commits there. Green checkmark = Build Passed. Red X = Build Failed.
