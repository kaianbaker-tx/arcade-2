# Kaian's Arcade 2

**Play:** https://kaianbaker-tx.github.io/arcade-2/

Games Kaian made with Claude, copied here every night by the Arcade 2 sweep.

| file | what it is | who changes it |
|---|---|---|
| `index.html`, `games.json`, `games/` | the arcade and the games | the nightly sweep |
| `extras.js`, `extras.css` | visit counter, play counts, 💬 comments buttons | by hand |
| `comments.html` | friends read and write comments on a game | by hand |
| `admin.html` | Dad approves comments (password) | by hand |
| `backend/` | the Google Apps Script that stores it all (runs in Dad's Google account) | by hand |

`index.html` must keep the line `<script src="extras.js" defer></script>`,
or the counters and comment buttons disappear.

Turning comments on for the first time: [backend/SETUP.md](backend/SETUP.md).
