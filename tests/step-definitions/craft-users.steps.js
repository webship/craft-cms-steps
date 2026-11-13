'use strict';

// Users and what they may do: the user groups and the permissions an account
// screen shows, and files uploaded to the assets index.
//
// The suite never creates or deletes accounts: these steps read what the site
// build set up. What an account may or may not open is asserted with the steps
// of craft-cp.steps.js (the navigation, the "Unauthorized" screen) and of
// craft-index.steps.js (the sources an account sees).
//
// Every assertion waits on its locator (the assertion is the wait), and every
// failure is a friendly error with a hint instead of a raw Playwright timeout
// stack.

const path = require('path');
const fs = require('fs');
const { When, Then } = require('@cucumber/cucumber');
const { friendly } = require('webship-js/tests/step-definitions/webship');
const {
  budget,
  exactly,
  clean,
  listed,
  settle,
  eventually,
  requireCp,
  forgetNotifications,
  indexScope,
  waitForIndex,
  indexCount,
  requireIndexItem,
} = require('./craft-helpers');

const PERMISSIONS_HINT = 'Open the "Permissions" screen of a user account first (Users, the account, then "Permissions" in the section navigation), or the screen of a user group. Permissions are grouped under headings such as "General" or "Section - Blog".';

/** The permission blocks of the screen, by heading. */
function permissionBlock(world, heading) {
  return world.page.locator('.user-permissions').filter({ has: world.page.locator('h3', { hasText: exactly(heading) }) }).first();
}

/**
 * Assert that the account screen shows, or does not show, a user group as
 * assigned to the account ("Permissions" screen of the account).
 *
 * Example #1: Then the account should be in the "Authors" user group
 * Example #2: Then the account should be in the "Editors" user group
 * Example #3: Then the account should not be in the "Editors" user group
 * Example #4: And the account should not be in the "Authors" user group
 * Example #5: And the account should be in the "Members" user group
 */
Then(/^the account should( not)* be in the "([^"]*)" user group$/, async function (notCase, name) {
  await requireCp(this);
  const field = this.page.locator('#user-groups').first();
  try {
    await field.waitFor({ state: 'attached', timeout: budget(this) });
  } catch (err) {
    throw friendly({ message: `This screen does not show the user groups of an account (${this.page.url()}).`, cause: err, hint: PERMISSIONS_HINT + ' User groups need an edition of the system that has them.' });
  }
  const groups = await field.locator('.chip[data-label]').evaluateAll((chips) => chips.map((chip) => chip.getAttribute('data-label')));
  if (groups.includes(name) === Boolean(notCase)) {
    throw friendly({ message: notCase ? `Expected the account not to be in the "${name}" user group, but it is.` : `Expected the account to be in the "${name}" user group. Its groups are: ${listed(groups)}.`, hint: 'The groups of an account are the chips of the "User Groups" field.' });
  }
});

/**
 * Assert that a permission is, or is not, granted on the permissions screen of
 * an account or a user group: the label of the permission and the heading it
 * sits under. A permission granted through a group counts as granted.
 *
 * Example #1: Then the permission "Save entries" under "Section - Blog" should be granted
 * Example #2: Then the permission "View entries" under "Section - Pages" should not be granted
 * Example #3: Then the permission "Access the control panel" under "General" should be granted
 * Example #4: And the permission "Delete users" under "Users" should not be granted
 * Example #5: And the permission "View assets" under "Volume - Images" should be granted
 */
Then(/^the permission "([^"]*)" under "([^"]*)" should( not)* be granted$/, async function (permission, heading, notCase) {
  await requireCp(this);
  await this.page.locator('.user-permissions').first().waitFor({ state: 'attached', timeout: budget(this) }).catch(() => {});
  const block = permissionBlock(this, heading);
  if (!(await block.count())) {
    const headings = (await this.page.locator('.user-permissions h3').allTextContents()).map(clean);
    throw friendly({ message: headings.length ? `The permissions screen has no heading "${heading}". Its headings are: ${listed(headings)}.` : `This screen shows no permissions (${this.page.url()}).`, hint: PERMISSIONS_HINT });
  }
  const labels = block.locator('label');
  const label = labels.filter({ hasText: exactly(permission) }).first();
  if (!(await label.count())) {
    throw friendly({ message: `There is no permission "${permission}" under "${heading}". Its permissions are: ${listed(await labels.allTextContents())}.`, hint: 'Use the label of the permission as the screen shows it.' });
  }
  const id = await label.getAttribute('for');
  const granted = await block.locator(`input[type="checkbox"][id="${id}"]`).first().isChecked();
  if (granted === Boolean(notCase)) {
    throw friendly({ message: notCase ? `Expected the permission "${permission}" under "${heading}" not to be granted, but it is.` : `Expected the permission "${permission}" under "${heading}" to be granted, but it is not.`, hint: 'A ticked checkbox is a granted permission; a ticked and disabled one comes from a user group of the account.' });
  }
});

/**
 * Upload a file to the assets index with its "Upload files" button: the file
 * lands in the volume and the folder the index shows.
 *
 * Example #1: When I upload the file "tests/fixtures/pixel.png" to the assets index
 * Example #2: When we upload the file "tests/fixtures/pixel.png" to the assets index
 * Example #3: And I upload the file "tests/fixtures/photo.jpg" to the assets index
 * Example #4: When I upload the file "tests/fixtures/report.pdf" to the assets index
 * Example #5: And we upload the file "tests/fixtures/logo.png" to the assets index
 */
When(/^(I |we )*upload the file "([^"]*)" to the assets index$/, async function (pronounCase, file) {
  const resolved = path.resolve(process.cwd(), file);
  if (!fs.existsSync(resolved)) {
    throw friendly({ message: `The file "${file}" does not exist (${resolved}).`, hint: 'Give the path from the folder cucumber-js runs in, for example "tests/fixtures/pixel.png".' });
  }
  const scope = await indexScope(this);
  await waitForIndex(this, scope);
  const input = this.page.locator('#action-buttons input[type="file"], input[name="assets-upload"]').first();
  if (!(await input.count())) {
    throw friendly({ message: 'This screen has no "Upload files" button.', hint: 'Open the assets index on a volume the account may save assets in.' });
  }
  const before = await indexCount(this, scope);
  await forgetNotifications(this);
  await input.setInputFiles(resolved);
  await eventually(this, () => indexCount(this, scope), (found) => found.total > before.total, (found) => ({
    message: `The file "${file}" did not show in the assets index (it holds ${found.total} assets, as before).`,
    hint: 'The volume may not allow this kind of file, or the account may not save assets in it.',
  }));
  await waitForIndex(this, scope);
  await settle(this);
});

/**
 * Assert that an item of the index shows a thumbnail that loaded: for an
 * image asset, the transform of the image the system generated.
 *
 * Example #1: Then "Harbour" should show a thumbnail in the index
 * Example #2: Then "Meadow" should show a thumbnail in the index
 * Example #3: Then "Pixel" should show a thumbnail in the index
 * Example #4: And "Harbour" should show a thumbnail in the index
 * Example #5: And "Meadow" should show a thumbnail in the index
 */
Then(/^"([^"]*)" should show a thumbnail in the index$/, async function (title) {
  const scope = await indexScope(this);
  await waitForIndex(this, scope);
  const item = await requireIndexItem(this, scope, title);
  await item.scrollIntoViewIfNeeded().catch(() => {});
  const read = async () => item.locator('.thumb img, .elementthumb img').first().evaluate((image) => ({ src: image.currentSrc || image.src || '', loaded: image.complete && image.naturalWidth > 0 })).catch(() => null);
  await eventually(this, read, (found) => Boolean(found) && found.loaded, (found) => ({
    message: found ? `The thumbnail of "${title}" did not load (${found.src || 'no address'}).` : `"${title}" shows no thumbnail in the index.`,
    hint: 'Thumbnails are generated image transforms: check that the filesystem of the volume has public URLs and that the image library of the server works.',
  }));
});
