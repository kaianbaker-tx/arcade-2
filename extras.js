// Kaian's Arcade 2 extras: visit counter, play counts, and comments.
// The arcade page loads this with ONE line: <script src="extras.js" defer></script>
// It finds every link to games/<slug>/ on the page and adds a play count and a
// comments button next to it, so it keeps working however index.html is rebuilt.

// Paste the Web app URL from Google Apps Script here (see backend/SETUP.md).
const ARCADE_API = '';

const arcade = {
  ready: ARCADE_API !== '',

  async get(params) {
    const r = await fetch(ARCADE_API + '?' + new URLSearchParams(params));
    const j = await r.json();
    if (j.error) throw new Error(j.error);
    return j;
  },

  // No Content-Type header on purpose: Google only answers "simple" requests.
  async post(body) {
    const r = await fetch(ARCADE_API, { method: 'POST', body: JSON.stringify(body) });
    const j = await r.json();
    if (j.error) throw new Error(j.error);
    return j;
  },

  // Fire-and-forget: still counts even if the page is leaving.
  ping(body) {
    if (!arcade.ready) return;
    fetch(ARCADE_API, { method: 'POST', body: JSON.stringify(body), keepalive: true, mode: 'no-cors' }).catch(() => {});
  },

  slugFromHref(href) {
    const m = /(?:^|\/)games\/([a-z0-9-]+)\/?/.exec(href || '');
    return m && m[1];
  },

  el(tag, cls, text) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  },
};

// The arcade page: add a visit counter, and a play count + comments button per game.
// Runs on load, and again if the page draws its cards later (it fires "arcade:cards").
(function arcadePage() {
  if (!/\/(index\.html)?$/.test(location.pathname)) return; // only on the arcade page

  const css = document.createElement('style');
  css.textContent = `
    .arc-card{display:flex;flex-direction:column}
    .arc-card>a{flex:1}
    .arc-bar{display:flex;gap:10px;align-items:center;justify-content:center;margin-top:8px;font:600 13px system-ui,sans-serif}
    .arc-plays{opacity:.8}
    .arc-card .arc-bar a.arc-talk{display:inline-block;border:0;font-size:13px;font-weight:600;color:inherit;text-decoration:none;padding:3px 10px;border-radius:999px;background:rgba(255,255,255,.12)}
    .arc-card .arc-bar a.arc-talk:hover{background:rgba(255,255,255,.25)}
    .arc-visits{text-align:center;font:600 14px system-ui,sans-serif;opacity:.8;margin:8px 0 20px}`;
  document.head.appendChild(css);

  const visits = arcade.el('div', 'arc-visits');
  const h1 = document.querySelector('h1');
  h1 ? h1.insertAdjacentElement('afterend', visits) : document.body.prepend(visits);

  const bars = {};
  let stats = null;

  function decorate() {
    document.querySelectorAll('a[href]:not([data-arc])').forEach(a => {
      const slug = arcade.slugFromHref(a.getAttribute('href'));
      if (!slug) return;
      a.dataset.arc = '1';
      a.addEventListener('click', () => arcade.ping({ action: 'play', game: slug }));
      if (bars[slug]) return; // one bar per game even if a card has two links
      const bar = arcade.el('div', 'arc-bar');
      const plays = arcade.el('span', 'arc-plays', '');
      const talk = arcade.el('a', 'arc-talk', '💬 Comments');
      talk.href = 'comments.html?game=' + slug;
      talk.dataset.arc = '1';
      bar.append(plays, talk);
      // Wrap card + bar together so a grid of cards keeps the same number of cells.
      const wrap = arcade.el('div', 'arc-card');
      a.replaceWith(wrap);
      wrap.append(a, bar);
      bars[slug] = { plays, talk };
    });
    fill();
  }

  function fill() {
    if (!stats) return;
    visits.textContent = '👀 ' + stats.visits.toLocaleString() + ' visits';
    for (const [slug, b] of Object.entries(bars)) {
      const n = stats.plays[slug] || 0, c = stats.comments[slug] || 0;
      b.plays.textContent = '▶ ' + n.toLocaleString() + (n === 1 ? ' play' : ' plays');
      if (c) b.talk.textContent = '💬 ' + c;
    }
  }

  decorate();
  window.addEventListener('arcade:cards', decorate);
  if (!arcade.ready) return;
  arcade.post({ action: 'visit' }).then(s => { stats = s; fill(); }).catch(() => {});
})();
