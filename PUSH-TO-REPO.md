# Repo mein code push karne ke steps

## Problem
OneDrive folder mein `.git` lock ho jata hai, isliye Cursor/IDE se commit-push fail ho sakta hai.

## Solution – ye steps apne **PowerShell** ya **Command Prompt** mein run karo

### 1. OneDrive sync thoda ruko (optional)
- System tray se OneDrive icon par right-click → **Pause syncing** (2 hour) karo, taaki push ke time lock na lage.

### 2. Project folder par jao
```powershell
cd "C:\Users\Satya\OneDrive\Desktop\Guest Card"
```

### 3. Lock file hatao (agar error aaye)
```powershell
Remove-Item -Force .git\index.lock -ErrorAction SilentlyContinue
```
Ya CMD mein:
```cmd
del .git\index.lock
```

### 4. Sab changes add karo
```powershell
git add -A
```

### 5. Commit karo
```powershell
git commit -m "Form updates: yellow boxes, HH label, Job Duration order, Section 4 layout"
```

### 6. GitHub par push karo
```powershell
git push origin main
```

Agar **authentication** maange:
- GitHub par **Settings → Developer settings → Personal access tokens** se naya token banao.
- Jab password maange, token paste karo (password ki jagah).

---

## Agar phir bhi lock / error aaye

- **Option A:** Repo ko OneDrive ke bahar copy karo (e.g. `C:\Projects\Guest-Card-Tenant-Pre-Screening`), wahan `git add`, `commit`, `push` karo. Phir GitHub se latest pull karke sync rakhna.
- **Option B:** **GitHub Desktop** use karo – ye OneDrive lock se kam problem karta hai.

Repo URL: https://github.com/Satya057/Deva-Rentals-Guest-Card
