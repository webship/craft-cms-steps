'use strict';

// Assets: uploading a file to the assets index, the question the control panel
// asks when the volume already has a file of that name, and the thumbnail of
// an index item. The index itself (sources, views, selection, actions) is in
// craft-index.steps.js; assets fields are in craft-fields.steps.js.
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
  clean,
  listed,
  settle,
  eventually,
  forgetNotifications,
  indexScope,
  waitForIndex,
  indexCount,
  requireIndexItem,
} = require('./craft-helpers');

const CONFLICT_HINT = 'The control panel asks in a dialog (`.modal.prompt-modal`): "A file with the name “...” already exists." with the choices "Keep both" and "Replace it".';

/** The dialog that asks what to do with a file whose name the volume already has. */
function conflictPrompt(world) {
  return world.page.locator('.modal.prompt-modal:visible').last();
}

/** The question of that dialog, or an empty string when it is not open. */
async function conflictMessage(world) {
  return clean(await conflictPrompt(world).locator('.prompt-msg').first().innerText({ timeout: 300 }).catch(() => ''));
}

/**
 * Upload a file to the assets index with its "Upload files" button: the file
 * lands in the volume and the folder the index shows. When the volume already
 * has a file of that name the control panel asks what to do: answer with
 * `I answer the file conflict with "Keep both"`.
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
  // Two outcomes: the file shows in the index, or the volume already has a file of that name and asks what to do.
  const read = async () => ({ count: await indexCount(this, scope), conflict: await conflictMessage(this) });
  const found = await eventually(this, read, (state) => Boolean(state.conflict) || state.count.total > before.total, (state) => ({
    message: `The file "${file}" did not show in the assets index (it holds ${state.count.total} assets, as before).`,
    hint: 'The volume may not allow this kind of file, or the account may not save assets in it.',
  }));
  if (found.conflict) return;
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

/**
 * Assert that the control panel asks, or does not ask, what to do with an
 * uploaded file whose name the volume already has.
 *
 * Example #1: Then I should see the file conflict question
 * Example #2: Then I should not see the file conflict question
 * Example #3: Then we should see the file conflict question
 * Example #4: And I should see the file conflict question
 * Example #5: But I should not see the file conflict question
 */
Then(/^(I |we )*should( not)* see the file conflict question$/, async function (pronounCase, notCase) {
  const prompt = conflictPrompt(this);
  try {
    await prompt.waitFor({ state: notCase ? 'hidden' : 'visible', timeout: budget(this) });
  } catch (err) {
    throw friendly({ message: notCase ? `Expected no question about a file that already exists, but the control panel asks: ${await conflictMessage(this)}` : 'Expected the control panel to ask what to do with a file that already exists, but it did not.', hint: CONFLICT_HINT });
  }
});

/**
 * Answer the question about an uploaded file whose name the volume already
 * has: "Keep both" stores the upload under another name, "Replace it" puts it
 * in the place of the file that is there, "Cancel" drops the upload.
 *
 * Example #1: When I answer the file conflict with "Keep both"
 * Example #2: When I answer the file conflict with "Replace it"
 * Example #3: When I answer the file conflict with "Cancel"
 * Example #4: When we answer the file conflict with "Replace it"
 * Example #5: And I answer the file conflict with "Keep both"
 */
When(/^(I |we )*answer the file conflict with "([^"]*)"$/, async function (pronounCase, choice) {
  const prompt = conflictPrompt(this);
  try {
    await prompt.waitFor({ state: 'visible', timeout: budget(this) });
  } catch (err) {
    throw friendly({ message: 'The control panel asks no question about a file that already exists.', hint: 'Upload a file whose name the volume already has first. ' + CONFLICT_HINT });
  }
  if (choice === 'Cancel') {
    await prompt.locator('.buttons .btn:not(.submit)').first().click();
  } else {
    const options = prompt.locator('.options label');
    const option = options.filter({ hasText: new RegExp('^\\s*' + choice.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*$') }).first();
    if (!(await option.count())) {
      throw friendly({ message: `The question offers no answer "${choice}". It offers: ${listed([...(await options.allInnerTexts()), 'Cancel'])}.`, hint: CONFLICT_HINT });
    }
    await option.click();
    const ok = prompt.locator('button[type="submit"]').first();
    await this.page.waitForFunction((node) => !node.classList.contains('disabled'), await ok.elementHandle(), { timeout: budget(this) }).catch(() => {});
    await ok.click();
  }
  await prompt.waitFor({ state: 'hidden', timeout: budget(this) }).catch(() => {});
  const scope = await indexScope(this).catch(() => null);
  if (scope) {
    await settle(this, budget(this));
    await waitForIndex(this, scope);
  }
});
