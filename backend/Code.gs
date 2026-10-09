/**
 * Kaian's Arcade 2 - play counter + comments that Dad approves.
 *
 * This file lives in Dad's Google account (script.google.com), NOT on GitHub
 * Pages. It keeps everything in a Google Sheet only Dad can see, and emails
 * Dad every new comment. Nothing shows on the arcade until Dad approves it.
 *
 * Setup is in backend/SETUP.md. The admin password is NOT in this file:
 * it lives in Project Settings -> Script Properties -> ADMIN_PASSWORD.
 */

const DAD = 'bradley.n.baker@gmail.com';
const SITE = 'https://kaianbaker-tx.github.io/arcade-2/';
const MAX_NAME = 20;
const MAX_TEXT = 300;
const MAX_PENDING = 100; // stop taking new comments if Dad has this many waiting

// ---------------------------------------------------------------- setup

/** Run this once from the editor. It makes the Sheet and asks for permission. */
function setup() {
  const props = PropertiesService.getScriptProperties();
  if (!props.getProperty('SHEET_ID')) {
    const ss = SpreadsheetApp.create("Kaian's Arcade 2 - comments and counts");
    ss.getSheets()[0].setName('Comments')
      .appendRow(['id', 'game', 'name', 'text', 'time', 'status', 'token']);
    ss.insertSheet('Counts').appendRow(['key', 'count']);
    props.setProperty('SHEET_ID', ss.getId());
  }
  if (!props.getProperty('ADMIN_PASSWORD')) {
    throw new Error('Now add ADMIN_PASSWORD in Project Settings -> Script Properties, then run setup again.');
  }
  MailApp.getRemainingDailyQuota(); // makes Google ask for email permission now
  Logger.log('All set. Sheet: ' + sheet_('Comments').getParent().getUrl());
}

// ---------------------------------------------------------------- web entry points

function doGet(e) {
  const p = e.parameter || {};
  try {
    if (p.action === 'stats') return json_(stats_());
    if (p.action === 'comments') return json_({ comments: approved_(cleanGame_(p.game)) });
    return json_({ ok: true });
  } catch (err) {
    return json_({ error: String(err.message || err) });
  }
}

function doPost(e) {
  let b;
  try { b = JSON.parse(e.postData.contents); } catch (_) { return json_({ error: 'bad request' }); }
  try {
    switch (b.action) {
      case 'visit':   bump_('visits'); return json_(stats_()); // count it, then hand back all counts
      case 'play':    bump_('play:' + cleanGame_(b.game)); return json_({ ok: true });
      case 'comment': return json_(addComment_(b));
      case 'review':  return json_(reviewOne_(b));   // one-comment link from Dad's email
      case 'admin':   return json_(admin_(b));       // admin page, needs the password
      default:        return json_({ error: 'unknown action' });
    }
  } catch (err) {
    return json_({ error: String(err.message || err) });
  }
}

// ---------------------------------------------------------------- counts

function bump_(key) {
  withLock_(() => {
    const sh = sheet_('Counts');
    const rows = sh.getDataRange().getValues();
    for (let i = 1; i < rows.length; i++) {
      if (rows[i][0] === key) { sh.getRange(i + 1, 2).setValue(Number(rows[i][1]) + 1); return; }
    }
    sh.appendRow([key, 1]);
  });
}

function stats_() {
  const out = { visits: 0, plays: {}, comments: {} };
  sheet_('Counts').getDataRange().getValues().slice(1).forEach(([k, n]) => {
    if (k === 'visits') out.visits = Number(n);
    else if (String(k).startsWith('play:')) out.plays[String(k).slice(5)] = Number(n);
  });
  rows_().forEach(r => { if (r.status === 'approved') out.comments[r.game] = (out.comments[r.game] || 0) + 1; });
  return out;
}

// ---------------------------------------------------------------- comments

function addComment_(b) {
  if (b.website) return { ok: true }; // hidden field only robots fill in
  const game = cleanGame_(b.game);
  const name = String(b.name || '').trim().slice(0, MAX_NAME);
  const text = String(b.text || '').trim().slice(0, MAX_TEXT);
  if (!name || !text) throw new Error('Please fill in your name and a comment.');

  let row;
  withLock_(() => {
    const pending = rows_().filter(r => r.status === 'pending').length;
    if (pending >= MAX_PENDING) throw new Error('Too many comments waiting right now. Try again later!');
    row = { id: Utilities.getUuid().slice(0, 8), game, name, text,
            time: new Date().toISOString(), status: 'pending', token: Utilities.getUuid() };
    sheet_('Comments').appendRow([row.id, row.game, row.name, row.text, row.time, row.status, row.token]);
  });

  const link = SITE + 'admin.html?id=' + row.id + '&t=' + row.token;
  MailApp.sendEmail({
    to: DAD,
    subject: 'New comment on ' + game + ' from ' + name,
    body: name + ' wrote on "' + game + '":\n\n' + text +
          '\n\nApprove or reject it here:\n' + link +
          '\n\nSee everything waiting:\n' + SITE + 'admin.html\n'
  });
  return { ok: true };
}

function approved_(game) {
  return rows_().filter(r => r.status === 'approved' && r.game === game)
    .map(r => ({ name: r.name, text: r.text, time: r.time }))
    .reverse(); // newest first
}

/** The link in Dad's email: shows and decides one comment, no password needed. */
function reviewOne_(b) {
  const r = rows_().find(x => x.id === b.id && x.token && x.token === b.t);
  if (!r) throw new Error('That link is not valid any more.');
  if (b.op === 'approve' || b.op === 'reject') setStatus_(r.id, b.op === 'approve' ? 'approved' : 'rejected');
  return { comment: publicRow_(rows_().find(x => x.id === r.id)) };
}

/** The admin page: everything, behind the password. */
function admin_(b) {
  checkPassword_(b.pw);
  if (b.op === 'approve') setStatus_(b.id, 'approved');
  if (b.op === 'reject')  setStatus_(b.id, 'rejected');
  return { comments: rows_().reverse().slice(0, 200).map(publicRow_) };
}

function setStatus_(id, status) {
  withLock_(() => {
    const sh = sheet_('Comments');
    const ids = sh.getRange(1, 1, sh.getLastRow(), 1).getValues();
    for (let i = 1; i < ids.length; i++) {
      if (ids[i][0] === id) { sh.getRange(i + 1, 6).setValue(status); return; }
    }
    throw new Error('Comment not found.');
  });
}

// ---------------------------------------------------------------- password

function checkPassword_(pw) {
  const cache = CacheService.getScriptCache();
  const fails = Number(cache.get('fails') || 0);
  if (fails >= 5) throw new Error('Too many wrong tries. Wait 15 minutes.');
  const real = PropertiesService.getScriptProperties().getProperty('ADMIN_PASSWORD');
  if (!real || String(pw || '') !== real) {
    cache.put('fails', String(fails + 1), 900);
    throw new Error('Wrong password.');
  }
}

// ---------------------------------------------------------------- helpers

function rows_() {
  return sheet_('Comments').getDataRange().getValues().slice(1).map(r => ({
    id: r[0], game: r[1], name: r[2], text: r[3],
    time: r[4] instanceof Date ? r[4].toISOString() : r[4], status: r[5], token: r[6]
  }));
}

function publicRow_(r) {
  return { id: r.id, game: r.game, name: r.name, text: r.text, time: r.time, status: r.status };
}

function cleanGame_(g) {
  g = String(g || '').toLowerCase();
  if (!/^[a-z0-9-]{1,60}$/.test(g)) throw new Error('bad game');
  return g;
}

function sheet_(name) {
  const id = PropertiesService.getScriptProperties().getProperty('SHEET_ID');
  if (!id) throw new Error('Run setup() first.');
  return SpreadsheetApp.openById(id).getSheetByName(name);
}

function withLock_(fn) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try { return fn(); } finally { lock.releaseLock(); }
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
