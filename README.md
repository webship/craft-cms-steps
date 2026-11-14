# craft-cms-steps

Cucumber step definitions for testing Craft CMS sites with
[webship-js](https://webship.co/docs/webship-js/2.0.x), a BDD browser automation
harness built on Playwright and Cucumber-js.

`@webship-js/craft-cms-steps` covers what Craft CMS itself renders, whatever the
templates of the project look like: the control panel session, its navigation,
breadcrumbs and notifications, entries from a new entry to the trash and back,
drafts and revisions, the element index (sources, search, filters, sorting,
pagination, bulk actions), slide-out editors, the preview, fields of the common
types (plain text, rich text, lightswitch, dropdown, date, assets, entries,
categories, tags, matrix), assets, categories, user groups and permissions, and
the addresses of the site. The steps are written against the markup of Craft
CMS 5 (5.12).

No step phrase names the platform: a scenario reads `I am logged in to the
control panel as "editor"`. The name appears only where it is what a step
asserts, as an argument (`the site should be powered by "Craft CMS"`).

CI builds a real Craft CMS site with [DDEV](https://ddev.com) and runs the whole
suite against it, twice, on every push and pull request; see
[`.github/workflows/test.yml`](.github/workflows/test.yml).

## Requirements

- Node.js 20 or later
- A webship-js 2.0 test project (webship-js 2.0.10 or later)
- A Craft CMS 5 site to test, and accounts on it for the suite

## Install

```bash
npm install --save-dev @webship-js/craft-cms-steps
```

## Quick start

1. Add the step files to the `require` list of your webship-js `cucumber.js`:

   ```javascript
   require: [
     'node_modules/webship-js/tests/step-definitions/**/*.js',
     'node_modules/@webship-js/craft-cms-steps/tests/step-definitions/*.js',
     'tests/step-definitions/**/*.js',
   ],
   ```

2. Point `launchUrl` at the site and name the accounts the suite logs in with
   (see [Accounts](#accounts)):

   ```javascript
   worldParameters: {
     launchUrl: process.env.LAUNCH_URL || 'https://your-site.ddev.site',
     cpTrigger: 'admin',   // the first segment of the control panel address
     pageTrigger: 'p',     // what comes before the page number of a listing
     mailUrl: 'https://your-site.ddev.site:8026', // the mailbox of the site (Mailpit), for the password reset steps
     users: {
       editor: { username: 'editor', password: process.env.EDITOR_PASSWORD },
     },
   },
   ```

3. Copy a feature file from [`tests/features/`](tests/features/) into your
   project and replace the sections, titles and labels with those of your site.

```gherkin
Feature: Entries

  Scenario: Create and publish an entry
    Given I am logged in to the control panel as "editor"
    And there is no entry titled "A scenario wrote this"
    When I start a new entry in the "Blog" section
    And I fill in the "Title" field with "A scenario wrote this"
    And I fill in the "Summary" field with "Written by the suite."
    And I save the edit form
    Then I should see the success notification "Entry created."
    And "A scenario wrote this" should have the status "Live" in the index
    And "blog/a-scenario-wrote-this" should be published on the site
    And there is no entry titled "A scenario wrote this"
```

## What is included

| File | Steps | Covers |
| --- | --- | --- |
| `craft-session.steps.js` | 12 | Login by a handle of the users registry or by credentials, logout, who is signed in, the login form and its errors, a password reset through the mail. |
| `craft-cp.steps.js` | 15 | Control panel pages by name, the primary navigation and its sub navigation, the breadcrumb and the menu of a crumb, the heading, notifications, the "Unauthorized" screen, the section navigation, the system name. |
| `craft-index.steps.js` | 28 | The element index: sources, search, the status filter, sorting (the View menu and the column headings), columns, views, pagination, items, statuses, the levels of a structure and moving an item in it, selection, bulk actions and what the selection offers, cleanup by title. |
| `craft-editor.steps.js` | 22 | The edit form: new entries and categories, saving, menus, tabs, stored changes, drafts and revisions, slide-out editors, the preview, the page on the site. |
| `craft-fields.steps.js` | 25 | Fields by label: text, rich text, lightswitch, dropdown, date, relation fields, uploads, tags, matrix blocks, errors. |
| `craft-assets.steps.js` | 4 | Uploads to the assets index, the question about a file whose name is taken, thumbnails. |
| `craft-users.steps.js` | 4 | User groups and permissions of an account: read them, grant and revoke one, where a permission comes from. |
| `craft-site.steps.js` | 5 | Published addresses, the pages of a listing, the page of an index item, the `X-Powered-By` header. |
| `craft-helpers.js` | | Shared plumbing for the files above and for your own steps. It registers no step. |

Text, links, forms and the status code of the pages of the site are asserted
with the webship-js steps (`I should see "..."`, `I click "..."`,
`the response status code should be 404`): the markup of the site is the
project's own Twig, so this pack adds only what the system decides.

## How the steps find things and wait

- **By what a person reads.** A field is found by its label, an index item by
  its title, a menu item by its text, a navigation item by its label. The
  hooks of the control panel are the fallback: `data-label` on chips and cards,
  `data-attribute` on fields, `aria-current`, `aria-checked`, `aria-controls`,
  `#nav`, `#crumbs`, `#notifications`, `.element-index`.
- **The form in front.** Field steps act on the slide-out editor when one is
  open, on the editor of the preview when it is open, else on the page. A field
  on another tab of the form is found too: the step opens its tab.
- **No fixed sleeps.** The control panel keeps a timer running (it polls the
  queue), so the steps wait on its own signals instead: the `busy` state of the
  index, its background requests, the spinner of the changes an edit form
  stores, the outcome of a save.
- **Notifications fade.** The control panel removes a notification after a few
  seconds. The steps record the ones shown since the last action, so
  `I should see the notification "Entry saved."` reads it even a moment later.
- **Failures say what was found.** `The index does not show "Launch dya". It
  shows: Launch day, Writing good scenarios, ...` with a hint on where to look.

## Accounts

The suite never creates or deletes a user. Accounts are configuration: create
them once on the test site (the `users/create` console command, or the site
build) and list them in `worldParameters.users`, by a handle the scenarios use:

```javascript
users: {
  admin:  { username: 'admin',  password: process.env.ADMIN_PASSWORD },
  editor: { username: 'editor', password: process.env.EDITOR_PASSWORD },
  author: { username: 'author', password: process.env.AUTHOR_PASSWORD },
},
```

An account that logged in once keeps its session for the rest of the run: a
later scenario that logs in as the same handle takes the session over instead
of filling in the login form again. That is quicker, and it matters: the system
limits login attempts from one address (the `defaultRateLimit` general setting,
10 a minute by default), which a suite that logs in for every scenario exceeds.
`reuseSessions: false` in `worldParameters` turns it off.

User groups and permissions need an edition of Craft CMS that has them.

## A test site

[`.github/scripts/build-ddev-site.sh`](.github/scripts/build-ddev-site.sh)
builds the site the suite of this repository runs against, the documented way:
a DDEV project of type `craftcms`, `composer create-project craftcms/craft`,
`craft install/craft` without questions, the CKEditor plugin, then
[`site/seed.php`](site/seed.php) and the Twig templates of
[`site/templates`](site/templates).

```bash
SITE_DIR="$PWD/../craft-cms-site" .github/scripts/build-ddev-site.sh
npm test
```

The seed goes through the services of the system, so the result is what the
control panel would have saved:

- sections: Blog (channel, `blog/{slug}`), Pages (structure), Home (single),
  Notes (channel, 120 entries without pages, for pagination and bulk actions);
- fields: Summary and Subtitle (plain text), Body (CKEditor), Featured
  (lightswitch), Kind (dropdown), Event date (date), Hero image (assets),
  Related pages (entries), Topics (categories), Keywords (tags), Blocks (matrix
  with the entry types Text block and Quote);
- the Images volume with two images, the Topics category group, the Keywords
  tag group;
- the user groups Editors and Authors, and the accounts `admin`, `editor`,
  `author` and `member` of `cucumber.js`.

No licence is entered and nothing signs in to an account or a store. User groups
run on the Pro edition as a trial, which Craft CMS allows on a local
development domain.

## Steps

One example of each step; the JSDoc block above each definition holds five.

### `craft-assets.steps.js` (4)

- `I upload the file "tests/fixtures/pixel.png" to the assets index`
- `"Harbour" should show a thumbnail in the index`
- `I should see the file conflict question`
- `I answer the file conflict with "Keep both"`

### `craft-cp.steps.js` (15)

- `I go to the control panel page "entries"`
- `I click "Entries" in the control panel navigation`
- `I should see "Entries" in the control panel navigation`
- `the control panel navigation item "Entries" should be selected`
- `I click "Tokens" under "GraphQL" in the control panel navigation`
- `I choose "Notes" from the menu of the "Blog" crumb`
- `the control panel breadcrumb should be "Entries > Blog > Launch day"`
- `I click "Blog" in the control panel breadcrumb`
- `the control panel heading should be "Entries"`
- `I should see the notification "Entry saved."`
- `I should not see an error notification`
- `I should see the unauthorized screen`
- `I should be allowed to open the control panel page "entries"`
- `I open the "Permissions" screen of the section navigation`
- `the control panel system name should be "Webship Test Site"`

### `craft-editor.steps.js` (22)

- `I start a new entry in the "Blog" section`
- `I save the edit form`
- `the save button of the edit form should read "Create entry"`
- `I choose "Save and continue editing" from the save menu of the edit form`
- `I choose "Delete entry" from the actions menu of the edit form`
- `I open the "Details" tab of the edit form`
- `I wait for the edit form to store my changes`
- `I should see the unsaved changes notice`
- `I discard the unsaved changes`
- `I create a draft from the edit form`
- `I apply the draft`
- `the edit form should show the "Draft 1" version`
- `I switch the edit form to the "Current" version`
- `the version menu of the edit form should list "Revision 2"`
- `the edit form should show the status "Live"`
- `I open "Launch day" in a slide-out editor`
- `I should see a slide-out editor`
- `I close the slide-out editor`
- `I open the preview of the edit form`
- `the preview should show "Launch day"`
- `I close the preview`
- `I view the page of the edit form on the site`

### `craft-fields.steps.js` (25)

- `I fill in the "Summary" field with "A short summary."`
- `the "Summary" field should have the value "A short summary."`
- `I fill in the rich text field "Body" with "The full story."`
- `the rich text field "Body" should contain "The full story."`
- `I switch the "Featured" switch on`
- `the "Featured" switch should be on`
- `I choose "Guide" in the "Kind" dropdown`
- `the "Kind" dropdown should show "Guide"`
- `I set the "Event date" date to "3/15/2026"`
- `the "Event date" date should be "3/15/2026"`
- `I add "Harbour" to the "Hero image" field`
- `I remove "Harbour" from the "Hero image" field`
- `the "Hero image" field should hold "Harbour"`
- `I upload the file "tests/fixtures/pixel.png" to the "Hero image" field`
- `I add the tag "howto" to the "Keywords" field`
- `I add a "Text block" block to the "Blocks" field`
- `I fill in "Text" with "A first paragraph." in block 1 of the "Blocks" field`
- `I delete block 2 of the "Blocks" field`
- `the "Blocks" field should have 2 blocks`
- `block 1 of the "Blocks" field should be a "Text block" block`
- `the "Summary" field should have the error "cannot be blank"`
- `the error summary of the edit form should count 3 errors`
- `the error summary of the edit form should name "Summary"`
- `the "Summary" field should be marked as required`
- `the "Summary" field should have 160 characters left`

### `craft-index.steps.js` (28)

- `I open the "Blog" source of the index`
- `I should see the "Blog" source in the index`
- `the "Blog" source of the index should be selected`
- `I search the index for "launch"`
- `I clear the search of the index`
- `I filter the index by the "Disabled" status`
- `I sort the index by "Title" in "ascending" order`
- `I switch the index to the "cards" view`
- `I should see "Launch day" in the index`
- `the index should hold 14 items`
- `the index should show items 1 to 100 of 120`
- `I go to the next page of the index`
- `"Launch day" should have the status "Live" in the index`
- `"Harbour" should show "harbour.png" in the "Filename" column of the index`
- `"Launch day" should come before "Writing good scenarios" in the index`
- `I select "Launch day" in the index`
- `I select all items in the index`
- `2 items should be selected in the index`
- `I set the status of the selected items to "Disabled"`
- `I choose "Delete" for the selected items of the index`
- `I click the "Entry" column heading of the index`
- `the index should be sorted by "Post Date" in "descending" order`
- `I show the "Slug" column of the index`
- `"Team" should be at level 2 in the index`
- `I move "Contact" above "About" in the index`
- `the selected items should offer the action "Delete"`
- `I open "Launch day" from the index`
- `there is no entry titled "Draft idea"`

### `craft-session.steps.js` (12)

- `I am logged in to the control panel as "admin"`
- `I log in to the control panel with the username "admin" and the password "wrong-password"`
- `I log out of the control panel`
- `I should be logged in to the control panel`
- `I should be logged in to the control panel as "admin"`
- `I should see the control panel login form`
- `I should see the login error "Invalid username or password."`
- `I ask for a password reset for "author"`
- `I should see the password reset confirmation`
- `I open the password reset link sent to "author@example.com"`
- `I choose the new password "Author123456789!"`
- `I should see the new password error "should contain at least 6 characters"`

### `craft-site.steps.js` (5)

- `"blog/launch-day" should be published on the site`
- `the site should be powered by "Craft CMS"`
- `I go to page 2 of the "blog" listing`
- `I should be on page 2 of the listing`
- `I visit the page of "Launch day" from the index`

### `craft-users.steps.js` (4)

- `the account should be in the "Authors" user group`
- `the permission "Save entries" under "Section - Blog" should be granted`
- `I grant the permission "Access the site when the system is off" under "General"`
- `the permission "View entries" under "Section - Blog" should come from a user group`

## Testing this package

```bash
npm install
SITE_DIR="$PWD/../craft-cms-site" .github/scripts/build-ddev-site.sh
npm run test:examples      # the examples and the features against the step patterns
npx cucumber-js --dry-run  # no undefined and no ambiguous step
npm test                   # the suite, against the site
npm run test:must-fail     # assertions that must fail, each with its message
```

`LAUNCH_URL` points the suite at another site; `FEATURES` runs a subset
(`FEATURES=tests/features/entries.feature npm test`); `CUCUMBER_TAGS=@critical`
runs the smoke lane; `HEADLESS=false` shows the browser.

`tests/must-fail/` holds scenarios that assert something that is not true on
the test site. `npm run test:must-fail` runs them and checks that each one
fails at its last step, with the message it announces and a hint: a step that
cannot fail proves nothing.

The suite leaves the site as it found it: content a scenario creates is removed
(trash included), content of the site build a scenario changes is changed back.

## License

MIT
