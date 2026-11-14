'use strict';

// Shared helpers for the step files of this pack.
//
// Not a step file: it registers no step definitions and no hooks. It holds the
// plumbing the steps use and that downstream packs can require instead of
// copying: the wait budget, friendly errors, control panel addresses, the users
// registry, the notifications, the element index (sources, toolbar, rows,
// pagination, bulk actions), the edit form (fields by label, tabs, action
// menus, the stored-changes indicator) and slide-out editors.
//
// Everything here builds on webship-js's own helpers (`gotoUrl`, `friendly`) so
// the steps fail the way the core webship-js steps do.

const { gotoUrl, friendly } = require('webship-js/tests/step-definitions/webship');

/**
 * The per-assertion wait budget: `minWaitTime.page` from cucumber.js, at least
 * 10 seconds. Kept below webship-js's 45 second step timeout.
 *
 * @param {object} world
 * @returns {number}
 */
function budget(world) {
  return Math.max((world && world.minWaitTime && world.minWaitTime.page) || 0, 10000);
}

/** The settle budget after an action (`minWaitTime.page`, 3 seconds by default). */
function settleBudget(world) {
  return (world && world.minWaitTime && world.minWaitTime.page) || 3000;
}

/** Whether an optional step argument was supplied. */
function supplied(value) {
  return value !== undefined && value !== null;
}

/** Escape a literal string for use in a RegExp. */
function escapeRegExp(text) {
  return String(text).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** A case-sensitive RegExp that matches the literal text anywhere. */
function literal(text) {
  return new RegExp(escapeRegExp(text));
}

/** A RegExp that matches the whole text (ignoring surrounding space), for exact titles and labels. */
function exactly(text) {
  return new RegExp('^\\s*' + escapeRegExp(text) + '\\s*$');
}

/** A quoted CSS attribute value. */
function quoted(text) {
  return JSON.stringify(String(text));
}

/** Collapse whitespace, so text read from the page compares cleanly. */
function clean(text) {
  return String(text === null || text === undefined ? '' : text).replace(/\s+/g, ' ').trim();
}

/** A list for an error message: `a, b, c` or `(none)`. */
function listed(values) {
  const items = [...new Set(values.map(clean).filter(Boolean))];
  return items.length ? items.join(', ') : '(none)';
}

/** The site root without a trailing slash. */
function siteRoot(world) {
  return String(world.launchUrl).replace(/\/+$/, '');
}

/** Join the site root and a path with exactly one slash. Absolute URLs pass through. */
function siteUrl(world, url) {
  if (!url) return siteRoot(world) + '/';
  if (/^https?:\/\//i.test(url)) return url;
  return siteRoot(world) + '/' + String(url).replace(/^\/+/, '');
}

/**
 * The control panel trigger: the first URL segment of the control panel
 * (`admin` unless the site sets `cpTrigger`). `worldParameters.cpTrigger` in
 * cucumber.js overrides it.
 */
function cpTrigger(world) {
  return String((world.parameters && world.parameters.cpTrigger) || 'admin').replace(/^\/+|\/+$/g, '');
}

/** The URL of a control panel path (`content/entries`, `settings`). */
function cpUrl(world, path) {
  return siteRoot(world) + '/' + cpTrigger(world) + (path ? '/' + String(path).replace(/^\/+/, '') : '');
}

// The control panel keeps a timer running (it polls the queue), so webship-js's
// "no pending timers" signal never goes quiet there and every wait would run to
// the end of its budget. These steps wait on what the control panel does
// instead: its background requests.
const TRACKED = new WeakMap();

/**
 * The background requests (XHR and fetch) of the page that are still running,
 * and how many started so far. The tracker is attached once per page.
 *
 * @returns {{pending: Set, started: number}}
 */
function requests(world) {
  const page = world.page;
  let state = TRACKED.get(page);
  if (!state) {
    state = { pending: new Set(), started: 0 };
    TRACKED.set(page, state);
    const background = (request) => ['xhr', 'fetch'].includes(request.resourceType());
    page.on('request', (request) => {
      if (!background(request)) return;
      state.pending.add(request);
      state.started += 1;
    });
    const done = (request) => { state.pending.delete(request); };
    page.on('requestfinished', done);
    page.on('requestfailed', done);
    // A navigation drops the requests of the page it leaves.
    page.on('framenavigated', (frame) => { if (frame === page.mainFrame()) state.pending.clear(); });
  }
  return state;
}

/**
 * Wait for the page to go quiet after an action: the document is loaded and no
 * background request has been running for a moment. Returns as soon as that is
 * true, and at the latest after `minWaitTime.page`.
 */
async function settle(world, timeout) {
  const state = requests(world);
  const deadline = Date.now() + (timeout || settleBudget(world));
  await world.page.waitForLoadState('domcontentloaded', { timeout: Math.max(deadline - Date.now(), 1) }).catch(() => {});
  let quietSince = 0;
  while (Date.now() < deadline) {
    if (state.pending.size === 0) {
      if (!quietSince) quietSince = Date.now();
      if (Date.now() - quietSince >= 300) return;
    } else {
      quietSince = 0;
    }
    await world.page.waitForTimeout(40);
  }
}

/**
 * Run an action that makes the page talk to the server in the background, and
 * wait for the exchange to finish: for a request to start (a moment at most)
 * and for every request to end.
 */
async function afterRequests(world, fn) {
  const state = requests(world);
  const before = state.started;
  const result = await fn();
  const startBy = Date.now() + 1200;
  while (state.started === before && Date.now() < startBy) {
    await world.page.waitForTimeout(40);
  }
  await settle(world, budget(world));
  return result;
}

/** Open a URL and wait for the page to settle. */
async function open(world, url) {
  requests(world);
  try {
    await gotoUrl(world.page, url);
  } catch (err) {
    // A network interface that comes or goes on the machine (a container starting next door) aborts the navigation once: go again.
    if (!/ERR_NETWORK_CHANGED/.test(String(err && err.message))) throw err;
    await world.page.waitForTimeout(500);
    await gotoUrl(world.page, url);
  }
  await world.page.waitForSelector('body', { state: 'attached', timeout: budget(world) });
  await world.page.waitForLoadState('load', { timeout: budget(world) }).catch(() => {});
  await settle(world);
}

/**
 * Run an action and rethrow its failure as a friendly error (action, target,
 * cause and a hint) instead of Playwright's raw timeout stack. A friendly error
 * thrown inside passes through unchanged.
 */
async function actOrExplain(label, target, fn, hint) {
  try {
    return await fn();
  } catch (err) {
    if (err && err.stack === err.message) throw err;
    throw friendly({ action: label, target, cause: err, hint });
  }
}

/**
 * Wait until a locator has (or, with `notCase`, no longer has) a visible match
 * and fail with a friendly error otherwise: the wait and the assertion are one
 * call, so content that arrives a moment late still passes.
 */
async function assertPresence(locator, notCase, { label, hint, timeout, found }) {
  try {
    await locator.first().waitFor({ state: notCase ? 'hidden' : 'visible', timeout });
  } catch {
    const seen = found ? await found().catch(() => '') : '';
    throw friendly({
      message: (notCase ? `Expected not to see ${label}, but it is on the page.` : `Expected to see ${label}, but it did not appear within ${timeout} ms.`) + (seen ? ` ${seen}` : ''),
      hint,
    });
  }
}

/**
 * Poll a reading until it satisfies a check, or fail with the last reading.
 *
 * @param {object} world
 * @param {Function} read - async () => value
 * @param {Function} check - (value) => boolean
 * @param {Function} explain - (value) => {message, hint}
 */
async function eventually(world, read, check, explain) {
  const deadline = Date.now() + budget(world);
  let value;
  for (;;) {
    value = await read();
    if (check(value)) return value;
    if (Date.now() > deadline) throw friendly(explain(value));
    await world.page.waitForTimeout(200);
  }
}

// ---------------------------------------------------------------------------
// Accounts
// ---------------------------------------------------------------------------

/**
 * A user of the `users` registry in cucumber.js (`worldParameters.users`).
 *
 * @returns {{username: string, password: string, name: (string|undefined)}}
 */
function resolveUser(world, handle) {
  const users = (world.parameters && world.parameters.users) || {};
  const entry = users[handle];
  if (!entry) {
    throw friendly({
      message: `The user "${handle}" is not in the users registry. Known users: ${Object.keys(users).join(', ') || '(none)'}.`,
      hint: `Add it to worldParameters.users in cucumber.js: users: { ${handle}: { username: '...', password: process.env.${handle.toUpperCase()}_PASSWORD } }. The account itself is created once by the site build (the users/create console command), never by a feature.`,
    });
  }
  const username = entry.username || handle;
  const password = typeof entry === 'string' ? entry : entry.password;
  if (!password) {
    throw friendly({
      message: `The user "${handle}" has no password in the users registry.`,
      hint: `Set worldParameters.users.${handle}.password in cucumber.js, from an environment variable.`,
    });
  }
  return { username, password, name: entry.name };
}

// ---------------------------------------------------------------------------
// The mailbox of the test site
// ---------------------------------------------------------------------------

/**
 * The address of the mailbox that catches the mail of the test site
 * (`worldParameters.mailUrl` in cucumber.js): a Mailpit, which every DDEV
 * project has at port 8026.
 */
function mailUrl(world) {
  const url = world.parameters && world.parameters.mailUrl;
  if (!url) {
    throw friendly({ message: 'No mailbox is configured.', hint: 'Set worldParameters.mailUrl in cucumber.js to the Mailpit of the test site, for example https://your-site.ddev.site:8026.' });
  }
  return String(url).replace(/\/+$/, '');
}

/**
 * The newest e-mail to an address that arrived after a moment in time, once it
 * is there. The message is removed from the mailbox when `remove` is set, so a
 * later scenario never reads it.
 *
 * @returns {Promise<{subject: string, text: string, html: string}>}
 */
async function mailTo(world, address, { since = 0, remove = false } = {}) {
  const request = world.page.context().request;
  const base = mailUrl(world);
  const deadline = Date.now() + budget(world) * 2;
  let found = null;
  let problem = '';
  for (;;) {
    try {
      const response = await request.get(`${base}/api/v1/search?query=${encodeURIComponent('to:' + address)}`, { failOnStatusCode: false, ignoreHTTPSErrors: true });
      if (response.ok()) {
        const messages = ((await response.json()).messages || []).filter((message) => !since || Date.parse(message.Created) >= since - 2000);
        problem = 'it has none for that address';
        if (messages.length) { found = messages[0]; break; }
      } else {
        problem = `the mailbox answered HTTP ${response.status()}`;
      }
    } catch (err) {
      problem = clean(err && err.message).split(' Call log')[0];
    }
    if (Date.now() > deadline) break;
    await world.page.waitForTimeout(300);
  }
  if (!found) {
    throw friendly({ message: `No e-mail to ${address} arrived in the mailbox at ${base} (${problem}).`, hint: 'The site must send its mail to this mailbox, and the address must be the one of the account. Check worldParameters.mailUrl in cucumber.js.' });
  }
  const message = await (await request.get(`${base}/api/v1/message/${found.ID}`, { ignoreHTTPSErrors: true })).json();
  if (remove) {
    await request.delete(`${base}/api/v1/messages`, { data: { IDs: [found.ID] }, ignoreHTTPSErrors: true, failOnStatusCode: false }).catch(() => {});
  }
  return { subject: message.Subject || '', text: message.Text || '', html: message.HTML || '' };
}

// ---------------------------------------------------------------------------
// The control panel
// ---------------------------------------------------------------------------

// The named control panel pages, by the title a tester knows them by. The value
// is the path after the control panel trigger.
const CP_PAGES = {
  'dashboard': 'dashboard',
  'entries': 'content/entries',
  'categories': 'categories',
  'assets': 'assets',
  'my account': 'myaccount',
  'utilities': 'utilities',
  'system report': 'utilities/system-report',
  'updates': 'utilities/updates',
  'queue manager': 'utilities/queue-manager',
  'caches': 'utilities/clear-caches',
  'deprecation warnings': 'utilities/deprecation-errors',
  'settings': 'settings',
  'general settings': 'settings/general',
  'sites': 'settings/sites',
  'routes': 'settings/routes',
  'email settings': 'settings/email',
  'sections': 'settings/sections',
  'entry types': 'settings/entry-types',
  'fields': 'settings/fields',
  'globals settings': 'settings/globals',
  'volumes': 'settings/assets',
  'asset settings': 'settings/assets',
  'filesystems': 'settings/filesystems',
  'image transforms': 'settings/assets/transforms',
  'category groups': 'settings/categories',
  'tag groups': 'settings/tags',
  'user fields': 'settings/users/fields',
  'user settings': 'settings/users/settings',
  'plugins': 'settings/plugins',
  'graphql': 'graphql',
  'plugin store': 'plugin-store',
};

/**
 * The control panel path of a named page. A name that is not in the table is
 * used as a path (`content/entries/blog`, `settings/sections`).
 */
function cpPath(name) {
  const key = clean(name).toLowerCase();
  if (Object.prototype.hasOwnProperty.call(CP_PAGES, key)) return CP_PAGES[key];
  return String(name).replace(/^\/+/, '');
}

const CP_HINT = 'Log in to the control panel first (I am logged in to the control panel as "..."). The control panel renders its chrome in `#global-sidebar`, `#global-header` and `#main`.';

/** The control panel chrome: present on every control panel screen of a signed-in user. */
function cpChrome(world) {
  return world.page.locator('#global-sidebar');
}

/**
 * The message screen of the control panel: a page without the chrome that holds
 * a heading and a sentence. A forbidden request gets it ("Unauthorized"), and so
 * does an address that does not exist ("Page Not Found").
 */
function messageScreen(world) {
  return world.page.locator('body.message .message-container');
}

/** The "Unauthorized" screen the control panel answers a forbidden request with. */
function deniedScreen(world) {
  return messageScreen(world).filter({ has: world.page.locator('h2', { hasText: /^\s*(Unauthorized|Forbidden)\s*$/ }) });
}

/** The "Page Not Found" screen the control panel answers an address it does not know with. */
function missingScreen(world) {
  return messageScreen(world).filter({ has: world.page.locator('h2', { hasText: /^\s*Page Not Found\s*$/ }) });
}

/** Open a control panel page by name or path and wait for the chrome or the denied screen. */
async function openCpPage(world, name) {
  const url = cpUrl(world, cpPath(name));
  await actOrExplain('open the control panel page', name, async () => {
    await open(world, url);
    await world.page.locator('#global-sidebar, body.message .message-container, form.login-form').first().waitFor({ state: 'attached', timeout: budget(world) });
  }, `The step opened ${url}. Check launchUrl and worldParameters.cpTrigger in cucumber.js.`);
  if (await missingScreen(world).count()) {
    throw friendly({
      message: `The control panel has no page "${name}": ${url} answered "Page Not Found".`,
      hint: `Use one of the names (${Object.keys(CP_PAGES).join(', ')}) or the path after the control panel trigger, as the address bar shows it.`,
    });
  }
}

/** Fail with a friendly error unless the control panel chrome is on the page. */
async function requireCp(world) {
  if (await cpChrome(world).count()) return;
  const login = await world.page.locator('form.login-form').count();
  throw friendly({
    message: login ? 'The control panel shows its login form: nobody is logged in.' : `This is not a control panel screen (${world.page.url()}).`,
    hint: CP_HINT,
  });
}

// ---------------------------------------------------------------------------
// Notifications
// ---------------------------------------------------------------------------

// The control panel shows its notifications (flash messages after a redirect and
// the results of background requests) in `#notifications`, one `.notification`
// each with `data-type` success, notice or error, and removes them after a few
// seconds. A recorder keeps the ones the page showed, so an assertion a moment
// after the notification faded still reads it; the record is kept per tab and
// cleared whenever a step of this pack acts on the page.
const RECORDER = `(() => {
  if (window.__notificationRecorder) return;
  window.__notificationRecorder = true;
  const KEY = '__shownNotifications';
  const read = () => { try { return JSON.parse(sessionStorage.getItem(KEY) || '[]'); } catch (e) { return []; } };
  const record = (node) => {
    if (!node || node.nodeType !== 1 || !node.classList || !node.classList.contains('notification') || node.__recorded) return;
    node.__recorded = true;
    const message = node.querySelector('.notification-message');
    const list = read();
    list.push({ type: node.getAttribute('data-type') || '', text: ((message || node).textContent || '').replace(/\\s+/g, ' ').trim(), at: Date.now() });
    try { sessionStorage.setItem(KEY, JSON.stringify(list.slice(-30))); } catch (e) { /* storage is full or blocked */ }
  };
  const scan = () => document.querySelectorAll('#notifications .notification').forEach(record);
  const start = () => {
    scan();
    new MutationObserver(scan).observe(document.documentElement, { childList: true, subtree: true });
  };
  if (document.documentElement) start(); else document.addEventListener('DOMContentLoaded', start);
})();`;

/** Start recording the notifications of this browser context (once). */
async function recordNotifications(world) {
  if (!world.__notificationsRecorded) {
    world.__notificationsRecorded = true;
    await world.page.context().addInitScript(RECORDER);
  }
  await world.page.evaluate(RECORDER).catch(() => {});
}

/** Forget the notifications shown so far: the next assertion is about what the next action shows. */
async function forgetNotifications(world) {
  await world.page.evaluate(() => { try { sessionStorage.removeItem('__shownNotifications'); } catch (e) { /* ignore */ } }).catch(() => {});
}

const NOTIFICATION_TYPES = { success: 'success', error: 'error', notice: 'notice', warning: 'notice', info: 'notice' };

/**
 * The notifications on the page now and the ones recorded since the last
 * action, as `{type, text}`.
 */
async function shownNotifications(world) {
  return world.page.evaluate(() => {
    const now = [...document.querySelectorAll('#notifications .notification')].map((node) => ({
      type: node.getAttribute('data-type') || '',
      text: ((node.querySelector('.notification-message') || node).textContent || '').replace(/\s+/g, ' ').trim(),
    }));
    let recorded = [];
    try { recorded = JSON.parse(sessionStorage.getItem('__shownNotifications') || '[]'); } catch (e) { /* ignore */ }
    const seen = new Set();
    return [...recorded, ...now].filter((item) => {
      const key = item.type + '|' + item.text;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }).catch(() => []);
}

/**
 * Wait for a notification of a type (or any type) containing a text.
 *
 * @param {object} world
 * @param {string|null} type success, error or notice
 * @param {string} text
 */
async function expectNotification(world, type, text) {
  const wanted = type ? NOTIFICATION_TYPES[String(type).toLowerCase()] : null;
  const matches = (list) => list.some((item) => (!wanted || item.type === wanted) && item.text.includes(text));
  await eventually(world, () => shownNotifications(world), matches, (list) => ({
    message: `Expected the ${wanted ? wanted + ' ' : ''}notification "${text}". The control panel showed: ${list.length ? list.map((item) => `[${item.type}] ${item.text}`).join('; ') : 'no notification'}.`,
    hint: 'Notifications are the messages at the corner of the control panel (`#notifications .notification`). Assert them right after the action that raises them.',
  }));
}

// ---------------------------------------------------------------------------
// Dialogs and menus
// ---------------------------------------------------------------------------

/**
 * Accept the next browser confirm dialog, unless the scenario set its own
 * policy with webship-js's "I will accept/dismiss the next dialog" steps.
 *
 * @returns {Function} call it to stop waiting when no dialog came.
 */
function acceptNextDialog(world) {
  if (world._dialogHandler) return () => {};
  const handler = (dialog) => { dialog.accept().catch(() => {}); };
  world.page.once('dialog', handler);
  return () => { try { world.page.off('dialog', handler); } catch { /* ignore */ } };
}

/** The menu that is open now (a disclosure menu or a listbox menu). */
function openMenu(world) {
  return world.page.locator('.menu.visible, .menu--disclosure.visible').last();
}

/**
 * Click an item of the menu that is open, by its text.
 *
 * @param {object} world
 * @param {string} item
 * @param {string} what - what the menu is, for the error message
 */
async function chooseFromOpenMenu(world, item, what, own) {
  const menu = own || openMenu(world);
  try {
    await menu.waitFor({ state: 'visible', timeout: budget(world) });
  } catch (err) {
    throw friendly({ message: `The ${what} did not open.`, cause: err, hint: 'The menus of the control panel are `.menu` elements that get the class `visible` when they open.' });
  }
  // The label of an item can be followed by a description or a keyboard shortcut: compare the label alone.
  const items = menu.locator('a, button');
  const labels = await items.evaluateAll((nodes) => nodes.map((node) => {
    const label = node.querySelector('.menu-item-label') || node;
    const copy = label.cloneNode(true);
    copy.querySelectorAll('.shortcut, .menu-item-description, .visually-hidden, .status, .icon').forEach((child) => child.remove());
    return copy.textContent.replace(/\s+/g, ' ').trim();
  }));
  const index = labels.indexOf(clean(item));
  if (index < 0) {
    await world.page.keyboard.press('Escape').catch(() => {});
    throw friendly({ message: `The ${what} has no item "${item}". It offers: ${listed(labels)}.`, hint: 'Use the text of the item as the menu shows it.' });
  }
  const target = items.nth(index);
  if (/\bdisabled\b/.test((await target.getAttribute('class')) || '') || (await target.getAttribute('aria-disabled')) === 'true') {
    await world.page.keyboard.press('Escape').catch(() => {});
    throw friendly({ message: `The item "${item}" of the ${what} is disabled.`, hint: 'The action is not available for this selection or this account.' });
  }
  await target.click();
}

/**
 * Open the menu of a button and click one of its items. The menu is the one the
 * button names in `aria-controls`, so another menu that is still fading out is
 * never taken for it.
 *
 * @param {object} world
 * @param {import('playwright').Locator} button
 * @param {string} item
 * @param {string} what - what the menu is, for the error message
 */
async function chooseFromMenu(world, button, item, what) {
  const trigger = button.first();
  const id = await trigger.getAttribute('aria-controls');
  if ((await trigger.getAttribute('aria-expanded')) !== 'true') await trigger.click();
  const menu = id ? world.page.locator(`[id=${quoted(id)}]`).first() : null;
  await chooseFromOpenMenu(world, item, what, menu && (await menu.count()) ? menu : null);
}

// ---------------------------------------------------------------------------
// The element index
// ---------------------------------------------------------------------------

const INDEX_HINT = 'Open an index first (Entries, Categories or Assets), or the selection modal of a relation field. The index is `.element-index` with its items in `div.elements`.';

// The list of an index. A relation field of an edit form is a `ul.elements` too, so the list is the `div`.
const LIST = 'div.elements';

/**
 * The element index a step acts on: the one of the selection modal when one is
 * open, else the one of the page.
 *
 * @returns {Promise<import('playwright').Locator>}
 */
async function indexScope(world) {
  const modal = world.page.locator('.modal.elementselectormodal:visible').last();
  if (await modal.count()) return modal;
  // An edit form holds `.elements` as well (the chips of its relation fields): only `.element-index` is an index.
  const page = world.page.locator('#main-content:has(.element-index), #main:has(.element-index)').first();
  try {
    await page.waitFor({ state: 'attached', timeout: budget(world) });
  } catch (err) {
    throw friendly({ message: `There is no element index on this screen (${world.page.url()}).`, cause: err, hint: INDEX_HINT });
  }
  return page;
}

/**
 * Wait until the index finished loading: its list is not `busy`, no column is
 * `loading` (a sort by a column header), and the count of the footer is in
 * (it arrives after the items, behind `#count-spinner`).
 */
async function waitForIndex(world, scope) {
  const index = scope || (await indexScope(world));
  await world.page.waitForFunction((root) => {
    const elements = root.querySelector('div.elements');
    if (!elements || elements.classList.contains('busy')) return false;
    if (elements.querySelector('thead th.loading')) return false;
    const spinner = root.querySelector('#count-spinner');
    if (spinner && !spinner.classList.contains('hidden')) return false;
    // Each source has a "View" button of its own: while the index swaps them, none of them shows.
    const views = [...root.querySelectorAll('button[aria-label="View settings"]')];
    if (views.length && views.filter((button) => !button.classList.contains('hidden')).length !== 1) return false;
    return !!elements.querySelector('table, .card-grid, .thumbsview, .zilch, p');
  }, await index.elementHandle(), { timeout: budget(world) }).catch(() => {});
}

/**
 * Do something that makes the index reload (search, filter, sort, a source, a
 * bulk action) and wait for the reload to finish.
 */
async function reloadingIndex(world, scope, fn) {
  await afterRequests(world, fn);
  await waitForIndex(world, scope);
  // An action is followed by a reload of the list: wait for that one too.
  await settle(world, budget(world));
  await waitForIndex(world, scope);
}

/**
 * The items of the index: the rows of the table view (a structure is a table
 * too, its rows carry `data-level`), the cards, or the thumbnails. The copy of
 * a row that follows the pointer while it is dragged is not an item.
 */
function indexItems(scope) {
  return scope.locator(`${LIST} tbody tr[data-id]:not(.draghelper), ${LIST} .card-grid > li[data-id], ${LIST} .thumbsview > li[data-id]`);
}

/** The titles of the items the index shows, in order. */
async function indexTitles(scope) {
  return indexItems(scope).evaluateAll((items) => items.map((item) => {
    const own = item.matches('tr') ? item.querySelector('th .element[data-label], th [data-label]') : item.querySelector('.element[data-label]');
    return own ? own.getAttribute('data-label') : (item.getAttribute('data-title') || '');
  }));
}

/** The item of the index with a title (the label of its chip or card). */
function indexItem(scope, title) {
  const label = `[data-label=${quoted(title)}]`;
  return scope.locator(`${LIST} tbody tr[data-id]:not(.draghelper):has(th ${label}), ${LIST} .card-grid > li[data-id]:has(.element${label}), ${LIST} .thumbsview > li[data-id]:has(.element${label})`);
}

/** The item with a title, or a friendly error listing what the index shows. */
async function requireIndexItem(world, scope, title) {
  const item = indexItem(scope, title);
  try {
    await item.first().waitFor({ state: 'visible', timeout: budget(world) });
  } catch (err) {
    const titles = await indexTitles(scope).catch(() => []);
    throw friendly({ message: `The index does not show "${title}". It shows: ${listed(titles.slice(0, 30))}${titles.length > 30 ? ', ...' : ''}.`, hint: 'Use the title the index shows. Search or change the source, the status or the page when the item is elsewhere.' });
  }
  return item.first();
}

/**
 * What the footer of the index says: the first and the last item shown and the
 * total ("1–100 of 120 entries", "3 entries").
 *
 * @returns {Promise<{first: number, last: number, total: number, text: string}>}
 */
async function indexCount(world, scope) {
  const text = clean(await scope.locator('#count-container, .page-info').first().innerText({ timeout: budget(world) }).catch(() => ''));
  const range = text.match(/([\d,.]+)\s*[–-]\s*([\d,.]+)\s+of\s+([\d,.]+)/);
  const number = (value) => Number(String(value).replace(/[,.]/g, ''));
  if (range) return { first: number(range[1]), last: number(range[2]), total: number(range[3]), text };
  const single = text.match(/([\d,.]+)\s+\S+/);
  if (single) return { first: number(single[1]) ? 1 : 0, last: number(single[1]), total: number(single[1]), text };
  const shown = await indexItems(scope).count();
  return { first: shown ? 1 : 0, last: shown, total: shown, text };
}

/** Open a source of the index sidebar by its label. */
async function openSource(world, name) {
  const scope = await indexScope(world);
  const sources = scope.locator('.sidebar .sources-list a[data-key], #sidebar .sources-list a[data-key]');
  const source = scope.locator(`.sidebar .sources-list a[data-label=${quoted(name)}], #sidebar .sources-list a[data-label=${quoted(name)}]`).first();
  if (!(await source.count())) {
    const labels = await sources.evaluateAll((items) => items.map((item) => item.getAttribute('data-label')));
    throw friendly({ message: `The index has no source "${name}". Its sources are: ${listed(labels)}.`, hint: 'A source is an item of the sidebar of the index (a section, a group, a volume). An account only sees the sources it may view.' });
  }
  if ((await source.getAttribute('aria-current')) === 'true') return;
  await reloadingIndex(world, scope, () => source.click());
}

/** Tick the checkbox of an index item. */
async function selectIndexItem(world, scope, title) {
  const item = await requireIndexItem(world, scope, title);
  if (/\bsel\b/.test((await item.getAttribute('class')) || '')) return;
  const checkbox = item.locator('.checkbox[role="checkbox"]').first();
  if (await checkbox.count()) {
    if ((await checkbox.getAttribute('aria-checked')) !== 'true') await checkbox.click();
  } else {
    // A selection modal without checkboxes: clicking the row selects it.
    await item.click();
  }
}

// ---------------------------------------------------------------------------
// The edit form
// ---------------------------------------------------------------------------

const FORM_HINT = 'Open an edit form first (an entry, a category, an asset, a user). Fields are `.field` elements with their label in `.heading`.';

/**
 * Wait until every element editor on the screen is ready. A form shows its
 * fields before the editor behind it has started (a slide-out about a tenth of
 * a second before); the editor remembers the values it starts with and saves
 * only what changed since, so a value typed too early is taken for the stored
 * one and never saved. A form is ready when it carries `data-element-editor`
 * and its editor holds the values it started with: every slide-out that shows
 * has to get there, and so does the form of the page when it is an editor.
 */
async function waitForEditors(world) {
  await world.page.waitForFunction(() => {
    // `offsetParent` is null for the fixed panels of the preview: go by the boxes.
    const shows = (node) => node.getClientRects().length > 0;
    const ready = (form) => form.hasAttribute('data-element-editor') && (!window.jQuery || (window.jQuery(form).data('elementEditor') && window.jQuery(form).data('initialSerializedValue') !== undefined));
    const slideouts = [...document.querySelectorAll('.slideout-container .slideout')].filter(shows);
    const forms = [...document.querySelectorAll('form[data-element-editor]')].filter(shows);
    return slideouts.every(ready) && forms.every(ready);
  }, null, { timeout: budget(world) }).catch(() => {});
}

/**
 * The form a step acts on: the slide-out editor on top when one is open, the
 * editor of the preview when it is open, else the page.
 */
async function formScope(world) {
  await waitForEditors(world);
  const slideout = world.page.locator('.slideout-container:visible .slideout').last();
  if (await slideout.count()) return slideout;
  const preview = world.page.locator('.lp-editor-container:visible').last();
  if (await preview.count()) return preview;
  return world.page.locator('#main, main').first();
}

/**
 * The field with a label: the `.field` whose heading holds the label (or the
 * legend) with exactly that text. The "Required" marker is not part of it.
 *
 * @param {import('playwright').Locator} scope
 * @param {string} label
 */
function fieldByLabel(scope, label) {
  return scope.locator('.field').filter({
    has: scope.page().locator(':scope > .heading label, :scope > .heading legend, :scope > .input > label').filter({ hasText: new RegExp('^\\s*' + escapeRegExp(label) + '\\s*(Required)?\\s*$') }),
  });
}

/** The labels of the fields of a scope, for error messages. */
async function fieldLabels(scope) {
  return scope.locator('.field > .heading label, .field > .heading legend').evaluateAll((labels) => labels.map((label) => {
    const copy = label.cloneNode(true);
    copy.querySelectorAll('.visually-hidden, .required').forEach((node) => node.remove());
    return copy.textContent.trim();
  }));
}

/**
 * The field with a label, visible (its tab is opened when it sits on another
 * tab), or a friendly error listing the fields of the form.
 *
 * @param {object} world
 * @param {string} label
 * @param {import('playwright').Locator} [within] - a narrower scope (a block of a nested field)
 */
async function requireField(world, label, within) {
  const scope = within || (await formScope(world));
  const field = fieldByLabel(scope, label).first();
  try {
    await field.waitFor({ state: 'attached', timeout: budget(world) });
  } catch (err) {
    const labels = await fieldLabels(scope).catch(() => []);
    throw friendly({ message: `There is no field labelled "${label}" on the form. Its fields are: ${listed(labels)}.`, hint: FORM_HINT });
  }
  if (!(await field.isVisible())) {
    // The field sits on a tab that is not open: open the tab that holds it.
    const tabId = await field.evaluate((node) => {
      const panel = node.closest('[role="tabpanel"], [data-layout-tab], .flex-fields[data-id]');
      return panel ? (panel.getAttribute('aria-labelledby') || '') : '';
    });
    if (tabId) {
      await world.page.locator(`[id=${quoted(tabId)}]`).first().click().catch(() => {});
      await field.waitFor({ state: 'visible', timeout: budget(world) }).catch(() => {});
    }
  }
  await field.scrollIntoViewIfNeeded().catch(() => {});
  return field;
}

/**
 * Wait until the form stored the changes made so far: edit forms save a
 * provisional draft in the background and show a spinner while they do.
 */
async function waitForStoredChanges(world) {
  const page = world.page;
  // Ask each element editor to compare its form with what it stored and to save the difference now, instead of
  // waiting for its own timer; the promise it returns settles when the save is done.
  await page.evaluate(async () => {
    const forms = [...document.querySelectorAll('form[data-element-editor], form#main-form')];
    for (const form of forms) {
      const editor = window.jQuery ? window.jQuery(form).data('elementEditor') : null;
      if (editor && typeof editor.checkForm === 'function') {
        try { await editor.checkForm(); } catch (e) { /* the form reports a failed save itself */ }
      }
    }
  }).catch(() => {});
  await page.waitForFunction(() => {
    const visible = (node) => !node.classList.contains('hidden') && node.offsetParent !== null;
    if ([...document.querySelectorAll('.revision-spinner')].some(visible)) return false;
    const forms = [...document.querySelectorAll('form[data-element-editor], form#main-form')];
    for (const form of forms) {
      const editor = window.jQuery ? window.jQuery(form).data('elementEditor') : null;
      if (editor && (editor.saving || editor.savingDraft || editor.timeout)) return false;
    }
    return true;
  }, null, { timeout: 30000 }).catch(() => {});
  await settle(world);
}

/** Open a tab of the form ("Content", "Details") by its label. */
async function openFormTab(world, name) {
  const scope = await formScope(world);
  const tabs = scope.locator('[role="tablist"] [role="tab"]');
  const tab = tabs.filter({ hasText: exactly(name) }).first();
  if (!(await tab.count())) {
    throw friendly({ message: `The form has no "${name}" tab. Its tabs are: ${listed(await tabs.allInnerTexts())}.`, hint: 'Tabs come from the field layout of the entry type, the category group or the volume.' });
  }
  await tab.click();
  await world.page.waitForFunction((node) => node.getAttribute('aria-selected') === 'true', await tab.elementHandle(), { timeout: budget(world) }).catch(() => {});
}

/** Open a menu button of the edit form or the slide-out and choose an item. */
async function chooseFromFormMenu(world, button, what, item) {
  try {
    await button.first().waitFor({ state: 'visible', timeout: budget(world) });
  } catch (err) {
    throw friendly({ message: `The form has no ${what}.`, cause: err, hint: FORM_HINT });
  }
  await chooseFromMenu(world, button, item, what);
}

module.exports = {
  budget,
  settleBudget,
  supplied,
  escapeRegExp,
  literal,
  exactly,
  quoted,
  clean,
  listed,
  siteRoot,
  siteUrl,
  cpTrigger,
  cpUrl,
  cpPath,
  requests,
  open,
  settle,
  afterRequests,
  actOrExplain,
  assertPresence,
  eventually,
  resolveUser,
  mailUrl,
  mailTo,
  CP_PAGES,
  CP_HINT,
  cpChrome,
  messageScreen,
  deniedScreen,
  missingScreen,
  openCpPage,
  requireCp,
  recordNotifications,
  forgetNotifications,
  shownNotifications,
  expectNotification,
  acceptNextDialog,
  openMenu,
  chooseFromOpenMenu,
  chooseFromMenu,
  INDEX_HINT,
  LIST,
  indexScope,
  waitForIndex,
  reloadingIndex,
  indexItems,
  indexTitles,
  indexItem,
  requireIndexItem,
  indexCount,
  openSource,
  selectIndexItem,
  FORM_HINT,
  waitForEditors,
  formScope,
  fieldByLabel,
  fieldLabels,
  requireField,
  waitForStoredChanges,
  openFormTab,
  chooseFromFormMenu,
};
