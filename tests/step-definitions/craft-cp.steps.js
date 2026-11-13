'use strict';

// The control panel around the content: its pages by name, the primary
// navigation, the breadcrumbs, the screen heading, the notifications, the
// "Unauthorized" screen an account without the permission gets, the screens of
// a section navigation and the system name.
//
// Every assertion waits on its locator (the assertion is the wait), and every
// failure is a friendly error with a hint instead of a raw Playwright timeout
// stack.

const { Given, When, Then } = require('@cucumber/cucumber');
const { friendly } = require('webship-js/tests/step-definitions/webship');
const {
  budget,
  supplied,
  exactly,
  clean,
  listed,
  cpUrl,
  cpPath,
  settle,
  eventually,
  CP_HINT,
  cpChrome,
  deniedScreen,
  openCpPage,
  requireCp,
  forgetNotifications,
  shownNotifications,
  expectNotification,
} = require('./craft-helpers');

const NAV_HINT = 'The primary navigation is `#nav` in the sidebar of the control panel. An account only sees the items it may open.';
const CRUMB_HINT = 'The breadcrumbs are `#crumbs nav[aria-label="Breadcrumbs"]` at the top of the screen.';

/** The labels of the primary navigation, top level. */
async function navLabels(world) {
  return (await world.page.locator('#nav > ul > li > .nav-item .label').allTextContents()).map(clean);
}

/** A top-level item of the primary navigation by its label. */
function navItem(world, label) {
  return world.page.locator('#nav > ul > li').filter({ has: world.page.locator(':scope > .nav-item .label', { hasText: exactly(label) }) });
}

/** The breadcrumb trail as texts, in order. */
async function crumbs(world) {
  return world.page.locator('#crumbs #crumb-list > li.crumb').evaluateAll((items) => items.map((item) => {
    const label = item.querySelector('.crumb-link, craft-element-label, .label');
    return ((label || item).textContent || '').replace(/\s+/g, ' ').trim();
  }).filter(Boolean));
}

/**
 * Open a control panel page by its name (dashboard, entries, categories,
 * assets, users, my account, utilities, system report, settings, sections,
 * entry types, fields, sites, filesystems, user groups, plugins, ...) or by
 * its path after the control panel trigger.
 *
 * Example #1: When I go to the control panel page "entries"
 * Example #2: When I go to the control panel page "settings"
 * Example #3: Given I am on the control panel page "dashboard"
 * Example #4: When we go to the control panel page "content/entries/blog"
 * Example #5: Given we are on the control panel page "user groups"
 */
When(/^(I |we )*(go to|am on|are on) the control panel page "([^"]*)"$/, async function (pronounCase, verbCase, name) {
  await forgetNotifications(this);
  await openCpPage(this, name);
});

/**
 * Click an item of the primary navigation of the control panel by its label.
 *
 * Example #1: When I click "Entries" in the control panel navigation
 * Example #2: When I click "Assets" in the control panel navigation
 * Example #3: When we click "Users" in the control panel navigation
 * Example #4: And I click "Settings" in the control panel navigation
 * Example #5: When I click "Dashboard" in the control panel navigation
 */
When(/^(I |we )*click "([^"]*)" in the control panel navigation$/, async function (pronounCase, label) {
  await requireCp(this);
  const link = navItem(this, label).locator(':scope > .nav-item > a').first();
  if (!(await link.count())) {
    throw friendly({ message: `The control panel navigation has no item "${label}". Its items are: ${listed(await navLabels(this))}.`, hint: NAV_HINT });
  }
  await forgetNotifications(this);
  await Promise.all([
    this.page.waitForLoadState('domcontentloaded').catch(() => {}),
    link.click(),
  ]);
  await cpChrome(this).waitFor({ state: 'attached', timeout: budget(this) }).catch(() => {});
  await settle(this);
});

/**
 * Assert that the primary navigation of the control panel shows, or does not
 * show, an item: what an account may do decides what it sees.
 *
 * Example #1: Then I should see "Entries" in the control panel navigation
 * Example #2: Then I should not see "Settings" in the control panel navigation
 * Example #3: Then we should see "Assets" in the control panel navigation
 * Example #4: Then I should not see "Users" in the control panel navigation
 * Example #5: And we should not see "Utilities" in the control panel navigation
 */
Then(/^(I |we )*should( not)* see "([^"]*)" in the control panel navigation$/, async function (pronounCase, notCase, label) {
  await requireCp(this);
  await this.page.locator('#nav > ul > li').first().waitFor({ state: 'attached', timeout: budget(this) }).catch(() => {});
  const present = (await navLabels(this)).includes(label);
  if (notCase && present) {
    throw friendly({ message: `Expected no "${label}" in the control panel navigation, but it is there.`, hint: NAV_HINT });
  }
  if (!notCase && !present) {
    throw friendly({ message: `Expected "${label}" in the control panel navigation. Its items are: ${listed(await navLabels(this))}.`, hint: NAV_HINT });
  }
});

/**
 * Assert which item of the primary navigation is the current one.
 *
 * Example #1: Then the control panel navigation item "Entries" should be selected
 * Example #2: Then the control panel navigation item "Dashboard" should be selected
 * Example #3: Then the control panel navigation item "Assets" should be selected
 * Example #4: And the control panel navigation item "Users" should be selected
 * Example #5: Then the control panel navigation item "Settings" should be selected
 */
Then(/^the control panel navigation item "([^"]*)" should be selected$/, async function (label) {
  await requireCp(this);
  const selected = async () => (await this.page.locator('#nav > ul > li > .nav-item > a[aria-current="page"] .label, #nav > ul > li > .nav-item > a.sel .label').allTextContents()).map(clean);
  const all = await navLabels(this);
  await eventually(this, selected, (labels) => labels.includes(label), (labels) => ({
    message: `Expected the control panel navigation item "${label}" to be selected. Selected: ${listed(labels)}. The items are: ${listed(all)}.`,
    hint: NAV_HINT,
  }));
});

/**
 * Assert the breadcrumb trail of the control panel screen, the crumbs joined
 * by " > ".
 *
 * Example #1: Then the control panel breadcrumb should be "Entries > Blog > Launch day"
 * Example #2: Then the control panel breadcrumb should be "Settings > Sections"
 * Example #3: Then the control panel breadcrumb should be "Entries > Pages > About"
 * Example #4: And the control panel breadcrumb should be "Users > Arthur Author"
 * Example #5: Then the control panel breadcrumb should be "Categories > Topics > Product"
 */
Then(/^the control panel breadcrumb should be "([^"]*)"$/, async function (trail) {
  await requireCp(this);
  const wanted = trail.split('>').map(clean).join(' > ');
  await eventually(this, async () => (await crumbs(this)).join(' > '), (found) => found === wanted, (found) => ({
    message: `Expected the control panel breadcrumb "${wanted}", found "${found || '(no breadcrumb)'}".`,
    hint: CRUMB_HINT,
  }));
});

/**
 * Click a crumb of the control panel breadcrumb by its text.
 *
 * Example #1: When I click "Blog" in the control panel breadcrumb
 * Example #2: When I click "Entries" in the control panel breadcrumb
 * Example #3: When we click "Settings" in the control panel breadcrumb
 * Example #4: And I click "Users" in the control panel breadcrumb
 * Example #5: When I click "Topics" in the control panel breadcrumb
 */
When(/^(I |we )*click "([^"]*)" in the control panel breadcrumb$/, async function (pronounCase, text) {
  await requireCp(this);
  const link = this.page.locator('#crumbs #crumb-list > li.crumb a.crumb-link, #crumbs #crumb-list > li.crumb a.label-link').filter({ hasText: exactly(text) }).first();
  if (!(await link.count())) {
    throw friendly({ message: `The control panel breadcrumb has no crumb "${text}". The trail is: ${(await crumbs(this)).join(' > ') || '(no breadcrumb)'}.`, hint: CRUMB_HINT });
  }
  await forgetNotifications(this);
  await Promise.all([
    this.page.waitForLoadState('domcontentloaded').catch(() => {}),
    link.click(),
  ]);
  await settle(this);
});

/**
 * Assert the heading of the control panel screen (`#page-heading`).
 *
 * Example #1: Then the control panel heading should be "Entries"
 * Example #2: Then the control panel heading should be "Dashboard"
 * Example #3: Then the control panel heading should be "Launch day"
 * Example #4: And the control panel heading should be "Create a new entry"
 * Example #5: Then the control panel heading should be "Settings"
 */
Then(/^the control panel heading should be "([^"]*)"$/, async function (text) {
  await requireCp(this);
  const heading = this.page.locator('#page-heading, #header h1').first();
  // On an index the heading also holds the name of the source (`#content-heading`), which the screen does not show there.
  const read = async () => clean(await heading.evaluate((node) => {
    const own = [...node.childNodes].filter((child) => child.nodeType === 3).map((child) => child.textContent).join(' ').trim();
    return own || node.textContent;
  }).catch(() => ''));
  await eventually(this, read, (found) => found === text, (found) => ({
    message: `Expected the control panel heading "${text}", found "${found || '(no heading)'}".`,
    hint: 'The heading of a control panel screen is `h1#page-heading`.',
  }));
});

/**
 * Assert a notification of the control panel: the message it shows at the
 * corner of the screen after an action ("Entry saved.", "Couldn’t save
 * entry."), optionally of one type: success, error or notice.
 *
 * Example #1: Then I should see the notification "Entry saved."
 * Example #2: Then I should see the success notification "Entry created."
 * Example #3: Then I should see the error notification "Couldn’t create entry."
 * Example #4: Then we should see the notification "Draft saved."
 * Example #5: Then I should see the notice notification "Entries deleted."
 */
Then(/^(I |we )*should see the (success |error |notice )?notification "([^"]*)"$/, async function (pronounCase, typeCase, text) {
  await expectNotification(this, supplied(typeCase) ? typeCase.trim() : null, text);
});

/**
 * Assert that the control panel showed no error notification since the last
 * action.
 *
 * Example #1: Then I should not see an error notification
 * Example #2: Then we should not see an error notification
 * Example #3: And I should not see an error notification
 * Example #4: But I should not see an error notification
 * Example #5: And we should not see an error notification
 */
Then(/^(I |we )*should not see an error notification$/, async function (pronounCase) {
  await settle(this);
  const errors = (await shownNotifications(this)).filter((item) => item.type === 'error');
  if (errors.length) {
    throw friendly({ message: `Expected no error notification, but the control panel showed: ${errors.map((item) => item.text).join('; ')}.`, hint: 'Error notifications are `#notifications .notification[data-type="error"]`.' });
  }
});

/**
 * Assert that the control panel answered with its "Unauthorized" screen,
 * optionally with a message: what an account without the permission gets.
 *
 * Example #1: Then I should see the unauthorized screen
 * Example #2: Then I should see the unauthorized screen with "User is not permitted to perform this action."
 * Example #3: Then we should see the unauthorized screen
 * Example #4: Then I should see the unauthorized screen with "not authorized to edit this element"
 * Example #5: And we should see the unauthorized screen with "not authorized"
 */
Then(/^(I |we )*should see the unauthorized screen(?: with "([^"]*)")?$/, async function (pronounCase, text) {
  const screen = deniedScreen(this);
  try {
    await screen.waitFor({ state: 'attached', timeout: budget(this) });
  } catch (err) {
    throw friendly({ message: `Expected the "Unauthorized" screen, but the page is ${clean(await this.page.title())} (${this.page.url()}).`, hint: 'The control panel answers a forbidden request with a message screen (`body.message`) headed "Unauthorized".' });
  }
  const found = clean(await screen.textContent());
  if (!/Unauthorized|Forbidden/.test(found) || (supplied(text) && !found.includes(text))) {
    throw friendly({ message: `Expected the "Unauthorized" screen${supplied(text) ? ` with "${text}"` : ''}, found the message "${found}".`, hint: 'The message names the reason the request was refused.' });
  }
});

/**
 * Assert that the signed-in account may, or may not, open a control panel
 * page (by name or path): the step opens it and reads the answer.
 *
 * Example #1: Then I should be allowed to open the control panel page "entries"
 * Example #2: Then I should not be allowed to open the control panel page "settings"
 * Example #3: Then we should not be allowed to open the control panel page "users"
 * Example #4: Then I should not be allowed to open the control panel page "utilities/system-report"
 * Example #5: And I should be allowed to open the control panel page "assets"
 */
Then(/^(I |we )*should( not)* be allowed to open the control panel page "([^"]*)"$/, async function (pronounCase, notCase, name) {
  const url = cpUrl(this, cpPath(name));
  const response = await this.page.goto(url, { waitUntil: 'domcontentloaded' });
  const status = response ? response.status() : 0;
  await this.page.locator('#global-sidebar, body.message .message-container, form.login-form').first().waitFor({ state: 'attached', timeout: budget(this) }).catch(() => {});
  if (await this.page.locator('form.login-form').count()) {
    throw friendly({ message: `Nobody is logged in: the control panel answered ${url} with its login form.`, hint: CP_HINT });
  }
  const denied = status === 403 || (await deniedScreen(this).count()) > 0;
  if (notCase && !denied) {
    throw friendly({ message: `Expected the control panel page "${name}" to be refused, but it opened (HTTP ${status}, "${clean(await this.page.title())}").`, hint: 'Check the permissions of the account and of its user groups.' });
  }
  if (!notCase && (denied || status >= 400)) {
    const message = clean(await deniedScreen(this).textContent().catch(() => ''));
    throw friendly({ message: `Expected the control panel page "${name}" to open, but it was refused (HTTP ${status}${message ? ', "' + message + '"' : ''}).`, hint: 'Check the permissions of the account and of its user groups.' });
  }
});

/**
 * Open a screen of the section navigation at the side of a control panel
 * screen: "Permissions" of a user account, "Sections" of the settings.
 *
 * Example #1: When I open the "Permissions" screen of the section navigation
 * Example #2: When I open the "Addresses" screen of the section navigation
 * Example #3: When we open the "Profile" screen of the section navigation
 * Example #4: And I open the "Preferences" screen of the section navigation
 * Example #5: When I open the "Password & Verification" screen of the section navigation
 */
When(/^(I |we )*open the "([^"]*)" screen of the section navigation$/, async function (pronounCase, name) {
  await requireCp(this);
  const links = this.page.locator('#sidebar nav a');
  const link = links.filter({ hasText: exactly(name) }).first();
  if (!(await link.count())) {
    throw friendly({ message: `The section navigation has no screen "${name}". Its screens are: ${listed(await links.allTextContents())}.`, hint: 'The section navigation is the list of links in `#sidebar` (an account screen, a settings screen).' });
  }
  await forgetNotifications(this);
  await Promise.all([
    this.page.waitForLoadState('domcontentloaded').catch(() => {}),
    link.click(),
  ]);
  await settle(this);
});

/**
 * Assert the system name the control panel shows at the top of its sidebar.
 *
 * Example #1: Then the control panel system name should be "Webship Test Site"
 * Example #2: Then the control panel system name should be "My Site"
 * Example #3: And the control panel system name should be "Webship Test Site"
 * Example #4: Then the control panel system name should be "Acme"
 * Example #5: Then the control panel system name should be "Staging"
 */
Then(/^the control panel system name should be "([^"]*)"$/, async function (name) {
  await requireCp(this);
  const found = clean(await this.page.locator('#system-name').first().textContent({ timeout: budget(this) }).catch(() => ''));
  if (found !== name) {
    throw friendly({ message: `Expected the control panel system name "${name}", found "${found || '(none)'}".`, hint: 'The system name is `#system-name` in the sidebar: the name of the site unless the general settings set another.' });
  }
});
