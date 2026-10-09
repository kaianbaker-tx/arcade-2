// Takes a picture of every game that doesn't have one yet (games/<slug>/thumb.jpg)
// and records it in games.json. Run by .github/workflows/thumbs.yml after each push.
// Kaian's dad hand-picked the first pictures; delete a thumb.jpg to have it retaken.
const fs = require('fs');
const http = require('http');
const path = require('path');
const puppeteer = require('puppeteer-core');

const ROOT = path.resolve(__dirname, '..');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.jpg': 'image/jpeg', '.png': 'image/png' };

const data = JSON.parse(fs.readFileSync(path.join(ROOT, 'games.json'), 'utf8'));
const todo = data.games.filter(g => !fs.existsSync(path.join(ROOT, 'games', g.slug, 'thumb.jpg')));

(async () => {
  if (todo.length) {
    // Serve the repo locally so games load exactly as they will on Pages.
    const server = http.createServer((req, res) => {
      let p = decodeURIComponent(req.url.split('?')[0]);
      if (p.endsWith('/')) p += 'index.html';
      const f = path.join(ROOT, p);
      if (!f.startsWith(ROOT) || !fs.existsSync(f)) { res.writeHead(404); return res.end(); }
      res.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream' });
      fs.createReadStream(f).pipe(res);
    }).listen(8123);

    const browser = await puppeteer.launch({
      executablePath: process.env.CHROME || '/usr/bin/google-chrome',
      headless: 'new', args: ['--no-sandbox', '--mute-audio'],
    });
    for (const g of todo) {
      const page = await browser.newPage();
      await page.setViewport({ width: 960, height: 600 });
      try {
        await page.goto(`http://localhost:8123/games/${g.slug}/`, { waitUntil: 'networkidle2', timeout: 30000 });
        await sleep(2000);
        await page.screenshot({
          path: path.join(ROOT, 'games', g.slug, 'thumb.jpg'), type: 'jpeg', quality: 78,
          clip: { x: 0, y: 0, width: 960, height: 600, scale: 2 / 3 },
        });
        console.log('picture taken:', g.slug);
      } catch (e) {
        console.log('could not take a picture of', g.slug, '-', e.message);
      }
      await page.close();
    }
    await browser.close();
    server.close();
  }

  let changed = false;
  for (const g of data.games) {
    const want = fs.existsSync(path.join(ROOT, 'games', g.slug, 'thumb.jpg')) ? `games/${g.slug}/thumb.jpg` : undefined;
    if (g.thumb !== want) { g.thumb = want; changed = true; }
  }
  if (changed) fs.writeFileSync(path.join(ROOT, 'games.json'), JSON.stringify(data, null, 2) + '\n');
  console.log(todo.length ? `${todo.length} new picture(s)` : 'every game already has a picture');
})();
