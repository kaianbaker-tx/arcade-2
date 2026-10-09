# Turning on comments and counts (Dad, one time, ~5 minutes)

The arcade is a plain website on GitHub Pages. It can't remember anything by
itself, so comments and play counts live in a small Google Apps Script in
**Dad's** Google account. It keeps everything in a Google Sheet only Dad can
see, and emails Dad every new comment. Nothing shows on the arcade until Dad
approves it.

## 1. Make the script

1. Signed in as **bradley.n.baker@gmail.com**, open <https://script.google.com>
   and click **New project**. Name it `Arcade 2 comments` (top left).
2. Delete everything in `Code.gs`, then paste in all of
   <https://raw.githubusercontent.com/kaianbaker-tx/arcade-2/main/backend/Code.gs>.
   Click the 💾 save icon.

## 2. Pick the admin password

3. Click the ⚙️ **Project Settings** gear on the left, scroll to
   **Script Properties**, click **Add script property**:
   - Property: `ADMIN_PASSWORD`
   - Value: a password you'll use on the admin page (not your Gmail password)

   Click **Save script properties**. The password lives only here, never on GitHub.

## 3. Run setup once

4. Go back to the **Editor** (`< >` icon). In the toolbar's function menu pick
   **setup**, then click **Run**.
5. Google asks for permission. Click **Review permissions** → your account.
   You'll see "Google hasn't verified this app". That's normal for a script
   you wrote yourself. Click **Advanced** → **Go to Arcade 2 comments (unsafe)** → **Allow**.
   It needs Sheets (to store comments) and Gmail send (to email you).
6. The log at the bottom should say `All set.` A new Sheet called
   "Kaian's Arcade 2 - comments and counts" is now in your Google Drive.

## 4. Put it online

7. Click **Deploy** → **New deployment** → the ⚙️ next to "Select type" →
   **Web app**.
   - Execute as: **Me**
   - Who has access: **Anyone** (friends don't need Google accounts)
8. Click **Deploy** and copy the **Web app URL** (ends in `/exec`).

## 5. Connect the arcade

9. Paste that URL to Claude on Kaian's laptop. Or do it yourself: in
   `extras.js` on GitHub, change line 7 to
   `const ARCADE_API = 'https://script.google.com/macros/s/…/exec';`
   and commit. Pages updates in a minute or two.

## Every day after that

- A friend comments → you get an email → tap the link → **Approve** or **Reject**.
- See everything at <https://kaianbaker-tx.github.io/arcade-2/admin.html>
  with your password. **Take down** removes an approved comment.
- Five wrong passwords lock the page for 15 minutes.

## If you change Code.gs later

Paste the new code, then **Deploy → Manage deployments → ✏️ edit →
Version: New version → Deploy**. The URL stays the same.
