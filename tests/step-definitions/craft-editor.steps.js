'use strict';

// The edit form of an element (an entry, a category, an asset, a user): starting
// a new entry or category, saving, the tabs, the save and the actions menus,
// drafts and revisions (create a draft, apply it, switch between versions), the
// changes the form stores in the background, slide-out editors, the preview and
// the page on the site.
//
// Fields are filled in with the steps of craft-fields.steps.js and with the
// webship-js form steps (I fill in "Title" with "...").
//
// Every assertion waits on its locator (the assertion is the wait), and every
// failure is a friendly error with a hint instead of a raw Playwright timeout
// stack.

const { When, Then } = require('@cucumber/cucumber');
const { friendly } = require('webship-js/tests/step-definitions/webship');
const {
  budget,
  exactly,
  clean,
  listed,
  open,
  settle,
  assertPresence,
  eventually,
  openCpPage,
  requireCp,
  forgetNotifications,
  acceptNextDialog,
  chooseFromOpenMenu,
  indexScope,
  waitForIndex,
  requireIndexItem,
  openSource,
  FORM_HINT,
  waitForEditors,
  formScope,
  waitForStoredChanges,
  openFormTab,
  chooseFromFormMenu,
} = require('./craft-helpers');

const VERSION_HINT = 'The version menu sits next to the breadcrumbs (`#context-menu-container`) once the element has a draft or a revision. Sections keep revisions when versioning is on.';

/** Whether the form a step acts on is a slide-out editor. */
async function inSlideout(world) {
  return (await world.page.locator('.slideout-container:visible .slideout').count()) > 0;
}

/** The main save button of the form: "Save", "Create entry", "Save draft". */
async function saveButton(world) {
  const scope = await formScope(world);
  if (await inSlideout(world)) return scope.locator('.so-footer button[type="submit"]').first();
  return world.page.locator('#action-buttons button[type="submit"]:not(.menubtn)').first();
}

/** Wait for the edit form of a full page. */
async function waitForEditForm(world) {
  try {
    await world.page.locator('#main-content .field, #main-content #content, .slideout .field, body.message .message-container').first().waitFor({ state: 'attached', timeout: budget(world) });
  } catch (err) {
    throw friendly({ message: `The edit form did not open (${world.page.url()}).`, cause: err, hint: FORM_HINT });
  }
  await settle(world);
  await waitForEditors(world);
}

/** Click something that loads a new page (a save, a version) and wait for it. */
async function clickAndLoad(world, locator) {
  await forgetNotifications(world);
  await Promise.all([
    world.page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {}),
    locator.click(),
  ]);
  await settle(world);
}

/** The frame of the preview, or null. */
function previewFrame(world) {
  return world.page.frames().find((frame) => /x-craft-(live-)?preview=/.test(frame.url())) || null;
}

/**
 * Start a new entry in a section, or a new category in a category group: open
 * the index, choose the source and press its "New" button. The edit form opens
 * on a new, unsaved element.
 *
 * Example #1: When I start a new entry in the "Blog" section
 * Example #2: When I start a new entry in the "Pages" section
 * Example #3: When I start a new category in the "Topics" group
 * Example #4: When we start a new entry in the "Notes" section
 * Example #5: And I start a new category in the "Topics" group
 */
When(/^(I |we )*start a new (entry|category) in the "([^"]*)" (?:section|group)$/, async function (pronounCase, type, name) {
  await openCpPage(this, type === 'entry' ? 'entries' : 'categories');
  await requireCp(this);
  await openSource(this, name);
  const button = this.page.locator('#action-buttons button.add:not(.menubtn), #action-buttons a.add').first();
  if (!(await button.count())) {
    throw friendly({ message: `There is no button to add a new ${type} in "${name}".`, hint: `The account needs the permission to create ${type === 'entry' ? 'entries in the section' : 'categories in the group'}; a single section holds one entry only.` });
  }
  await forgetNotifications(this);
  await button.click();
  // The new element gets an address of its own: .../<section>/<id>.
  await this.page.waitForURL((url) => /\/\d+(-[^/]*)?$/.test(url.pathname), { timeout: 30000 }).catch(() => {});
  await waitForEditForm(this);
});

/**
 * Save the edit form with its main button, whatever it reads: "Save", "Create
 * entry", "Save draft". The step works on the slide-out editor when one is
 * open, else on the page, and waits for the result. Assert the result with the
 * next step: a notification, or the errors of the form.
 *
 * Example #1: When I save the edit form
 * Example #2: When we save the edit form
 * Example #3: And I save the edit form
 * Example #4: And we save the edit form
 * Example #5: Then I save the edit form
 */
When(/^(I |we )*save the edit form$/, async function (pronounCase) {
  const button = await saveButton(this);
  if (!(await button.count())) {
    throw friendly({ message: 'The screen has no edit form to save.', hint: FORM_HINT });
  }
  await waitForStoredChanges(this);
  if (await inSlideout(this)) {
    const slideouts = this.page.locator('.slideout-container:visible');
    const count = await slideouts.count();
    await forgetNotifications(this);
    await button.click();
    // The slide-out closes when the save succeeds and shows its errors when it fails.
    await this.page.waitForFunction((before) => {
      const open = [...document.querySelectorAll('.slideout-container')].filter((node) => node.offsetParent !== null || getComputedStyle(node).display !== 'none');
      return open.length < before || !!document.querySelector('.slideout .error-summary, .slideout .field.has-errors, .slideout ul.errors');
    }, count, { timeout: 30000 }).catch(() => {});
    await settle(this);
    return;
  }
  await clickAndLoad(this, button);
});

/**
 * Assert what the main button of the edit form reads: "Create entry" on a new
 * entry, "Save" on a saved one, "Save draft" on a draft.
 *
 * Example #1: Then the save button of the edit form should read "Create entry"
 * Example #2: Then the save button of the edit form should read "Save"
 * Example #3: Then the save button of the edit form should read "Save draft"
 * Example #4: And the save button of the edit form should read "Create category"
 * Example #5: Then the save button of the edit form should read "Save"
 */
Then(/^the save button of the edit form should read "([^"]*)"$/, async function (text) {
  const button = await saveButton(this);
  await eventually(this, async () => clean(await button.innerText().catch(() => '')), (found) => found === text, (found) => ({
    message: `Expected the save button of the edit form to read "${text}", found "${found || '(no save button)'}".`,
    hint: 'The main button reads "Create entry" on a new entry, "Save" on a saved one and "Save draft" on a draft.',
  }));
});

/**
 * Choose an item of the save menu of the edit form (the arrow next to the main
 * button): "Save and continue editing", "Save and add another", "Save as a new
 * entry".
 *
 * Example #1: When I choose "Save and continue editing" from the save menu of the edit form
 * Example #2: When I choose "Save and add another" from the save menu of the edit form
 * Example #3: When I choose "Save as a new entry" from the save menu of the edit form
 * Example #4: When we choose "Save and continue editing" from the save menu of the edit form
 * Example #5: And I choose "Save and continue editing" from the save menu of the edit form
 */
When(/^(I |we )*choose "([^"]*)" from the save menu of the edit form$/, async function (pronounCase, item) {
  await waitForStoredChanges(this);
  await forgetNotifications(this);
  const button = this.page.locator('#action-buttons button.submit.menubtn');
  await Promise.all([
    this.page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {}),
    chooseFromFormMenu(this, button, 'save menu', item),
  ]);
  await settle(this);
});

/**
 * Choose an item of the actions menu of the edit form (the "…" button): "Delete
 * entry", "Validate entry", "Copy entry", ... A confirmation dialog is
 * accepted.
 *
 * Example #1: When I choose "Delete entry" from the actions menu of the edit form
 * Example #2: When I choose "Validate entry" from the actions menu of the edit form
 * Example #3: When we choose "Delete category" from the actions menu of the edit form
 * Example #4: When I choose "Delete draft" from the actions menu of the edit form
 * Example #5: And I choose "Delete entry" from the actions menu of the edit form
 */
When(/^(I |we )*choose "([^"]*)" from the actions menu of the edit form$/, async function (pronounCase, item) {
  const scope = await formScope(this);
  const button = (await inSlideout(this)) ? scope.locator('.so-toolbar .action-btn, header .action-btn') : this.page.locator('#action-buttons #action-btn, #action-buttons .action-btn');
  await forgetNotifications(this);
  const release = acceptNextDialog(this);
  const leaves = /^Delete/.test(item);
  try {
    await Promise.all([
      leaves ? this.page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 20000 }).catch(() => {}) : Promise.resolve(),
      chooseFromFormMenu(this, button, 'actions menu', item),
    ]);
  } finally {
    release();
  }
  await settle(this);
});

/**
 * Open a tab of the edit form by its label.
 *
 * Example #1: When I open the "Details" tab of the edit form
 * Example #2: When I open the "Content" tab of the edit form
 * Example #3: When we open the "Details" tab of the edit form
 * Example #4: And I open the "SEO" tab of the edit form
 * Example #5: And we open the "Content" tab of the edit form
 */
When(/^(I |we )*open the "([^"]*)" tab of the edit form$/, async function (pronounCase, name) {
  await openFormTab(this, name);
});

/**
 * Wait until the edit form stored the changes made so far. The form saves them
 * in the background a moment after each change, as a draft only the author
 * sees, and marks it with "Showing your unsaved changes".
 *
 * Example #1: When I wait for the edit form to store my changes
 * Example #2: When we wait for the edit form to store our changes
 * Example #3: And I wait for the edit form to store my changes
 * Example #4: And we wait for the edit form to store our changes
 * Example #5: Then I wait for the edit form to store my changes
 */
When(/^(I |we )*wait for the edit form to store (?:my|our) changes$/, async function (pronounCase) {
  await waitForStoredChanges(this);
});

/**
 * Assert that the edit form shows, or does not show, the notice of unsaved
 * changes: the changes it stored in the background and that are not yet part
 * of the saved element.
 *
 * Example #1: Then I should see the unsaved changes notice
 * Example #2: Then I should not see the unsaved changes notice
 * Example #3: Then we should see the unsaved changes notice
 * Example #4: And I should not see the unsaved changes notice
 * Example #5: And we should see the unsaved changes notice
 */
Then(/^(I |we )*should( not)* see the unsaved changes notice$/, async function (pronounCase, notCase) {
  if (!notCase) await waitForStoredChanges(this);
  await assertPresence(this.page.locator('#content-notice .draft-notice, .so-notice .draft-notice').filter({ hasText: /unsaved changes/i }), notCase, {
    label: 'the notice "Showing your unsaved changes."',
    hint: 'The notice shows above the fields (`#content-notice`) once the form stored a change of a saved element.',
    timeout: budget(this),
  });
});

/**
 * Discard the unsaved changes of the edit form with the "Discard" button of
 * their notice.
 *
 * Example #1: When I discard the unsaved changes
 * Example #2: When we discard the unsaved changes
 * Example #3: And I discard the unsaved changes
 * Example #4: And we discard the unsaved changes
 * Example #5: Then I discard the unsaved changes
 */
When(/^(I |we )*discard the unsaved changes$/, async function (pronounCase) {
  await waitForStoredChanges(this);
  const button = this.page.locator('#content-notice .discard-changes-btn, .so-notice .discard-changes-btn').first();
  if (!(await button.count())) {
    throw friendly({ message: 'The edit form has no unsaved changes to discard.', hint: 'The "Discard" button shows in the notice "Showing your unsaved changes."' });
  }
  const release = acceptNextDialog(this);
  try {
    await clickAndLoad(this, button);
  } finally {
    release();
  }
  await waitForEditForm(this);
});

/**
 * Create a draft of the saved entry with the "Create a draft" button: a
 * version to work on that visitors do not see until it is applied.
 *
 * Example #1: When I create a draft from the edit form
 * Example #2: When we create a draft from the edit form
 * Example #3: And I create a draft from the edit form
 * Example #4: And we create a draft from the edit form
 * Example #5: Then I create a draft from the edit form
 */
When(/^(I |we )*create a draft from the edit form$/, async function (pronounCase) {
  const button = this.page.locator('#action-buttons button, #action-buttons a').filter({ hasText: exactly('Create a draft') }).first();
  if (!(await button.count())) {
    throw friendly({ message: 'The edit form has no "Create a draft" button.', hint: 'The button shows on a saved entry of a section, for an account that may save entries. A draft or a new entry has none.' });
  }
  await waitForStoredChanges(this);
  await clickAndLoad(this, button);
  await waitForEditForm(this);
});

/**
 * Apply the draft the edit form shows with the "Apply draft" button: its
 * content becomes the current version of the entry.
 *
 * Example #1: When I apply the draft
 * Example #2: When we apply the draft
 * Example #3: And I apply the draft
 * Example #4: And we apply the draft
 * Example #5: Then I apply the draft
 */
When(/^(I |we )*apply the draft$/, async function (pronounCase) {
  const button = this.page.locator('#action-buttons [data-action="elements/apply-draft"], #action-buttons button').filter({ hasText: exactly('Apply draft') }).first();
  if (!(await button.count())) {
    throw friendly({ message: 'The edit form has no "Apply draft" button.', hint: 'The button shows on a draft of a saved entry (Create a draft first, or switch to the draft in the version menu).' });
  }
  await waitForStoredChanges(this);
  await clickAndLoad(this, button);
});

/**
 * Assert which version of the element the edit form shows: "Current", "Draft
 * 1", "Revision 2".
 *
 * Example #1: Then the edit form should show the "Draft 1" version
 * Example #2: Then the edit form should show the "Current" version
 * Example #3: Then the edit form should show the "Revision 1" version
 * Example #4: And the edit form should show the "Draft 2" version
 * Example #5: Then the edit form should show the "Current" version
 */
Then(/^the edit form should show the "([^"]*)" version$/, async function (name) {
  const label = this.page.locator('#context-menu-container > span, #context-btngroup .btn, #context-menu-container .btn').first();
  await eventually(this, async () => clean(await label.textContent().catch(() => '')), (found) => found === name, (found) => ({
    message: `Expected the edit form to show the "${name}" version, found "${found || '(no version menu)'}".`,
    hint: VERSION_HINT,
  }));
});

/**
 * Switch the edit form to another version of the element with the version
 * menu: "Current", a draft or a revision.
 *
 * Example #1: When I switch the edit form to the "Current" version
 * Example #2: When I switch the edit form to the "Draft 1" version
 * Example #3: When I switch the edit form to the "Revision 1" version
 * Example #4: When we switch the edit form to the "Current" version
 * Example #5: And I switch the edit form to the "Revision 2" version
 */
When(/^(I |we )*switch the edit form to the "([^"]*)" version$/, async function (pronounCase, name) {
  const button = this.page.locator('#context-menu-container button.menubtn, #context-btn');
  await forgetNotifications(this);
  await Promise.all([
    this.page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {}),
    chooseFromFormMenu(this, button, 'version menu', name),
  ]);
  await waitForEditForm(this);
});

/**
 * Assert that the version menu of the edit form lists, or does not list, a
 * version: "Current", a draft or a recent revision.
 *
 * Example #1: Then the version menu of the edit form should list "Revision 2"
 * Example #2: Then the version menu of the edit form should list "Draft 1"
 * Example #3: Then the version menu of the edit form should not list "Draft 1"
 * Example #4: And the version menu of the edit form should list "Current"
 * Example #5: Then the version menu of the edit form should not list "Revision 3"
 */
Then(/^the version menu of the edit form should( not)* list "([^"]*)"$/, async function (notCase, name) {
  await requireCp(this);
  const read = async () => (await this.page.locator('#context-menu .menu-item-label').evaluateAll((labels) => labels.map((label) => {
    const copy = label.cloneNode(true);
    copy.querySelectorAll('.menu-item-description').forEach((node) => node.remove());
    return copy.textContent.replace(/\s+/g, ' ').trim();
  })));
  const versions = await read();
  const listedThere = versions.includes(name);
  if (notCase && listedThere) {
    throw friendly({ message: `Expected the version menu not to list "${name}", but it does. It lists: ${listed(versions)}.`, hint: VERSION_HINT });
  }
  if (!notCase && !listedThere) {
    throw friendly({ message: `Expected the version menu to list "${name}". It lists: ${listed(versions)}.`, hint: VERSION_HINT });
  }
});

/**
 * Assert the status the edit form shows for the saved element in its details:
 * Live, Pending, Expired, Disabled, Draft, Enabled.
 *
 * Example #1: Then the edit form should show the status "Live"
 * Example #2: Then the edit form should show the status "Disabled"
 * Example #3: Then the edit form should show the status "Draft"
 * Example #4: And the edit form should show the status "Pending"
 * Example #5: Then the edit form should show the status "Enabled"
 */
Then(/^the edit form should show the status "([^"]*)"$/, async function (status) {
  const scope = await formScope(this);
  const read = async () => clean(await scope.locator('dl.meta.read-only .data').filter({ has: this.page.locator('dt', { hasText: exactly('Status') }) }).locator('dd').first().textContent().catch(() => ''));
  await eventually(this, read, (found) => found.toLowerCase() === status.toLowerCase(), (found) => ({
    message: `Expected the edit form to show the status "${status}", found "${found || '(no status)'}".`,
    hint: 'The status is in the details of the form (the "Status" line under the metadata). It changes when the element is saved.',
  }));
});

/**
 * Open an item of the index in a slide-out editor, by double-clicking it as a
 * person does.
 *
 * Example #1: When I open "Launch day" in a slide-out editor
 * Example #2: When I open "About" in a slide-out editor
 * Example #3: When we open "Harbour" in a slide-out editor
 * Example #4: And I open "Product" in a slide-out editor
 * Example #5: When I open "Note 001" in a slide-out editor
 */
When(/^(I |we )*open "([^"]*)" in a slide-out editor$/, async function (pronounCase, title) {
  const scope = await indexScope(this);
  await waitForIndex(this, scope);
  const item = await requireIndexItem(this, scope, title);
  const target = item.locator('th[data-titlecell], .card-heading, .element').first();
  await target.dblclick({ position: { x: 5, y: 5 } }).catch(() => item.dblclick());
  try {
    await this.page.locator('.slideout-container:visible .slideout .field').first().waitFor({ state: 'visible', timeout: budget(this) });
  } catch (err) {
    throw friendly({ message: `No slide-out editor opened for "${title}".`, cause: err, hint: 'A double-click on an index item opens its slide-out editor (`.slideout`) when the account may edit it.' });
  }
  await settle(this);
  await waitForEditors(this);
});

/**
 * Assert that a slide-out editor is, or is not, open.
 *
 * Example #1: Then I should see a slide-out editor
 * Example #2: Then I should not see a slide-out editor
 * Example #3: Then we should see a slide-out editor
 * Example #4: And I should not see a slide-out editor
 * Example #5: And we should not see a slide-out editor
 */
Then(/^(I |we )*should( not)* see a slide-out editor$/, async function (pronounCase, notCase) {
  await assertPresence(this.page.locator('.slideout-container .slideout'), notCase, {
    label: 'a slide-out editor',
    hint: 'A slide-out editor is `.slideout` inside `.slideout-container[role="dialog"]`.',
    timeout: budget(this),
  });
});

/**
 * Close the slide-out editor without saving, with its "Cancel" button.
 *
 * Example #1: When I close the slide-out editor
 * Example #2: When we close the slide-out editor
 * Example #3: And I close the slide-out editor
 * Example #4: And we close the slide-out editor
 * Example #5: Then I close the slide-out editor
 */
When(/^(I |we )*close the slide-out editor$/, async function (pronounCase) {
  const slideout = this.page.locator('.slideout-container:visible .slideout').last();
  if (!(await slideout.count())) {
    throw friendly({ message: 'No slide-out editor is open.', hint: 'Open one first (I open "..." in a slide-out editor).' });
  }
  const cancel = slideout.locator('.so-footer button').filter({ hasText: /^(Cancel|Close)$/ }).first();
  const release = acceptNextDialog(this);
  try {
    if (await cancel.count()) await cancel.click();
    else await this.page.keyboard.press('Escape');
    await slideout.waitFor({ state: 'hidden', timeout: budget(this) });
  } catch (err) {
    throw friendly({ message: 'The slide-out editor did not close.', cause: err, hint: 'The "Cancel" button is in the footer of the slide-out (`.so-footer`).' });
  } finally {
    release();
  }
});

/**
 * Open the preview of the edit form with its "Preview" button: the form on one
 * side, the page of the site on the other.
 *
 * Example #1: When I open the preview of the edit form
 * Example #2: When we open the preview of the edit form
 * Example #3: And I open the preview of the edit form
 * Example #4: And we open the preview of the edit form
 * Example #5: Then I open the preview of the edit form
 */
When(/^(I |we )*open the preview of the edit form$/, async function (pronounCase) {
  const button = this.page.locator('#action-buttons .preview-btn').first();
  if (!(await button.count())) {
    throw friendly({ message: 'The edit form has no "Preview" button.', hint: 'The button shows for elements with a page on the site (the section or the group has a URI format and a template).' });
  }
  await button.click();
  try {
    await this.page.locator('.lp-editor-container').first().waitFor({ state: 'visible', timeout: budget(this) });
    await this.page.waitForFunction(() => [...document.querySelectorAll('iframe')].some((frame) => /x-craft-(live-)?preview=/.test(frame.src)), null, { timeout: budget(this) });
  } catch (err) {
    throw friendly({ message: 'The preview did not open.', cause: err, hint: 'The preview shows the form in `.lp-editor-container` and the page in an iframe whose address carries `x-craft-live-preview`.' });
  }
  await settle(this);
  await waitForEditors(this);
});

/**
 * Assert that the page in the preview shows, or does not show, a text. The
 * preview reloads a moment after each change of the form.
 *
 * Example #1: Then the preview should show "Launch day"
 * Example #2: Then the preview should not show "An old title"
 * Example #3: Then the preview should show "A title typed a moment ago"
 * Example #4: And the preview should show "Featured"
 * Example #5: And the preview should not show "Page not found"
 */
Then(/^the preview should( not)* show "([^"]*)"$/, async function (notCase, text) {
  if (!previewFrame(this)) {
    throw friendly({ message: 'The preview is not open.', hint: 'Open it first (I open the preview of the edit form).' });
  }
  await waitForStoredChanges(this);
  const read = async () => {
    const frame = previewFrame(this);
    return frame ? clean(await frame.locator('body').innerText({ timeout: 2000 }).catch(() => '')) : '';
  };
  await eventually(this, read, (found) => found.includes(text) !== Boolean(notCase), (found) => ({
    message: notCase ? `Expected the preview not to show "${text}", but it does.` : `Expected the preview to show "${text}". It shows: "${found.slice(0, 300)}${found.length > 300 ? '…' : ''}".`,
    hint: 'The preview is the page of the site rendered with the stored changes of the form.',
  }));
});

/**
 * Close the preview and return to the edit form.
 *
 * Example #1: When I close the preview
 * Example #2: When we close the preview
 * Example #3: And I close the preview
 * Example #4: And we close the preview
 * Example #5: Then I close the preview
 */
When(/^(I |we )*close the preview$/, async function (pronounCase) {
  const button = this.page.locator('.lp-editor-container .lp-close-btn').first();
  if (!(await button.count()) || !(await button.isVisible())) {
    throw friendly({ message: 'The preview is not open.', hint: 'Open it first (I open the preview of the edit form).' });
  }
  await button.click();
  await this.page.locator('.lp-editor-container').first().waitFor({ state: 'hidden', timeout: budget(this) }).catch(() => {});
  await settle(this);
});

/**
 * Open the page of the element on the site, through the "View" link of the
 * edit form, in the same tab.
 *
 * Example #1: When I view the page of the edit form on the site
 * Example #2: When we view the page of the edit form on the site
 * Example #3: And I view the page of the edit form on the site
 * Example #4: And we view the page of the edit form on the site
 * Example #5: Then I view the page of the edit form on the site
 */
When(/^(I |we )*view the page of the edit form on the site$/, async function (pronounCase) {
  await waitForStoredChanges(this);
  const link = this.page.locator('#action-buttons a.view-btn').first();
  const href = (await link.count()) ? await link.getAttribute('href') : null;
  if (!href) {
    throw friendly({ message: 'The edit form has no "View" link.', hint: 'The link shows for elements with a page on the site (the section or the group has a URI format and a template).' });
  }
  await open(this, href);
});
