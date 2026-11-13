'use strict';

// The control panel session: logging in by a handle of the users registry or by
// credentials, logging out, and what the control panel says about who is
// signed in.
//
// Accounts are configuration, not test data: they are listed in cucumber.js
// (`worldParameters.users`) and created once by the site build. A feature never
// creates or deletes users.
//
// Every assertion waits on its locator (the assertion is the wait), and every
// failure is a friendly error with a hint instead of a raw Playwright timeout
// stack.

const { Given, When, Then } = require('@cucumber/cucumber');
const { friendly } = require('webship-js/tests/step-definitions/webship');
const {
  budget,
  clean,
  cpUrl,
  open,
  settle,
  assertPresence,
  resolveUser,
  cpChrome,
  recordNotifications,
} = require('./craft-helpers');

const LOGIN_HINT = 'The control panel login form is `form.login-form` at <control panel>/login, with the fields `.login-username` and `.login-password`. Check launchUrl and worldParameters.cpTrigger in cucumber.js.';

/** The login form of the control panel. */
function loginForm(world) {
  return world.page.locator('form.login-form');
}

/** The visible error of the login form, or an empty string. */
async function loginError(world) {
  return clean(await world.page.locator('.login-form-container .login-errors:not(.hidden), form.login-form ~ .login-errors:not(.hidden)').first().innerText({ timeout: 500 }).catch(() => ''));
}

// The sessions of the accounts that logged in during this run, by site and
// username: the cookies of the browser after a login. A scenario that logs in
// as an account that already has a session takes it over instead of filling in
// the login form again. That is quicker, and it keeps a long suite under the
// limit the system puts on login attempts from one address (10 a minute by
// default). `worldParameters.reuseSessions: false` in cucumber.js turns it off.
const SESSIONS = new Map();

function sessionKey(world, username) {
  return `${cpUrl(world, '')}|${username}`;
}

function reuseSessions(world) {
  return !(world.parameters && world.parameters.reuseSessions === false);
}

/** The username the account menu names, or an empty string when nobody is signed in. */
async function signedInUsername(world) {
  const account = world.page.locator('#account-menu a[href*="myaccount"]').first();
  if (!(await account.count())) return '';
  const lines = (await account.locator('div div').allTextContents()).map(clean).filter(Boolean);
  return lines[0] || '';
}

/** Take over the session an account opened earlier in this run. */
async function restoreSession(world, username) {
  const key = sessionKey(world, username);
  const cookies = SESSIONS.get(key);
  if (!cookies || !reuseSessions(world)) return false;
  const context = world.page.context();
  await context.clearCookies();
  await context.addCookies(cookies);
  await open(world, cpUrl(world, 'dashboard'));
  await world.page.locator('#global-sidebar, form.login-form').first().waitFor({ state: 'attached', timeout: budget(world) }).catch(() => {});
  if ((await cpChrome(world).count()) && (await signedInUsername(world)) === username) {
    world.__sessionKey = key;
    return true;
  }
  // The session ended since (a logout, a timeout): log in again.
  SESSIONS.delete(key);
  await context.clearCookies();
  return false;
}

/** Open the login form as a visitor: the browser forgets the session it had. */
async function openLoginForm(world) {
  await world.page.context().clearCookies();
  world.__sessionKey = null;
  await open(world, cpUrl(world, 'login'));
  try {
    await loginForm(world).waitFor({ state: 'visible', timeout: budget(world) });
  } catch (err) {
    throw friendly({ message: `The control panel login form did not appear at ${cpUrl(world, 'login')}.`, cause: err, hint: LOGIN_HINT });
  }
  // The form is wired up by a script that runs when the page is ready.
  await settle(world);
}

/**
 * Fill in and submit the login form, then wait for one of its two outcomes: the
 * control panel or an error under the form.
 *
 * @returns {Promise<string>} the error the form showed, or an empty string.
 */
async function submitLogin(world, username, password) {
  await recordNotifications(world);
  await openLoginForm(world);
  const form = loginForm(world);
  await form.locator('.login-username').fill(username);
  await form.locator('.login-password').fill(password);
  await form.locator('button[type="submit"]').click();
  const deadline = Date.now() + 30000;
  for (;;) {
    if (await cpChrome(world).count()) break;
    const error = await loginError(world);
    if (error) return error;
    if (Date.now() > deadline) {
      throw friendly({ message: `Logging in as "${username}" led neither to the control panel nor to an error (${world.page.url()}).`, hint: LOGIN_HINT });
    }
    await world.page.waitForTimeout(200);
  }
  await settle(world);
  return '';
}

/**
 * Log in to the control panel as a user of the users registry
 * (`worldParameters.users` in cucumber.js), by handle.
 *
 * Example #1: Given I am logged in to the control panel as "admin"
 * Example #2: Given we are logged in to the control panel as "editor"
 * Example #3: When I log in to the control panel as "author"
 * Example #4: When we log in to the control panel as "editor"
 * Example #5: Given I am logged in to the control panel as "author"
 */
Given(/^(I |we )*(am logged in|are logged in|log in) to the control panel as "([^"]*)"$/, async function (pronounCase, verbCase, handle) {
  const user = resolveUser(this, handle);
  await recordNotifications(this);
  if (await restoreSession(this, user.username)) return;
  const error = await submitLogin(this, user.username, user.password);
  if (error) {
    throw friendly({
      message: `Could not log in to the control panel as "${handle}" (username "${user.username}"): ${error}`,
      hint: /rate limit/i.test(error)
        ? 'The system allows a number of login attempts a minute from one address (the `defaultRateLimit` general setting, 10 by default). Keep session reuse on (worldParameters.reuseSessions), or raise the limit on the test site.'
        : 'Check the password of the account in worldParameters.users, that the site build created the account, and that it may access the control panel.',
    });
  }
  if (reuseSessions(this)) {
    const key = sessionKey(this, user.username);
    SESSIONS.set(key, await this.page.context().cookies());
    this.__sessionKey = key;
  }
});

/**
 * Submit the control panel login form with a username (or an email address) and
 * a password. The step does not expect the login to succeed: assert the outcome
 * with the next step.
 *
 * Example #1: When I log in to the control panel with the username "admin" and the password "wrong-password"
 * Example #2: When we log in to the control panel with the username "editor" and the password "Editor123456789!"
 * Example #3: When I log in to the control panel with the username "nobody" and the password "nothing-at-all"
 * Example #4: When I log in to the control panel with the username "admin@example.com" and the password "wrong-password"
 * Example #5: When we log in to the control panel with the username "member" and the password "Member123456789!"
 */
When(/^(I |we )*log in to the control panel with the username "([^"]*)" and the password "([^"]*)"$/, async function (pronounCase, username, password) {
  await submitLogin(this, username, password);
});

/**
 * Log out of the control panel through the account menu, as a person does.
 *
 * Example #1: When I log out of the control panel
 * Example #2: When we log out of the control panel
 * Example #3: And I log out of the control panel
 * Example #4: Then I log out of the control panel
 * Example #5: Given I log out of the control panel
 */
When(/^(I |we )*log out of the control panel$/, async function (pronounCase) {
  const toggle = this.page.locator('#user-info');
  if (!(await toggle.count())) {
    throw friendly({ message: 'Nobody is logged in to the control panel: the account menu (`#user-info`) is not on the page.', hint: 'Log in first, and stay on a control panel screen.' });
  }
  await toggle.click();
  const link = this.page.locator('#account-menu a[href*="logout"]').first();
  try {
    await link.waitFor({ state: 'visible', timeout: budget(this) });
  } catch (err) {
    throw friendly({ message: 'The account menu has no link to sign out.', cause: err, hint: 'The menu is `#account-menu`; its last item links to <control panel>/logout.' });
  }
  // The session ends on the server: no later scenario can take it over.
  for (const key of [...SESSIONS.keys()]) {
    if (key === this.__sessionKey || key === sessionKey(this, await signedInUsername(this))) SESSIONS.delete(key);
  }
  this.__sessionKey = null;
  await Promise.all([
    this.page.waitForURL((url) => !/\/logout/.test(url.pathname), { timeout: 30000 }).catch(() => {}),
    link.click(),
  ]);
  await cpChrome(this).waitFor({ state: 'detached', timeout: budget(this) }).catch(() => {});
  await settle(this);
});

/**
 * Assert that somebody is, or nobody is, logged in to the control panel. The
 * step opens the control panel: a signed-in user gets its screens, anybody else
 * gets the login form.
 *
 * Example #1: Then I should be logged in to the control panel
 * Example #2: Then I should not be logged in to the control panel
 * Example #3: Then we should be logged in to the control panel
 * Example #4: Then we should not be logged in to the control panel
 * Example #5: And I should not be logged in to the control panel
 */
Then(/^(I |we )*should( not)* be logged in to the control panel$/, async function (pronounCase, notCase) {
  await open(this, cpUrl(this, 'dashboard'));
  await this.page.locator('#global-sidebar, form.login-form').first().waitFor({ state: 'attached', timeout: budget(this) }).catch(() => {});
  const signedIn = (await cpChrome(this).count()) > 0;
  if (notCase && signedIn) {
    const who = clean(await this.page.locator('#account-menu a[href*="myaccount"]').first().textContent().catch(() => ''));
    throw friendly({ message: `Expected nobody to be logged in to the control panel, but ${who || 'somebody'} is.`, hint: 'Log out first (I log out of the control panel).' });
  }
  if (!notCase && !signedIn) {
    throw friendly({ message: `Expected to be logged in to the control panel, but it shows ${(await loginForm(this).count()) ? 'its login form' : this.page.url()}.`, hint: 'Log in first (I am logged in to the control panel as "...").' });
  }
});

/**
 * Assert who is logged in to the control panel, by handle of the users
 * registry: the account menu names the username of the signed-in user.
 *
 * Example #1: Then I should be logged in to the control panel as "admin"
 * Example #2: Then I should be logged in to the control panel as "editor"
 * Example #3: Then we should be logged in to the control panel as "author"
 * Example #4: And I should be logged in to the control panel as "editor"
 * Example #5: Then we should be logged in to the control panel as "admin"
 */
Then(/^(I |we )*should be logged in to the control panel as "([^"]*)"$/, async function (pronounCase, handle) {
  const user = resolveUser(this, handle);
  if (!(await cpChrome(this).count())) {
    await open(this, cpUrl(this, 'dashboard'));
  }
  const account = this.page.locator('#account-menu a[href*="myaccount"]').first();
  try {
    await account.waitFor({ state: 'attached', timeout: budget(this) });
  } catch (err) {
    throw friendly({ message: `Expected "${handle}" to be logged in to the control panel, but nobody is (${this.page.url()}).`, cause: err, hint: 'Log in first (I am logged in to the control panel as "...").' });
  }
  const lines = (await account.locator('div div').allTextContents()).map(clean).filter(Boolean);
  if (!lines.includes(user.username)) {
    throw friendly({ message: `Expected "${user.username}" to be logged in to the control panel, but the account menu names: ${lines.join(', ') || '(nothing)'}.`, hint: 'The account menu (`#account-menu`) shows the username and the email address of the signed-in user.' });
  }
});

/**
 * Assert that the control panel shows, or does not show, its login form.
 *
 * Example #1: Then I should see the control panel login form
 * Example #2: Then I should not see the control panel login form
 * Example #3: Then we should see the control panel login form
 * Example #4: And I should see the control panel login form
 * Example #5: Then we should not see the control panel login form
 */
Then(/^(I |we )*should( not)* see the control panel login form$/, async function (pronounCase, notCase) {
  await assertPresence(loginForm(this), notCase, { label: 'the control panel login form', hint: LOGIN_HINT, timeout: budget(this) });
});

/**
 * Assert the error the control panel login form shows after a failed login.
 *
 * Example #1: Then I should see the login error "Invalid username or password."
 * Example #2: Then I should see the login error "You cannot access the control panel with that account."
 * Example #3: Then we should see the login error "Invalid username or password."
 * Example #4: And I should see the login error "Invalid username"
 * Example #5: Then I should see the login error "cannot access the control panel"
 */
Then(/^(I |we )*should see the login error "([^"]*)"$/, async function (pronounCase, text) {
  const deadline = Date.now() + budget(this);
  let error = '';
  for (;;) {
    error = await loginError(this);
    if (error.includes(text)) return;
    if (Date.now() > deadline) break;
    await this.page.waitForTimeout(200);
  }
  throw friendly({
    message: `Expected the login error "${text}". The login form shows: ${error || 'no error'}${(await cpChrome(this).count()) ? ' (the login succeeded)' : ''}.`,
    hint: 'The error appears under the form in `.login-errors` after a failed login.',
  });
});
