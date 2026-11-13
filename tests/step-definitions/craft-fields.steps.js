'use strict';

// The fields of an edit form, by their label: plain text, rich text, the
// lightswitch, the dropdown, the date, relation fields (assets, entries,
// categories) with their selection modal, tags, the nested blocks of a matrix
// field, and what the form says when a value is not valid (the error of a
// field, the error summary, the required marker, the characters left).
//
// The steps act on the form in front: the slide-out editor when one is open,
// the editor of the preview when it is open, else the page. That is why the
// pack has its own "fill in the ... field" step next to the webship-js one: the
// same label can be on the page and in the slide-out at once.
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
  quoted,
  clean,
  listed,
  settle,
  eventually,
  chooseFromOpenMenu,
  chooseFromMenu,
  waitForIndex,
  reloadingIndex,
  indexItem,
  indexTitles,
  formScope,
  requireField,
} = require('./craft-helpers');

/** The text input or textarea of a field. */
async function textControl(field, label) {
  const control = field.locator(':scope > .input input[type="text"], :scope > .input input[type="email"], :scope > .input input[type="url"], :scope > .input input[type="number"], :scope > .input input[type="password"], :scope > .input input:not([type]), :scope > .input textarea:not(.hidden)').first();
  if (!(await control.count())) {
    throw friendly({ message: `The "${label}" field is not a text field.`, hint: 'Use the step of its type: the rich text field, the switch, the dropdown, the date, a relation field.' });
  }
  return control;
}

/** The lightswitch of a field. */
async function lightswitch(field, label) {
  const control = field.locator('button.lightswitch[role="switch"], .lightswitch[role="switch"]').first();
  if (!(await control.count())) {
    throw friendly({ message: `The "${label}" field is not a switch.`, hint: 'A lightswitch is a `button.lightswitch[role="switch"]`.' });
  }
  return control;
}

/** The relation widget of a field (assets, entries, categories, users, tags). */
async function relation(field, label) {
  const control = field.locator('.elementselect').first();
  if (!(await control.count())) {
    throw friendly({ message: `The "${label}" field is not a relation field.`, hint: 'Assets, Entries, Categories, Users and Tags fields are relation fields (`.elementselect`).' });
  }
  return control;
}

/** The labels of the elements a relation field holds. */
async function relationLabels(control) {
  return control.locator('.elements .element[data-label]').evaluateAll((items) => items.map((item) => item.getAttribute('data-label')));
}

/** The matrix widget of a field. */
async function matrix(field, label) {
  const control = field.locator('.matrix-field, .matrix').first();
  if (!(await control.count())) {
    throw friendly({ message: `The "${label}" field is not a matrix field.`, hint: 'A matrix field in the blocks view is `.matrix-field` with one `.matrixblock` per nested entry.' });
  }
  return control;
}

/** The blocks of a matrix field. */
function blocks(control) {
  return control.locator(':scope > .blocks > .matrixblock');
}

/** Block number n (from 1) of a matrix field, or a friendly error. */
async function requireBlock(world, control, label, number) {
  const all = blocks(control);
  const count = await all.count();
  if (number < 1 || number > count) {
    throw friendly({ message: `The "${label}" field has no block ${number}: it has ${count} block${count === 1 ? '' : 's'}.`, hint: 'Blocks are counted from 1, top to bottom.' });
  }
  return all.nth(number - 1);
}

/** Resolve a file of the project (relative to the folder cucumber-js runs in). */
function projectFile(file) {
  const resolved = path.resolve(process.cwd(), file);
  if (!fs.existsSync(resolved)) {
    throw friendly({ message: `The file "${file}" does not exist (${resolved}).`, hint: 'Give the path from the folder cucumber-js runs in, for example "tests/fixtures/pixel.png".' });
  }
  return resolved;
}

/**
 * Fill in a text field of the form in front (the slide-out editor when one is
 * open, else the page) by its label: plain text, a title, a slug, a number.
 *
 * Example #1: When I fill in the "Summary" field with "A short summary."
 * Example #2: When I fill in the "Title" field with "A new article"
 * Example #3: When we fill in the "Slug" field with "a-new-article"
 * Example #4: And I fill in the "Subtitle" field with "Who we are"
 * Example #5: When I fill in the "Summary" field with ""
 */
When(/^(I |we )*fill in the "([^"]*)" field with "([^"]*)"$/, async function (pronounCase, label, value) {
  const field = await requireField(this, label);
  const control = await textControl(field, label);
  await control.fill(value);
  await control.dispatchEvent('change').catch(() => {});
});

/**
 * Assert the value of a text field of the form in front, by its label.
 *
 * Example #1: Then the "Summary" field should have the value "A short summary."
 * Example #2: Then the "Title" field should have the value "Launch day"
 * Example #3: Then the "Slug" field should have the value "launch-day"
 * Example #4: And the "Subtitle" field should have the value "Who we are"
 * Example #5: Then the "Summary" field should have the value ""
 */
Then(/^the "([^"]*)" field should have the value "([^"]*)"$/, async function (label, value) {
  const field = await requireField(this, label);
  const control = await textControl(field, label);
  await eventually(this, () => control.inputValue(), (found) => found === value, (found) => ({
    message: `Expected the "${label}" field to have the value "${value}", found "${found}".`,
    hint: 'The whole value of the field is compared.',
  }));
});

/**
 * Replace the content of a rich text field (CKEditor) by typing a text into
 * it, by the label of the field.
 *
 * Example #1: When I fill in the rich text field "Body" with "The full story."
 * Example #2: When we fill in the rich text field "Body" with "A second version."
 * Example #3: And I fill in the rich text field "Body" with "Written in a slide-out."
 * Example #4: When I fill in the rich text field "Introduction" with "Welcome."
 * Example #5: And we fill in the rich text field "Body" with "Short."
 */
When(/^(I |we )*fill in the rich text field "([^"]*)" with "([^"]*)"$/, async function (pronounCase, label, text) {
  const field = await requireField(this, label);
  const editable = field.locator('.ck-editor__editable[role="textbox"]').first();
  try {
    await editable.waitFor({ state: 'visible', timeout: budget(this) });
  } catch (err) {
    throw friendly({ message: `The "${label}" field has no rich text editor.`, cause: err, hint: 'A rich text field renders a CKEditor (`.ck-editor__editable[role="textbox"]`); the plugin has to be installed.' });
  }
  await editable.click();
  await this.page.keyboard.press('ControlOrMeta+A');
  await this.page.keyboard.press('Delete');
  await this.page.keyboard.type(text);
});

/**
 * Assert that the rich text field with a label contains, or does not contain,
 * a text.
 *
 * Example #1: Then the rich text field "Body" should contain "The full story."
 * Example #2: Then the rich text field "Body" should not contain "An old sentence"
 * Example #3: Then the rich text field "Body" should contain "Launch day"
 * Example #4: And the rich text field "Introduction" should contain "Welcome."
 * Example #5: And the rich text field "Body" should not contain "Lorem ipsum"
 */
Then(/^the rich text field "([^"]*)" should( not)* contain "([^"]*)"$/, async function (label, notCase, text) {
  const field = await requireField(this, label);
  const editable = field.locator('.ck-editor__editable[role="textbox"]').first();
  if (!(await editable.count())) {
    throw friendly({ message: `The "${label}" field has no rich text editor.`, hint: 'A rich text field renders a CKEditor (`.ck-editor__editable[role="textbox"]`).' });
  }
  await eventually(this, async () => clean(await editable.innerText()), (found) => found.includes(text) !== Boolean(notCase), (found) => ({
    message: notCase ? `Expected the rich text field "${label}" not to contain "${text}", but it does.` : `Expected the rich text field "${label}" to contain "${text}", found "${found.slice(0, 300)}".`,
    hint: 'The text of the editor is compared, without its markup.',
  }));
});

/**
 * Switch a lightswitch of the form on or off, by its label ("Featured",
 * "Enabled").
 *
 * Example #1: When I switch the "Featured" switch on
 * Example #2: When I switch the "Featured" switch off
 * Example #3: When I switch the "Enabled" switch off
 * Example #4: When we switch the "Enabled" switch on
 * Example #5: And I switch the "Featured" switch on
 */
When(/^(I |we )*switch the "([^"]*)" switch (on|off)$/, async function (pronounCase, label, state) {
  const field = await requireField(this, label);
  const control = await lightswitch(field, label);
  const wanted = state === 'on' ? 'true' : 'false';
  if ((await control.getAttribute('aria-checked')) !== wanted) {
    await control.click();
  }
  await eventually(this, () => control.getAttribute('aria-checked'), (found) => found === wanted, () => ({
    message: `The "${label}" switch did not turn ${state}.`,
    hint: 'The switch may be read-only for this account.',
  }));
});

/**
 * Assert that a lightswitch of the form is on or off, by its label.
 *
 * Example #1: Then the "Featured" switch should be on
 * Example #2: Then the "Featured" switch should be off
 * Example #3: Then the "Enabled" switch should be on
 * Example #4: And the "Enabled" switch should be off
 * Example #5: And the "Featured" switch should be on
 */
Then(/^the "([^"]*)" switch should be (on|off)$/, async function (label, state) {
  const field = await requireField(this, label);
  const control = await lightswitch(field, label);
  const wanted = state === 'on' ? 'true' : 'false';
  await eventually(this, () => control.getAttribute('aria-checked'), (found) => found === wanted, (found) => ({
    message: `Expected the "${label}" switch to be ${state}, but it is ${found === 'true' ? 'on' : 'off'}.`,
    hint: 'The state is the `aria-checked` of the switch.',
  }));
});

/**
 * Choose an option of a dropdown field by its label. The dropdown fields of
 * entries are searchable lists; the plain selects of the settings work too.
 *
 * Example #1: When I choose "Guide" in the "Kind" dropdown
 * Example #2: When I choose "Opinion" in the "Kind" dropdown
 * Example #3: When we choose "News" in the "Kind" dropdown
 * Example #4: And I choose "Guide" in the "Kind" dropdown
 * Example #5: When I choose "Channel" in the "Section Type" dropdown
 */
When(/^(I |we )*choose "([^"]*)" in the "([^"]*)" dropdown$/, async function (pronounCase, option, label) {
  const field = await requireField(this, label);
  const selectize = field.locator('.selectize-control').first();
  if (await selectize.count()) {
    await selectize.locator('.selectize-input').click();
    const options = this.page.locator('.selectize-dropdown:visible .option');
    const target = options.filter({ hasText: exactly(option) }).first();
    try {
      await target.waitFor({ state: 'visible', timeout: 5000 });
    } catch (err) {
      const available = await options.allInnerTexts();
      await this.page.keyboard.press('Escape').catch(() => {});
      throw friendly({ message: `The "${label}" dropdown has no option "${option}". It offers: ${listed(available)}.`, hint: 'Use the label of an option as the dropdown shows it.' });
    }
    await target.click();
    return;
  }
  const select = field.locator('select').first();
  if (!(await select.count())) {
    throw friendly({ message: `The "${label}" field is not a dropdown.`, hint: 'A dropdown field is a `.selectize` list or a `select`.' });
  }
  const available = (await select.locator('option').allTextContents()).map(clean);
  if (!available.includes(option)) {
    throw friendly({ message: `The "${label}" dropdown has no option "${option}". It offers: ${listed(available)}.`, hint: 'Use the label of an option as the dropdown shows it.' });
  }
  await select.selectOption({ label: option });
});

/**
 * Assert the option a dropdown field shows as chosen, by its label.
 *
 * Example #1: Then the "Kind" dropdown should show "Guide"
 * Example #2: Then the "Kind" dropdown should show "News"
 * Example #3: Then the "Kind" dropdown should show "Opinion"
 * Example #4: And the "Kind" dropdown should show "Guide"
 * Example #5: Then the "Section Type" dropdown should show "Channel"
 */
Then(/^the "([^"]*)" dropdown should show "([^"]*)"$/, async function (label, option) {
  const field = await requireField(this, label);
  const read = async () => {
    const item = field.locator('.selectize-input .item').first();
    if (await item.count()) return clean(await item.innerText());
    const select = field.locator('select').first();
    if (await select.count()) return clean(await select.locator('option:checked').first().textContent().catch(() => ''));
    return '';
  };
  await eventually(this, read, (found) => found === option, (found) => ({
    message: `Expected the "${label}" dropdown to show "${option}", found "${found || '(nothing chosen)'}".`,
    hint: 'The label of the chosen option is compared.',
  }));
});

/**
 * Set the date of a date field by its label, typed the way the control panel
 * shows dates for the language of the account (1/31/2026 in US English).
 *
 * Example #1: When I set the "Event date" date to "3/15/2026"
 * Example #2: When I set the "Post Date" date to "1/31/2026"
 * Example #3: When we set the "Expiry Date" date to "12/31/2030"
 * Example #4: And I set the "Event date" date to "7/4/2027"
 * Example #5: When I set the "Event date" date to ""
 */
When(/^(I |we )*set the "([^"]*)" date to "([^"]*)"$/, async function (pronounCase, label, value) {
  const field = await requireField(this, label);
  const input = field.locator('.datewrapper input[type="text"]').first();
  if (!(await input.count())) {
    throw friendly({ message: `The "${label}" field is not a date field.`, hint: 'A date field holds its date in `.datewrapper input`.' });
  }
  await input.fill(value);
  await input.dispatchEvent('change').catch(() => {});
  // The date picker opens with the field; close it so it does not cover the next field.
  await input.press('Escape').catch(() => {});
  await input.evaluate((node) => node.blur()).catch(() => {});
});

/**
 * Assert the date a date field holds, by its label, as the control panel
 * shows it.
 *
 * Example #1: Then the "Event date" date should be "3/15/2026"
 * Example #2: Then the "Post Date" date should be "1/31/2026"
 * Example #3: Then the "Expiry Date" date should be ""
 * Example #4: And the "Event date" date should be "7/4/2027"
 * Example #5: Then the "Event date" date should be ""
 */
Then(/^the "([^"]*)" date should be "([^"]*)"$/, async function (label, value) {
  const field = await requireField(this, label);
  const input = field.locator('.datewrapper input[type="text"]').first();
  if (!(await input.count())) {
    throw friendly({ message: `The "${label}" field is not a date field.`, hint: 'A date field holds its date in `.datewrapper input`.' });
  }
  await eventually(this, () => input.inputValue(), (found) => found === value, (found) => ({
    message: `Expected the "${label}" date to be "${value}", found "${found}".`,
    hint: 'Dates read the way the control panel formats them for the language of the account.',
  }));
});

/**
 * Add an element to a relation field (assets, entries, categories, users)
 * through its selection modal: open it, select the item by its title and
 * confirm.
 *
 * Example #1: When I add "Harbour" to the "Hero image" field
 * Example #2: When I add "About" to the "Related pages" field
 * Example #3: When I add "Engineering" to the "Topics" field
 * Example #4: When we add "Contact" to the "Related pages" field
 * Example #5: And I add "Meadow" to the "Hero image" field
 */
When(/^(I |we )*add "([^"]*)" to the "([^"]*)" field$/, async function (pronounCase, title, label) {
  const field = await requireField(this, label);
  const control = await relation(field, label);
  const add = control.locator('button.add, .btn.add').first();
  if (!(await add.count()) || !(await add.isVisible())) {
    throw friendly({ message: `The "${label}" field takes no more elements. It holds: ${listed(await relationLabels(control))}.`, hint: 'The field reached its limit: remove an element first (I remove "..." from the "..." field).' });
  }
  await add.click();
  const modal = this.page.locator('.modal.elementselectormodal:visible').last();
  try {
    await modal.waitFor({ state: 'visible', timeout: budget(this) });
  } catch (err) {
    throw friendly({ message: `The selection modal of the "${label}" field did not open.`, cause: err, hint: 'The modal is `.modal.elementselectormodal`.' });
  }
  await waitForIndex(this, modal);
  let item = indexItem(modal, title).first();
  if (!(await item.count())) {
    // The item is further down the list: search for it.
    const input = modal.locator('.search-container input[type="text"]').first();
    if (await input.count()) {
      await reloadingIndex(this, modal, async () => {
        await input.fill(title);
        await input.press('Enter');
      });
    }
    item = indexItem(modal, title).first();
  }
  if (!(await item.count())) {
    const titles = await indexTitles(modal).catch(() => []);
    await modal.locator('.footer .buttons.right .btn:not(.submit)').first().click().catch(() => {});
    throw friendly({ message: `The selection modal of the "${label}" field does not offer "${title}". It offers: ${listed(titles.slice(0, 30))}.`, hint: 'The field decides which sources it offers; an element it already holds is not offered again.' });
  }
  if (/\bdisabled\b/.test((await item.getAttribute('class')) || '')) {
    await modal.locator('.footer .buttons.right .btn:not(.submit)').first().click().catch(() => {});
    throw friendly({ message: `"${title}" cannot be selected for the "${label}" field: the field already holds it.`, hint: 'Remove it first, or choose another element.' });
  }
  await item.click();
  const select = modal.locator('.footer .buttons.right button[type="submit"], .footer .buttons.right .btn.submit').first();
  await this.page.waitForFunction((node) => !node.classList.contains('disabled'), await select.elementHandle(), { timeout: budget(this) }).catch(() => {});
  await select.click();
  await modal.waitFor({ state: 'hidden', timeout: budget(this) }).catch(() => {});
  await eventually(this, () => relationLabels(control), (labels) => labels.includes(title), (labels) => ({
    message: `"${title}" was not added to the "${label}" field. It holds: ${listed(labels)}.`,
    hint: 'The selected element shows as a chip in the field.',
  }));
});

/**
 * Remove an element from a relation field (assets, entries, categories, tags)
 * through the menu of its chip.
 *
 * Example #1: When I remove "Harbour" from the "Hero image" field
 * Example #2: When I remove "About" from the "Related pages" field
 * Example #3: When I remove "release" from the "Keywords" field
 * Example #4: When we remove "Product" from the "Topics" field
 * Example #5: And I remove "Meadow" from the "Hero image" field
 */
When(/^(I |we )*remove "([^"]*)" from the "([^"]*)" field$/, async function (pronounCase, title, label) {
  const field = await requireField(this, label);
  const control = await relation(field, label);
  const chip = control.locator(`.elements .element[data-label=${quoted(title)}]`).first();
  if (!(await chip.count())) {
    throw friendly({ message: `The "${label}" field does not hold "${title}". It holds: ${listed(await relationLabels(control))}.`, hint: 'Use the title the chip of the element shows.' });
  }
  const direct = chip.locator('button.delete, button[title="Remove"], .delete.icon').first();
  if (await direct.count()) {
    await direct.click();
  } else {
    await chip.hover();
    await chooseFromMenu(this, chip.locator('.chip-actions button.action-btn, .card-actions button.action-btn, button.action-btn'), 'Remove', `menu of "${title}"`);
  }
  await eventually(this, () => relationLabels(control), (labels) => !labels.includes(title), () => ({
    message: `"${title}" is still in the "${label}" field.`,
    hint: 'The chip of a removed element leaves the field.',
  }));
});

/**
 * Assert that a relation field (assets, entries, categories, tags) holds, or
 * does not hold, an element, by its title.
 *
 * Example #1: Then the "Hero image" field should hold "Harbour"
 * Example #2: Then the "Related pages" field should hold "About"
 * Example #3: Then the "Keywords" field should hold "release"
 * Example #4: Then the "Topics" field should not hold "Community"
 * Example #5: And the "Hero image" field should not hold "Meadow"
 */
Then(/^the "([^"]*)" field should( not)* hold "([^"]*)"$/, async function (label, notCase, title) {
  const field = await requireField(this, label);
  const control = await relation(field, label);
  await eventually(this, () => relationLabels(control), (labels) => labels.includes(title) !== Boolean(notCase), (labels) => ({
    message: notCase ? `Expected the "${label}" field not to hold "${title}", but it does.` : `Expected the "${label}" field to hold "${title}". It holds: ${listed(labels)}.`,
    hint: 'The elements of a relation field are its chips.',
  }));
});

/**
 * Upload a file straight into an assets field, by the label of the field: the
 * file lands in the upload location of the field and is selected.
 *
 * Example #1: When I upload the file "tests/fixtures/pixel.png" to the "Hero image" field
 * Example #2: When we upload the file "tests/fixtures/pixel.png" to the "Hero image" field
 * Example #3: And I upload the file "tests/fixtures/photo.jpg" to the "Gallery" field
 * Example #4: When I upload the file "tests/fixtures/logo.png" to the "Logo" field
 * Example #5: And we upload the file "tests/fixtures/pixel.png" to the "Photo" field
 */
When(/^(I |we )*upload the file "([^"]*)" to the "([^"]*)" field$/, async function (pronounCase, file, label) {
  const resolved = projectFile(file);
  const field = await requireField(this, label);
  const control = await relation(field, label);
  const input = control.locator('input[type="file"]').first();
  if (!(await input.count())) {
    throw friendly({ message: `The "${label}" field takes no uploads.`, hint: 'An assets field shows "Upload a file" when the account may save assets in its upload location.' });
  }
  const before = (await relationLabels(control)).length;
  await input.setInputFiles(resolved);
  await eventually(this, () => relationLabels(control), (labels) => labels.length > before, (labels) => ({
    message: `The file "${file}" was not added to the "${label}" field. It holds: ${listed(labels)}.`,
    hint: 'The field may be full, or it may not allow this kind of file.',
  }));
  await settle(this);
});

/**
 * Add a tag to a tags field by typing it: an existing tag is picked, a new one
 * is created.
 *
 * Example #1: When I add the tag "howto" to the "Keywords" field
 * Example #2: When I add the tag "release" to the "Keywords" field
 * Example #3: When we add the tag "events" to the "Keywords" field
 * Example #4: And I add the tag "howto" to the "Keywords" field
 * Example #5: And we add the tag "release" to the "Keywords" field
 */
When(/^(I |we )*add the tag "([^"]*)" to the "([^"]*)" field$/, async function (pronounCase, tag, label) {
  const field = await requireField(this, label);
  const control = field.locator('.tagselect').first();
  if (!(await control.count())) {
    throw friendly({ message: `The "${label}" field is not a tags field.`, hint: 'A tags field is `.elementselect.tagselect` with a text input to add tags.' });
  }
  const input = control.locator('input[type="text"]').first();
  await input.click();
  await input.pressSequentially(tag, { delay: 20 });
  // The field looks the tag up and offers it (or offers to create it) in a menu.
  const option = this.page.locator('.tagselect-menu:visible li, .menu.tagmenu:visible li, .menu:visible li').filter({ hasText: exactly(tag) }).first();
  await option.waitFor({ state: 'visible', timeout: budget(this) }).catch(() => {});
  if (await option.count()) await option.click();
  else await input.press('Enter');
  await eventually(this, () => relationLabels(control), (labels) => labels.includes(tag), (labels) => ({
    message: `The tag "${tag}" was not added to the "${label}" field. It holds: ${listed(labels)}.`,
    hint: 'The field offers the tag in a menu under its input; a tag it already holds is not offered again.',
  }));
});

/**
 * Add a block of a type to a matrix field, by the label of the field and the
 * name of the nested entry type.
 *
 * Example #1: When I add a "Text block" block to the "Blocks" field
 * Example #2: When I add a "Quote" block to the "Blocks" field
 * Example #3: When we add a "Text block" block to the "Blocks" field
 * Example #4: And I add a "Quote" block to the "Blocks" field
 * Example #5: And we add a "Quote" block to the "Blocks" field
 */
When(/^(I |we )*add a "([^"]*)" block to the "([^"]*)" field$/, async function (pronounCase, type, label) {
  const field = await requireField(this, label);
  const control = await matrix(field, label);
  const before = await blocks(control).count();
  const button = control.locator(':scope > .buttons button.add, :scope > .buttons .btn.add').first();
  if (!(await button.count()) || !(await button.isVisible())) {
    throw friendly({ message: `The "${label}" field takes no more blocks (it has ${before}).`, hint: 'The field reached its maximum number of entries.' });
  }
  const direct = control.locator(':scope > .buttons .btn').filter({ hasText: exactly(type) }).first();
  if (await direct.count()) {
    await direct.click();
  } else {
    if (/\bmenubtn\b/.test((await button.getAttribute('class')) || '')) {
      await chooseFromMenu(this, button, type, `menu of block types of the "${label}" field`);
    } else {
      await button.click();
    }
  }
  await eventually(this, () => blocks(control).count(), (count) => count === before + 1, (count) => ({
    message: `No "${type}" block was added to the "${label}" field (it has ${count} block${count === 1 ? '' : 's'}).`,
    hint: 'A new block shows at the end of the field once the form created its nested entry.',
  }));
  const added = blocks(control).nth(before);
  const name = await added.getAttribute('data-type-name');
  if (name && name !== type) {
    throw friendly({ message: `The "${label}" field added a "${name}" block, not a "${type}" block.`, hint: 'The field has one type of block only: use its name.' });
  }
  await added.locator('.fields .field').first().waitFor({ state: 'visible', timeout: budget(this) }).catch(() => {});
  await settle(this);
});

/**
 * Fill in a text field inside a block of a matrix field: the label of the
 * nested field, the number of the block (from 1, top to bottom) and the label
 * of the matrix field.
 *
 * Example #1: When I fill in "Text" with "A first paragraph." in block 1 of the "Blocks" field
 * Example #2: When I fill in "Heading" with "What is new" in block 1 of the "Blocks" field
 * Example #3: When we fill in "Text" with "A quote." in block 2 of the "Blocks" field
 * Example #4: And I fill in "Text" with "Another paragraph." in block 3 of the "Blocks" field
 * Example #5: And we fill in "Heading" with "" in block 1 of the "Blocks" field
 */
When(/^(I |we )*fill in "([^"]*)" with "([^"]*)" in block (\d+) of the "([^"]*)" field$/, async function (pronounCase, nested, value, number, label) {
  const field = await requireField(this, label);
  const control = await matrix(field, label);
  const block = await requireBlock(this, control, label, Number(number));
  const nestedField = await requireField(this, nested, block);
  const input = await textControl(nestedField, nested);
  await input.fill(value);
  await input.dispatchEvent('change').catch(() => {});
});

/**
 * Delete a block of a matrix field through the menu of the block, by its
 * number (from 1, top to bottom).
 *
 * Example #1: When I delete block 2 of the "Blocks" field
 * Example #2: When I delete block 1 of the "Blocks" field
 * Example #3: When we delete block 3 of the "Blocks" field
 * Example #4: And I delete block 1 of the "Blocks" field
 * Example #5: And we delete block 2 of the "Blocks" field
 */
When(/^(I |we )*delete block (\d+) of the "([^"]*)" field$/, async function (pronounCase, number, label) {
  const field = await requireField(this, label);
  const control = await matrix(field, label);
  const before = await blocks(control).count();
  const block = await requireBlock(this, control, label, Number(number));
  await chooseFromMenu(this, block.locator(':scope > .actions button.action-btn, :scope > .actions .menubtn'), 'Delete', `menu of block ${number}`);
  await eventually(this, () => blocks(control).count(), (count) => count === before - 1, (count) => ({
    message: `Block ${number} of the "${label}" field was not deleted (it has ${count} blocks).`,
    hint: 'The field may require a minimum number of entries.',
  }));
});

/**
 * Assert how many blocks a matrix field has.
 *
 * Example #1: Then the "Blocks" field should have 2 blocks
 * Example #2: Then the "Blocks" field should have 0 blocks
 * Example #3: Then the "Blocks" field should have 1 block
 * Example #4: And the "Blocks" field should have 3 blocks
 * Example #5: And the "Blocks" field should have 1 block
 */
Then(/^the "([^"]*)" field should have (\d+) blocks?$/, async function (label, count) {
  const field = await requireField(this, label);
  const control = await matrix(field, label);
  const wanted = Number(count);
  await eventually(this, () => blocks(control).count(), (found) => found === wanted, (found) => ({
    message: `Expected the "${label}" field to have ${wanted} block${wanted === 1 ? '' : 's'}, found ${found}.`,
    hint: 'Blocks are the `.matrixblock` elements of the field.',
  }));
});

/**
 * Assert the type of a block of a matrix field, by its number (from 1): the
 * name of its nested entry type.
 *
 * Example #1: Then block 1 of the "Blocks" field should be a "Text block" block
 * Example #2: Then block 2 of the "Blocks" field should be a "Quote" block
 * Example #3: And block 3 of the "Blocks" field should be a "Text block" block
 * Example #4: Then block 1 of the "Blocks" field should be a "Quote" block
 * Example #5: And block 2 of the "Blocks" field should be a "Text block" block
 */
Then(/^block (\d+) of the "([^"]*)" field should be an? "([^"]*)" block$/, async function (number, label, type) {
  const field = await requireField(this, label);
  const control = await matrix(field, label);
  const block = await requireBlock(this, control, label, Number(number));
  const found = (await block.getAttribute('data-type-name')) || clean(await block.locator('.titlebar .blocktype').first().innerText().catch(() => ''));
  if (found !== type) {
    throw friendly({ message: `Expected block ${number} of the "${label}" field to be a "${type}" block, but it is a "${found}" block.`, hint: 'The type is the name of the nested entry type, shown in the title bar of the block.' });
  }
});

/**
 * Assert the error a field of the form shows after a save that did not pass
 * validation, by the label of the field.
 *
 * Example #1: Then the "Summary" field should have the error "cannot be blank"
 * Example #2: Then the "Title" field should have the error "cannot be blank"
 * Example #3: Then the "Summary" field should have the error "should contain at most 160 characters"
 * Example #4: And the "Slug" field should have the error "cannot be blank"
 * Example #5: Then the "Email" field should have the error "is not a valid email address"
 */
Then(/^the "([^"]*)" field should have the error "([^"]*)"$/, async function (label, text) {
  const field = await requireField(this, label);
  const read = async () => (await field.locator(':scope > ul.errors > li').evaluateAll((items) => items.map((item) => {
    const copy = item.cloneNode(true);
    copy.querySelectorAll('.visually-hidden').forEach((node) => node.remove());
    return copy.textContent.replace(/\s+/g, ' ').trim();
  })));
  await eventually(this, read, (errors) => errors.some((error) => error.includes(text)), (errors) => ({
    message: `Expected the "${label}" field to have the error "${text}". It has: ${errors.length ? errors.join('; ') : 'no error'}.`,
    hint: 'Errors show under a field (`ul.errors`) after a save that did not pass validation.',
  }));
});

/**
 * Assert how many errors the error summary of the form counts ("Found 3
 * errors"), after a save that did not pass validation.
 *
 * Example #1: Then the error summary of the edit form should count 3 errors
 * Example #2: Then the error summary of the edit form should count 1 error
 * Example #3: Then the error summary of the edit form should count 2 errors
 * Example #4: And the error summary of the edit form should count 1 error
 * Example #5: And the error summary of the edit form should count 4 errors
 */
Then(/^the error summary of the edit form should count (\d+) errors?$/, async function (count) {
  const scope = await formScope(this);
  const wanted = Number(count);
  const read = async () => {
    const summary = scope.locator('.error-summary').first();
    if (!(await summary.count())) return null;
    return { count: await summary.locator('ul.errors > li').count(), heading: clean(await summary.locator('h2').first().textContent().catch(() => '')) };
  };
  await eventually(this, read, (found) => Boolean(found) && found.count === wanted, (found) => ({
    message: found ? `Expected the error summary to count ${wanted} error${wanted === 1 ? '' : 's'}, but it lists ${found.count} ("${found.heading}").` : `Expected an error summary counting ${wanted} error${wanted === 1 ? '' : 's'}, but the form shows none.`,
    hint: 'The error summary (`.error-summary`) shows at the top of the form after a save that did not pass validation.',
  }));
});

/**
 * Assert that the error summary of the form names a field with an error.
 *
 * Example #1: Then the error summary of the edit form should name "Summary"
 * Example #2: Then the error summary of the edit form should name "Title"
 * Example #3: Then the error summary of the edit form should name "Slug"
 * Example #4: And the error summary of the edit form should name "Summary"
 * Example #5: And the error summary of the edit form should name "Email"
 */
Then(/^the error summary of the edit form should name "([^"]*)"$/, async function (label) {
  const scope = await formScope(this);
  const read = async () => (await scope.locator('.error-summary ul.errors > li').allTextContents()).map(clean);
  await eventually(this, read, (errors) => errors.some((error) => error.startsWith(label + ' ') || error.includes(label)), (errors) => ({
    message: `Expected the error summary to name "${label}". It lists: ${errors.length ? errors.join('; ') : 'nothing (the form shows no error summary)'}.`,
    hint: 'Each line of the error summary starts with the label of the field.',
  }));
});

/**
 * Assert that a field of the form is, or is not, marked as required, by its
 * label.
 *
 * Example #1: Then the "Summary" field should be marked as required
 * Example #2: Then the "Title" field should be marked as required
 * Example #3: Then the "Body" field should not be marked as required
 * Example #4: And the "Kind" field should not be marked as required
 * Example #5: And the "Text" field should be marked as required
 */
Then(/^the "([^"]*)" field should( not)* be marked as required$/, async function (label, notCase) {
  const field = await requireField(this, label);
  const required = (await field.locator(':scope > .heading .required').count()) > 0;
  if (required === Boolean(notCase)) {
    throw friendly({ message: notCase ? `Expected the "${label}" field not to be marked as required, but it is.` : `Expected the "${label}" field to be marked as required, but it is not.`, hint: 'A required field carries a marker next to its label (`.heading .required`); the field layout decides.' });
  }
});

/**
 * Assert the number of characters a plain text field with a limit still
 * takes, as the counter under the field shows it.
 *
 * Example #1: Then the "Summary" field should have 160 characters left
 * Example #2: Then the "Summary" field should have 144 characters left
 * Example #3: Then the "Summary" field should have 0 characters left
 * Example #4: And the "Summary" field should have 1 character left
 * Example #5: Then the "Summary" field should have -5 characters left
 */
Then(/^the "([^"]*)" field should have (-?\d+) characters? left$/, async function (label, count) {
  const field = await requireField(this, label);
  const counter = field.locator('.chars-left').first();
  if (!(await counter.count())) {
    throw friendly({ message: `The "${label}" field has no character counter.`, hint: 'A plain text field shows the characters left when its settings set a limit.' });
  }
  const read = async () => counter.evaluate((node) => {
    const copy = node.cloneNode(true);
    copy.querySelectorAll('.visually-hidden').forEach((child) => child.remove());
    return copy.textContent.trim();
  });
  await eventually(this, read, (found) => Number(found) === Number(count), (found) => ({
    message: `Expected the "${label}" field to have ${count} characters left, found ${found}.`,
    hint: 'The counter is `.chars-left` under the field.',
  }));
});
