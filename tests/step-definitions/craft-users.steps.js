'use strict';

// Users and what they may do: the user groups and the permissions an account
// screen shows, and whether a permission comes from a user group.
//
// The suite never creates or deletes accounts: these steps read what the site
// build set up. What an account may or may not open is asserted with the steps
// of craft-cp.steps.js (the navigation, the "Unauthorized" screen) and of
// craft-index.steps.js (the sources an account sees).
//
// Every assertion waits on its locator (the assertion is the wait), and every
// failure is a friendly error with a hint instead of a raw Playwright timeout
// stack.

const { Then } = require('@cucumber/cucumber');
const { friendly } = require('webship-js/tests/step-definitions/webship');
const {
  budget,
  exactly,
  clean,
  listed,
  requireCp,
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
 * The checkbox of a permission and what the screen offers instead, for the
 * error messages.
 */
async function permissionBox(world, permission, heading) {
  await requireCp(world);
  await world.page.locator('.user-permissions').first().waitFor({ state: 'attached', timeout: budget(world) }).catch(() => {});
  const block = permissionBlock(world, heading);
  if (!(await block.count())) {
    const headings = (await world.page.locator('.user-permissions h3').allTextContents()).map(clean);
    throw friendly({ message: headings.length ? `The permissions screen has no heading "${heading}". Its headings are: ${listed(headings)}.` : `This screen shows no permissions (${world.page.url()}).`, hint: PERMISSIONS_HINT });
  }
  const labels = block.locator('label');
  const label = labels.filter({ hasText: exactly(permission) }).first();
  if (!(await label.count())) {
    throw friendly({ message: `There is no permission "${permission}" under "${heading}". Its permissions are: ${listed(await labels.allTextContents())}.`, hint: 'Use the label of the permission as the screen shows it.' });
  }
  return { label, box: block.locator(`input[type="checkbox"][id="${await label.getAttribute('for')}"]`).first() };
}

/**
 * Assert that a permission an account has is, or is not, one it gets from a
 * user group: the screen shows such a permission ticked and locked.
 *
 * Example #1: Then the permission "View entries" under "Section - Blog" should come from a user group
 * Example #2: Then the permission "Access the control panel" under "General" should come from a user group
 * Example #3: Then the permission "View assets" under "Volume - Images" should come from a user group
 * Example #4: And the permission "Save entries" under "Section - Blog" should come from a user group
 * Example #5: Then the permission "View users" under "Users" should not come from a user group
 */
Then(/^the permission "([^"]*)" under "([^"]*)" should( not)* come from a user group$/, async function (permission, heading, notCase) {
  const { box } = await permissionBox(this, permission, heading);
  const fromGroup = (await box.isChecked()) && /\bgroup-permission\b/.test((await box.getAttribute('class')) || '');
  if (fromGroup === Boolean(notCase)) {
    throw friendly({
      message: notCase ? `Expected the permission "${permission}" under "${heading}" not to come from a user group, but it does.` : `Expected the permission "${permission}" under "${heading}" to come from a user group, but it ${(await box.isChecked()) ? 'is granted to the account itself' : 'is not granted'}.`,
      hint: 'A permission of a user group shows ticked and locked on the permissions screen of an account (`input.group-permission`).',
    });
  }
});
