'use strict';

// The element index: the list screen of entries, categories, assets and users,
// and the same list inside the selection modal of a relation field. Sources,
// search, the status filter, sorting, the view mode, pagination, the items and
// their status, selection and the bulk actions (set status, duplicate, delete,
// restore, delete permanently), and a cleanup step for the content a suite
// created.
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
  quoted,
  clean,
  listed,
  settle,
  eventually,
  openCpPage,
  forgetNotifications,
  acceptNextDialog,
  chooseFromOpenMenu,
  chooseFromMenu,
  INDEX_HINT,
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
} = require('./craft-helpers');

/** The labels of the sources of an index. */
async function sourceLabels(scope) {
  return scope.locator('.sidebar .sources-list a[data-key], #sidebar .sources-list a[data-key]').evaluateAll((items) => items.map((item) => item.getAttribute('data-label')));
}

/** The toolbar of an index (search, status, view). */
function toolbar(scope) {
  return scope.locator('#toolbar, .toolbar').first();
}

/** The status of an index item: the label of the Status column, else the status of its chip or card. */
async function itemStatus(item) {
  return item.evaluate((node) => {
    const cell = node.querySelector('td[data-attr="status"] .status-label-text, td[data-attr="status"]');
    if (cell && cell.textContent.trim()) return cell.textContent.trim();
    const own = node.matches('tr') ? node.querySelector('th .element') : node.querySelector('.element');
    if (!own) return '';
    const label = own.querySelector('.status[aria-label], [role="img"][aria-label^="Status"]');
    if (label) return label.getAttribute('aria-label').replace(/^Status:\s*/, '');
    return own.getAttribute('data-status') || '';
  });
}

/** The selected items of an index. */
function selectedItems(scope) {
  return scope.locator('.elements tbody tr.sel, .elements .card-grid > li.sel, .elements .card-grid > li:has(.element.sel), .elements ul.structure li.sel');
}

/** Fail unless the index has a selection. */
async function requireSelection(world, scope) {
  if (!(await selectedItems(scope).count())) {
    throw friendly({ message: 'No item of the index is selected.', hint: 'Select items first (I select "..." in the index, I select all items in the index).' });
  }
  await scope.locator('#actions-container:not(.hidden)').first().waitFor({ state: 'visible', timeout: budget(world) }).catch(() => {});
}

/** Run a bulk action of the selection that reloads the index. */
async function bulkAction(world, scope, fn) {
  await forgetNotifications(world);
  const release = acceptNextDialog(world);
  try {
    await reloadingIndex(world, scope, fn);
  } finally {
    release();
  }
}

/** Choose an item of the gear menu ("Actions") of the selection. */
async function chooseSelectionAction(world, scope, action) {
  await requireSelection(world, scope);
  const direct = scope.locator('#actions-container .btn').filter({ hasText: exactly(action) }).first();
  if (await direct.count()) {
    await bulkAction(world, scope, () => direct.click());
    return;
  }
  const gear = scope.locator('#actions-container button[title="Actions"], #actions-container .menubtn[data-icon="settings"]').first();
  if (!(await gear.count())) {
    const buttons = await scope.locator('#actions-container .btn').allInnerTexts();
    throw friendly({ message: `The selection has no action "${action}". Its actions are: ${listed(buttons)}.`, hint: 'The actions depend on the items, the status filter (trashed items can be restored) and the permissions of the account.' });
  }
  await bulkAction(world, scope, () => chooseFromMenu(world, gear, action, 'actions menu of the selection'));
}

/**
 * Open a source of the index: an item of its sidebar, such as a section, a
 * category group, a volume or a user group.
 *
 * Example #1: When I open the "Blog" source of the index
 * Example #2: When I open the "All entries" source of the index
 * Example #3: When we open the "Images" source of the index
 * Example #4: And I open the "Editors" source of the index
 * Example #5: When I open the "Pages" source of the index
 */
When(/^(I |we )*open the "([^"]*)" source of the index$/, async function (pronounCase, name) {
  await openSource(this, name);
});

/**
 * Assert that the index offers, or does not offer, a source: an account only
 * sees the sections, groups and volumes it may view.
 *
 * Example #1: Then I should see the "Blog" source in the index
 * Example #2: Then I should not see the "Pages" source in the index
 * Example #3: Then we should see the "Images" source in the index
 * Example #4: And I should not see the "Notes" source in the index
 * Example #5: Then we should not see the "Singles" source in the index
 */
Then(/^(I |we )*should( not)* see the "([^"]*)" source in the index$/, async function (pronounCase, notCase, name) {
  const scope = await indexScope(this);
  await waitForIndex(this, scope);
  const labels = await sourceLabels(scope);
  if (notCase && labels.includes(name)) {
    throw friendly({ message: `Expected no "${name}" source in the index, but it is there.`, hint: 'Check the permissions of the account: a source shows when the account may view it.' });
  }
  if (!notCase && !labels.includes(name)) {
    throw friendly({ message: `Expected the "${name}" source in the index. Its sources are: ${listed(labels)}.`, hint: INDEX_HINT });
  }
});

/**
 * Assert which source of the index is the current one.
 *
 * Example #1: Then the "Blog" source of the index should be selected
 * Example #2: Then the "All entries" source of the index should be selected
 * Example #3: Then the "Topics" source of the index should be selected
 * Example #4: And the "Images" source of the index should be selected
 * Example #5: Then the "All users" source of the index should be selected
 */
Then(/^the "([^"]*)" source of the index should be selected$/, async function (name) {
  const scope = await indexScope(this);
  const current = async () => scope.locator('.sidebar .sources-list a[aria-current="true"], #sidebar .sources-list a[aria-current="true"], .sidebar .sources-list a.sel, #sidebar .sources-list a.sel').evaluateAll((items) => items.map((item) => item.getAttribute('data-label')));
  await eventually(this, current, (labels) => labels.includes(name), (labels) => ({
    message: `Expected the "${name}" source of the index to be selected. Selected: ${listed(labels)}.`,
    hint: INDEX_HINT,
  }));
});

/**
 * Search the index: type into its search field and wait for the results.
 *
 * Example #1: When I search the index for "launch"
 * Example #2: When I search the index for "Writing good scenarios"
 * Example #3: When we search the index for "title:Roadmap"
 * Example #4: And I search the index for "harbour"
 * Example #5: When I search the index for "nothing matches this"
 */
When(/^(I |we )*search the index for "([^"]*)"$/, async function (pronounCase, text) {
  const scope = await indexScope(this);
  await waitForIndex(this, scope);
  const input = toolbar(scope).locator('.search-container input[type="text"], input[aria-label="Search"]').first();
  if (!(await input.count())) {
    throw friendly({ message: 'The index has no search field.', hint: INDEX_HINT });
  }
  await reloadingIndex(this, scope, async () => {
    await input.fill(text);
    await input.press('Enter');
  });
});

/**
 * Clear the search of the index and wait for the full list.
 *
 * Example #1: When I clear the search of the index
 * Example #2: When we clear the search of the index
 * Example #3: And I clear the search of the index
 * Example #4: Then I clear the search of the index
 * Example #5: And we clear the search of the index
 */
When(/^(I |we )*clear the search of the index$/, async function (pronounCase) {
  const scope = await indexScope(this);
  const input = toolbar(scope).locator('.search-container input[type="text"], input[aria-label="Search"]').first();
  if (!(await input.count())) {
    throw friendly({ message: 'The index has no search field.', hint: INDEX_HINT });
  }
  if (!(await input.inputValue())) return;
  await reloadingIndex(this, scope, async () => {
    await input.fill('');
    await input.press('Enter');
  });
});

/**
 * Filter the index by a status of its status menu: All, Live, Pending, Expired,
 * Disabled, Enabled, Active, Drafts, Trashed, ...
 *
 * Example #1: When I filter the index by the "Disabled" status
 * Example #2: When I filter the index by the "Trashed" status
 * Example #3: When we filter the index by the "Drafts" status
 * Example #4: And I filter the index by the "All" status
 * Example #5: When I filter the index by the "Live" status
 */
When(/^(I |we )*filter the index by the "([^"]*)" status$/, async function (pronounCase, status) {
  const scope = await indexScope(this);
  await waitForIndex(this, scope);
  const button = toolbar(scope).locator('.statusmenubtn').first();
  if (!(await button.count())) {
    throw friendly({ message: 'The index has no status menu.', hint: 'Indexes of elements with statuses (entries, categories, users) have a status menu at the start of the toolbar.' });
  }
  if (clean(await button.innerText()) === status) return;
  await reloadingIndex(this, scope, () => chooseFromMenu(this, button, status, 'status menu of the index'));
});

/**
 * Sort the index by an attribute of its "View" menu, in ascending or
 * descending order.
 *
 * Example #1: When I sort the index by "Title" in "ascending" order
 * Example #2: When I sort the index by "Post Date" in "descending" order
 * Example #3: When we sort the index by "Date Created" in "ascending" order
 * Example #4: And I sort the index by "Slug" in "descending" order
 * Example #5: When I sort the index by "Filename" in "ascending" order
 */
When(/^(I |we )*sort the index by "([^"]*)" in "(ascending|descending)" order$/, async function (pronounCase, attribute, direction) {
  const scope = await indexScope(this);
  await waitForIndex(this, scope);
  const button = toolbar(scope).locator('button[aria-label="View settings"]:not(.hidden)').first();
  if (!(await button.count())) {
    throw friendly({ message: 'The index has no "View" menu.', hint: INDEX_HINT });
  }
  // Each source of the index has a View menu of its own: the button names the one that belongs to it.
  const menuId = await button.getAttribute('aria-controls');
  await button.click();
  const menu = this.page.locator(`[id=${quoted(menuId)}]`).first();
  await menu.waitFor({ state: 'visible', timeout: budget(this) });
  const select = menu.locator('select[aria-label="Sort attribute"]').first();
  const options = (await select.locator('option').allTextContents()).map(clean);
  if (!options.includes(attribute)) {
    await this.page.keyboard.press('Escape').catch(() => {});
    throw friendly({ message: `The index cannot be sorted by "${attribute}". It sorts by: ${listed(options)}.`, hint: 'Use a label of the "Sort by" list of the View menu. A structure section is sorted by its structure.' });
  }
  const dir = direction === 'ascending' ? 'asc' : 'desc';
  if (clean(await select.locator('option:checked').textContent()) !== attribute) {
    await reloadingIndex(this, scope, () => select.selectOption({ label: attribute }));
  }
  const directionButton = menu.locator(`button[data-dir="${dir}"]`).first();
  if ((await directionButton.getAttribute('aria-pressed')) !== 'true') {
    await reloadingIndex(this, scope, () => directionButton.click());
  }
  await this.page.keyboard.press('Escape').catch(() => {});
  await menu.waitFor({ state: 'hidden', timeout: 3000 }).catch(() => button.click().catch(() => {}));
});

/**
 * Switch the view of the index: a table, cards, or the structure of a
 * structure section.
 *
 * Example #1: When I switch the index to the "cards" view
 * Example #2: When I switch the index to the "table" view
 * Example #3: When we switch the index to the "cards" view
 * Example #4: And I switch the index to the "structure" view
 * Example #5: When we switch the index to the "table" view
 */
When(/^(I |we )*switch the index to the "(table|cards|structure|thumbs)" view$/, async function (pronounCase, view) {
  const scope = await indexScope(this);
  await waitForIndex(this, scope);
  const buttons = toolbar(scope).locator('section[aria-label="View"] button[data-view]');
  const button = toolbar(scope).locator(`section[aria-label="View"] button[data-view="${view}"]`).first();
  if (!(await button.count())) {
    const views = await buttons.evaluateAll((items) => items.map((item) => item.getAttribute('data-view')));
    throw friendly({ message: `The index has no "${view}" view. Its views are: ${listed(views)}.`, hint: 'The view buttons sit in the toolbar of the index; a source decides which views it offers.' });
  }
  if ((await button.getAttribute('aria-pressed')) === 'true') return;
  await reloadingIndex(this, scope, () => button.click());
});

/**
 * Assert that the index shows, or does not show, an item with a title on the
 * current page of results.
 *
 * Example #1: Then I should see "Launch day" in the index
 * Example #2: Then I should not see "Unfinished thoughts" in the index
 * Example #3: Then we should see "Harbour" in the index
 * Example #4: And I should not see "Roadmap update" in the index
 * Example #5: Then I should see "Arthur Author" in the index
 */
Then(/^(I |we )*should( not)* see "([^"]*)" in the index$/, async function (pronounCase, notCase, title) {
  const scope = await indexScope(this);
  await waitForIndex(this, scope);
  if (!notCase) {
    await requireIndexItem(this, scope, title);
    return;
  }
  try {
    await indexItem(scope, title).first().waitFor({ state: 'hidden', timeout: budget(this) });
  } catch (err) {
    throw friendly({ message: `Expected no "${title}" in the index, but it is listed.`, hint: 'Check the source, the status filter and the search of the index.' });
  }
});

/**
 * Assert how many items the index holds in all, as its footer counts them
 * (across every page of results).
 *
 * Example #1: Then the index should hold 14 items
 * Example #2: Then the index should hold 0 items
 * Example #3: Then the index should hold 1 item
 * Example #4: And the index should hold 120 items
 * Example #5: Then the index should hold 3 items
 */
Then(/^the index should hold (\d+) items?$/, async function (count) {
  const scope = await indexScope(this);
  await waitForIndex(this, scope);
  const wanted = Number(count);
  await eventually(this, () => indexCount(this, scope), (found) => found.total === wanted, (found) => ({
    message: `Expected the index to hold ${wanted} item${wanted === 1 ? '' : 's'}, but it holds ${found.total}${found.text ? ` ("${found.text}")` : ''}.`,
    hint: 'The total is the count in the footer of the index. Check the source, the status filter and the search.',
  }));
});

/**
 * Assert which slice of the results the index shows: the first and the last
 * item of the page and the total, as its footer says ("1–100 of 120").
 *
 * Example #1: Then the index should show items 1 to 100 of 120
 * Example #2: Then the index should show items 101 to 120 of 120
 * Example #3: Then the index should show items 1 to 14 of 14
 * Example #4: And the index should show items 1 to 50 of 75
 * Example #5: Then the index should show items 51 to 75 of 75
 */
Then(/^the index should show items (\d+) to (\d+) of (\d+)$/, async function (first, last, total) {
  const scope = await indexScope(this);
  await waitForIndex(this, scope);
  const wanted = { first: Number(first), last: Number(last), total: Number(total) };
  await eventually(this, () => indexCount(this, scope), (found) => found.first === wanted.first && found.last === wanted.last && found.total === wanted.total, (found) => ({
    message: `Expected the index to show items ${wanted.first} to ${wanted.last} of ${wanted.total}, but it shows ${found.first} to ${found.last} of ${found.total}${found.text ? ` ("${found.text}")` : ''}.`,
    hint: 'The footer of the index names the items of the current page. An index page holds 100 items (50 in a structure).',
  }));
});

/**
 * Go to the next or the previous page of the results of the index.
 *
 * Example #1: When I go to the next page of the index
 * Example #2: When I go to the previous page of the index
 * Example #3: When we go to the next page of the index
 * Example #4: And I go to the previous page of the index
 * Example #5: And we go to the next page of the index
 */
When(/^(I |we )*go to the (next|previous) page of the index$/, async function (pronounCase, direction) {
  const scope = await indexScope(this);
  await waitForIndex(this, scope);
  const button = scope.locator(direction === 'next' ? '.pagination .next-page' : '.pagination .prev-page').first();
  if (!(await button.count())) {
    throw friendly({ message: 'The index has no pagination.', hint: 'The pagination shows in the footer of an index page (not in a selection modal, which loads more items as it scrolls).' });
  }
  if (/\bdisabled\b/.test((await button.getAttribute('class')) || '')) {
    const count = await indexCount(this, scope);
    throw friendly({ message: `The index has no ${direction} page: it shows items ${count.first} to ${count.last} of ${count.total}.`, hint: 'An index page holds 100 items.' });
  }
  await reloadingIndex(this, scope, () => button.click());
});

/**
 * Assert the status of an item of the index: Live, Pending, Expired, Disabled,
 * Draft, Enabled, Active, Inactive, Suspended, ...
 *
 * Example #1: Then "Launch day" should have the status "Live" in the index
 * Example #2: Then "Unfinished thoughts" should have the status "Disabled" in the index
 * Example #3: Then "Arthur Author" should have the status "Active" in the index
 * Example #4: And "Product" should have the status "Enabled" in the index
 * Example #5: Then "A scheduled article" should have the status "Pending" in the index
 */
Then(/^"([^"]*)" should have the status "([^"]*)" in the index$/, async function (title, status) {
  const scope = await indexScope(this);
  await waitForIndex(this, scope);
  const item = await requireIndexItem(this, scope, title);
  const wanted = status.toLowerCase();
  await eventually(this, async () => clean(await itemStatus(item)), (found) => found.toLowerCase() === wanted, (found) => ({
    message: `Expected "${title}" to have the status "${status}" in the index, found "${found || '(no status)'}".`,
    hint: 'The status is the Status column of the table view, else the status dot of the item.',
  }));
});

/**
 * Assert a value of an item in a column of the table view of the index, by the
 * heading of the column.
 *
 * Example #1: Then "Harbour" should show "harbour.png" in the "Filename" column of the index
 * Example #2: Then "Launch day" should show "Ada Admin" in the "Authors" column of the index
 * Example #3: Then "Launch day" should show "1/31/2026" in the "Post Date" column of the index
 * Example #4: And "Arthur Author" should show "author@example.com" in the "Email" column of the index
 * Example #5: Then "About" should show "about" in the "Slug" column of the index
 */
Then(/^"([^"]*)" should show "([^"]*)" in the "([^"]*)" column of the index$/, async function (title, value, column) {
  const scope = await indexScope(this);
  await waitForIndex(this, scope);
  const item = await requireIndexItem(this, scope, title);
  const cell = item.locator(`td[data-title=${quoted(column)}]`).first();
  if (!(await cell.count())) {
    const columns = await scope.locator('.elements thead th').evaluateAll((cells) => cells.map((cell) => (cell.getAttribute('title') || cell.textContent || '').replace(/\s+/g, ' ').trim()).filter(Boolean));
    throw friendly({ message: `The index has no "${column}" column. Its columns are: ${listed(columns)}.`, hint: 'Columns show in the table view; the "View" menu of the index chooses them.' });
  }
  await eventually(this, async () => clean(await cell.innerText()), (found) => found.includes(value), (found) => ({
    message: `Expected "${title}" to show "${value}" in the "${column}" column of the index, found "${found}".`,
    hint: 'The value is compared with the text of the cell.',
  }));
});

/**
 * Assert the order of two items of the index: the first comes before the
 * second on the current page.
 *
 * Example #1: Then "Launch day" should come before "Writing good scenarios" in the index
 * Example #2: Then "A year of releases" should come before "Launch day" in the index
 * Example #3: Then "About" should come before "Contact" in the index
 * Example #4: And "Harbour" should come before "Meadow" in the index
 * Example #5: Then "Note 120" should come before "Note 119" in the index
 */
Then(/^"([^"]*)" should come before "([^"]*)" in the index$/, async function (first, second) {
  const scope = await indexScope(this);
  await waitForIndex(this, scope);
  await requireIndexItem(this, scope, first);
  await requireIndexItem(this, scope, second);
  await eventually(this, () => indexTitles(scope), (titles) => titles.indexOf(first) < titles.indexOf(second), (titles) => ({
    message: `Expected "${first}" before "${second}" in the index, but "${first}" is item ${titles.indexOf(first) + 1} and "${second}" is item ${titles.indexOf(second) + 1}.`,
    hint: 'Sort the index first (I sort the index by "..." in "ascending" order).',
  }));
});

/**
 * Select an item of the index by its title (its checkbox).
 *
 * Example #1: When I select "Launch day" in the index
 * Example #2: When I select "Note 001" in the index
 * Example #3: When we select "Harbour" in the index
 * Example #4: And I select "Contact" in the index
 * Example #5: And we select "Product" in the index
 */
When(/^(I |we )*select "([^"]*)" in the index$/, async function (pronounCase, title) {
  const scope = await indexScope(this);
  await waitForIndex(this, scope);
  await selectIndexItem(this, scope, title);
});

/**
 * Select every item on the current page of the index.
 *
 * Example #1: When I select all items in the index
 * Example #2: When we select all items in the index
 * Example #3: And I select all items in the index
 * Example #4: And we select all items in the index
 * Example #5: Then I select all items in the index
 */
When(/^(I |we )*select all items in the index$/, async function (pronounCase) {
  const scope = await indexScope(this);
  await waitForIndex(this, scope);
  const all = scope.locator('.elements .selectallcontainer .checkbox, .elements .selectallcontainer [role="checkbox"]').first();
  if (!(await all.count()) || !(await indexItems(scope).count())) {
    throw friendly({ message: 'The index has nothing to select.', hint: 'Check the source, the status filter and the search of the index.' });
  }
  // The checkbox can still read "checked" after a reload cleared the selection: go by the items.
  const total = await indexItems(scope).count();
  for (let attempt = 0; attempt < 2 && (await selectedItems(scope).count()) < total; attempt += 1) {
    await all.click();
    await this.page.waitForFunction((root) => root.querySelectorAll('.elements tbody tr.sel, .elements .card-grid > li.sel, .elements .element.sel').length > 0, await scope.elementHandle(), { timeout: 2000 }).catch(() => {});
  }
  const selected = await selectedItems(scope).count();
  if (selected < total) {
    throw friendly({ message: `The "Select all" checkbox of the index selected ${selected} of ${total} items.`, hint: 'The checkbox sits in the header of the list (`.selectallcontainer`).' });
  }
});

/**
 * Assert how many items of the index are selected.
 *
 * Example #1: Then 2 items should be selected in the index
 * Example #2: Then 1 item should be selected in the index
 * Example #3: Then 100 items should be selected in the index
 * Example #4: And 0 items should be selected in the index
 * Example #5: Then 3 items should be selected in the index
 */
Then(/^(\d+) items? should be selected in the index$/, async function (count) {
  const scope = await indexScope(this);
  const wanted = Number(count);
  await eventually(this, () => selectedItems(scope).count(), (found) => found === wanted, (found) => ({
    message: `Expected ${wanted} selected item${wanted === 1 ? '' : 's'} in the index, found ${found}.`,
    hint: 'Selected items carry the class `sel`.',
  }));
});

/**
 * Set the status of the selected items of the index with the "Set status"
 * action: Enabled or Disabled.
 *
 * Example #1: When I set the status of the selected items to "Disabled"
 * Example #2: When I set the status of the selected items to "Enabled"
 * Example #3: When we set the status of the selected items to "Disabled"
 * Example #4: And I set the status of the selected items to "Enabled"
 * Example #5: And we set the status of the selected items to "Enabled"
 */
When(/^(I |we )*set the status of the selected items to "([^"]*)"$/, async function (pronounCase, status) {
  const scope = await indexScope(this);
  await requireSelection(this, scope);
  const button = scope.locator('#actions-container button[aria-label="Set status"], #actions-container .menubtn').filter({ hasText: /Set status/ }).first();
  if (!(await button.count())) {
    throw friendly({ message: 'The selection has no "Set status" action.', hint: 'The action shows for elements with statuses that the account may save.' });
  }
  await bulkAction(this, scope, () => chooseFromMenu(this, button, status, '"Set status" menu'));
});

/**
 * Run an action of the selected items of the index: a button of the action bar
 * ("Restore") or an item of its gear menu ("Duplicate", "Delete", "Delete
 * permanently", ...). A confirmation dialog is accepted.
 *
 * Example #1: When I choose "Delete" for the selected items of the index
 * Example #2: When I choose "Duplicate" for the selected items of the index
 * Example #3: When I choose "Restore" for the selected items of the index
 * Example #4: When we choose "Delete permanently" for the selected items of the index
 * Example #5: And I choose "Delete" for the selected items of the index
 */
When(/^(I |we )*choose "([^"]*)" for the selected items of the index$/, async function (pronounCase, action) {
  const scope = await indexScope(this);
  await chooseSelectionAction(this, scope, action);
});

/**
 * Open the edit screen of an item of the index by clicking its title.
 *
 * Example #1: When I open "Launch day" from the index
 * Example #2: When I open "About" from the index
 * Example #3: When we open "Harbour" from the index
 * Example #4: And I open "Arthur Author" from the index
 * Example #5: When I open "Product" from the index
 */
When(/^(I |we )*open "([^"]*)" from the index$/, async function (pronounCase, title) {
  const scope = await indexScope(this);
  await waitForIndex(this, scope);
  const item = await requireIndexItem(this, scope, title);
  const link = item.locator('th .element a.label-link, .element a.label-link, .card-heading a').first();
  if (!(await link.count())) {
    throw friendly({ message: `"${title}" has no link to an edit screen in the index.`, hint: 'The account may view the item but not open it, or the index is a selection modal.' });
  }
  await forgetNotifications(this);
  await Promise.all([
    this.page.waitForLoadState('domcontentloaded').catch(() => {}),
    link.click(),
  ]);
  await this.page.locator('#main-form, form[data-element-editor], #main-content, body.message').first().waitFor({ state: 'attached', timeout: budget(this) }).catch(() => {});
  await settle(this);
});

/**
 * Make sure no element with a title is left, live or in the trash: the cleanup
 * of the content a scenario created. The step opens the index of the element
 * type (entries, categories or assets), deletes every item with exactly that
 * title, then deletes them permanently from the trash. It passes when there is
 * nothing to delete.
 *
 * Example #1: Given there is no entry titled "Draft idea"
 * Example #2: Given there is no asset titled "Pixel"
 * Example #3: Given there is no category titled "Temporary topic"
 * Example #4: Then there is no entry titled "A scenario wrote this"
 * Example #5: And there is no entry titled "Copy of About"
 */
Given(/^there is no (entry|category|asset) titled "([^"]*)"$/, async function (type, title) {
  await openCpPage(this, { entry: 'entries', category: 'categories', asset: 'assets' }[type]);
  const scope = await indexScope(this);
  await waitForIndex(this, scope);
  const all = scope.locator('.sidebar .sources-list a[data-key="*"], #sidebar .sources-list a[data-key="*"]').first();
  // "All entries" covers every section; categories and assets have one source per group or volume.
  const sources = (await all.count()) ? [null] : await sourceLabels(scope);
  const first = (await scope.locator('.sidebar .sources-list a[aria-current="true"], #sidebar .sources-list a[aria-current="true"]').first().getAttribute('data-label').catch(() => null));
  if ((await all.count()) && (await all.getAttribute('aria-current')) !== 'true') {
    await reloadingIndex(this, scope, () => all.click());
  }
  const statusButton = toolbar(scope).locator('.statusmenubtn').first();
  const input = toolbar(scope).locator('.search-container input[type="text"], input[aria-label="Search"]').first();
  // What to delete, in order: the saved elements, the drafts nobody saved, then what sits in the trash.
  const passes = [['All', 'Delete'], ['Drafts', 'Delete'], ['Trashed', 'Delete permanently']];
  for (const source of sources) {
    if (source) await openSource(this, source);
    for (const [status, action] of passes) {
      if (await statusButton.count()) {
        if (clean(await statusButton.innerText()) !== status) {
          // The menu gets its id when it first opens: open it, then see whether it offers the status.
          await statusButton.click();
          const menu = this.page.locator(`[id=${quoted(await statusButton.getAttribute('aria-controls'))}]`).first();
          await menu.waitFor({ state: 'visible', timeout: budget(this) }).catch(() => {});
          const offered = await menu.locator('a').evaluateAll((items, wanted) => items.some((item) => item.textContent.trim() === wanted), status).catch(() => false);
          if (!offered) {
            await this.page.keyboard.press('Escape').catch(() => {});
            continue;
          }
          await reloadingIndex(this, scope, () => chooseFromMenu(this, statusButton, status, 'status menu of the index'));
        }
      } else if (status !== 'All') {
        continue;
      }
      if ((await input.inputValue()) !== `title::${quoted(title)}`) {
        await reloadingIndex(this, scope, async () => {
          await input.fill(`title::${quoted(title)}`);
          await input.press('Enter');
        });
      }
      // Delete until the index shows no item with the title (a page at a time).
      for (let round = 0; round < 20; round += 1) {
        const items = indexItem(scope, title);
        const count = await items.count();
        if (!count) break;
        for (let index = 0; index < count; index += 1) {
          const checkbox = items.nth(index).locator('.checkbox[role="checkbox"]').first();
          if ((await checkbox.getAttribute('aria-checked')) !== 'true') await checkbox.click();
        }
        await chooseSelectionAction(this, scope, action);
      }
    }
  }
  // Leave the index as a person finds it: the control panel remembers the search and the status of a source.
  if ((await statusButton.count()) && clean(await statusButton.innerText()) !== 'All') {
    await reloadingIndex(this, scope, () => chooseFromMenu(this, statusButton, 'All', 'status menu of the index'));
  }
  if (await input.inputValue()) {
    await reloadingIndex(this, scope, async () => {
      await input.fill('');
      await input.press('Enter');
    });
  }
  // The control panel also remembers the source: go back to the one the index opened on.
  if (sources.length > 1 && first) await openSource(this, first);
  await forgetNotifications(this);
});
