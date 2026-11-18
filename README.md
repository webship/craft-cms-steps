<p align="center"><img src="https://raw.githubusercontent.com/webship/craft-cms-steps/2.0.x/assets/logo.svg" alt="Craft CMS logo" width="96"></p>

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
categories, tags, matrix), assets, categories, and the addresses of the site.
The steps are written against the markup of Craft CMS 5 (5.12), on its free
edition (Solo).

No step phrase names the platform: a scenario reads `I am logged in to the
control panel as "admin"`. The name appears only where it is what a step
asserts, as an argument (`the site should be powered by "Craft CMS"`).

CI builds a real Craft CMS site with [DDEV](https://ddev.com) and runs the whole
suite against it, twice, on every push and pull request; see
[`.github/workflows/test.yml`](.github/workflows/test.yml).

## From nothing to a green run

What the machine needs: Docker, [DDEV](https://ddev.com), git, python3, and Node.js 20 or later with npm. PHP and the database run in DDEV's containers.

**1. The site.** The pack's own build script (the one CI runs) installs the current Craft CMS 5 with the CKEditor plugin in a DDEV project, seeds the sections, fields and content of [A test site](#a-test-site) and copies its Twig templates; the installer creates the account of [Test users](#test-users). It takes a minute or two.

```bash
git clone https://github.com/webship/craft-cms-steps.git
SITE_DIR="$PWD/craft-site" craft-cms-steps/.github/scripts/build-ddev-site.sh
```

The site answers at `https://craftcmssteps.ddev.site` and its control panel at `https://craftcmssteps.ddev.site/admin`.

**2. A test project.**

```bash
mkdir craft-tests && cd craft-tests
npm init -y
npm install --save-dev webship-js @webship-js/craft-cms-steps
npx init-webship-js
```

`npx init-webship-js` writes `cucumber.js`, `playwright.config.ts`, the `tests/` folders with a first feature and the `npm test` scripts, and installs Chromium. npm usually runs it already when it installs webship-js; a second run changes nothing.

**3. `cucumber.js`.** Replace the file with the wiring of the pack: the step files of webship-js and of the pack, the address of the site, the control panel and listing settings, the site's mailbox, and the account (the JSON of [Test users](#test-users)).

```javascript
module.exports = {
  default: {
    requireModule: ['tsx/cjs'],
    require: [
      'node_modules/webship-js/tests/step-definitions/**/*.js',
      'node_modules/@webship-js/craft-cms-steps/tests/step-definitions/*.js',
      'tests/step-definitions/**/*.js',
    ],
    paths: ['tests/features/**/*.feature'],
    format: ['@cucumber/pretty-formatter', 'json:tests/reports/cucumber_report.json'],
    worldParameters: {
      launchUrl: process.env.LAUNCH_URL || 'https://craftcmssteps.ddev.site',
      cpTrigger: 'admin',
      pageTrigger: 'p',
      mailUrl: 'https://craftcmssteps.ddev.site:8026',
      reuseSessions: true,
      // The waits webship-js adds around each page, scenario and step (milliseconds).
      minWaitTime: { page: 3000, before_scenario: 0, after_scenario: 0, before_step: 0, after_step: 0 },
      users: {
        admin: { username: 'admin', password: 'Admin123456789!' },
      },
    },
  },
};
```

**4. A first feature**, `tests/features/first-run.feature`:

```gherkin
Feature: First run
  Scenario: The administrator logs in to the control panel
    Given I am logged in to the control panel as "admin"
    Then the control panel heading should be "Dashboard"

  Scenario: A page of the site is published
    Given I am on the homepage
    Then I should see "Welcome to the test site"
    And "about" should be published on the site
```

**5. Run it.**

```bash
npm test
```

A green first run prints every step, then the summary (the starter feature of `npx init-webship-js` and the two scenarios above, passed) and the HTML report it wrote:

```
3 scenarios (3 passed)
7 steps (7 passed)
0m06.095s (executing steps: 0m06.059s)
[webship-js] HTML report → …/craft-tests/tests/reports/cucumber_report.html
```

From there, copy the features of [`tests/features/`](tests/features/) (they also ship in the package, under `node_modules/@webship-js/craft-cms-steps/tests/features/`, with the file `tests/fixtures/pixel.png` they upload): together they use every step of the pack.

### What the suite tests

The features of this repository run every step of the pack against the test site, twice in a row in CI on every change, and the assertions that must fail after them: logging in to and out of the control panel (by the username and by the email address), refused logins, the login form's own checks, a password reset through the site's mail; the primary navigation, its sub navigation, named pages, the breadcrumb and its menus, the section navigation, the screens the free edition does not have; entries from a new entry to the site and to the trash and back, required fields and refused values, stored changes and discarding them, drafts and revisions, scheduling (pending and expired entries); the element index (sources, search, status filter, sorting, columns and views, cards, pagination, bulk actions, a structure and moving an entry in it, the actions the selection offers); slide-out editors; the preview; the fields of every common kind (plain text, rich text, lightswitch, dropdown, date, assets, entries, categories, tags, matrix blocks); assets (upload, a name that is taken, thumbnails); categories; and the site: published addresses, nested addresses of a structure, listings with pages and search, a topic page, the 404 page, the `X-Powered-By` header and an accessibility audit of three pages.

Not tested: everything of the paid editions (further accounts, user groups, permissions), globals, several sites, the prompt for the password before a sensitive change, inline editing and the export of an index, the cards and index views of a matrix field, nested entries inside rich text, asset folders, the image editor, plugins other than CKEditor, and logging in on the site itself. What a run leaves on the site: the tag the fields feature types into a tags field, after the first run (the control panel has no screen to delete a tag), and the revisions the system records each time a scenario saves an entry, eight a run (an entry changed and changed back keeps both versions in its history).

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
       admin: { username: 'admin', password: process.env.ADMIN_PASSWORD },
     },
   },
   ```

3. Copy a feature file from [`tests/features/`](tests/features/) into your
   project and replace the sections, titles and labels with those of your site.

```gherkin
Feature: Entries

  Scenario: Create and publish an entry
    Given I am logged in to the control panel as "admin"
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
| `craft-editor.steps.js` | 24 | The edit form: new entries and categories, saving, menus and what the actions menu offers, tabs, the fields a form has, stored changes, drafts and revisions, slide-out editors, the preview, the page on the site. |
| `craft-fields.steps.js` | 25 | Fields by label: text, rich text, lightswitch, dropdown, date, relation fields, uploads, tags, matrix blocks, errors. |
| `craft-assets.steps.js` | 4 | Uploads to the assets index, the question about a file whose name is taken, thumbnails. |
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

The suite never creates or deletes a user. Accounts are configuration: list
the ones the site has in `worldParameters.users`, by a handle the scenarios
use. The free edition has one account, the one the installer makes:

```javascript
users: {
  admin: { username: 'admin', password: process.env.ADMIN_PASSWORD },
},
```

An account that logged in once keeps its session for the rest of the run: a
later scenario that logs in as the same handle takes the session over instead
of filling in the login form again. That is quicker, and it matters: the system
limits login attempts from one address (the `defaultRateLimit` general setting,
10 a minute by default), which a suite that logs in for every scenario exceeds.
`reuseSessions: false` in `worldParameters` turns it off.

The steps are proven on the free edition only. User groups, permissions and
further accounts belong to the paid editions: the pack has no step for them.

## Test users

The account this repository's suite logs in as, exactly as `cucumber.js` lists
it in `worldParameters.users` (the default values; `ADMIN_USER` and
`ADMIN_PASSWORD` replace them).
[`.github/scripts/build-ddev-site.sh`](.github/scripts/build-ddev-site.sh)
creates it on the local test site (the installer makes it), and CI does the
same on the runner. It is a placeholder credential of that throwaway site, not
of any real one.

```json
{
  "admin": { "username": "admin", "password": "Admin123456789!" }
}
```

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
- no account: the only one is the admin the installer made, named in
  `cucumber.js`.

The site runs the free edition it is installed with (Solo). No paid edition is
switched on, not even as a trial; no licence is entered or bought; nothing
signs in to an account or to the plugin store.

## Steps

One example of each step; the JSDoc block above each definition holds five.

### `craft-session.steps.js` (12)

- `I am logged in to the control panel as "admin"`
- `I log in to the control panel with the username "admin" and the password "wrong-password"`
- `I log out of the control panel`
- `I should be logged in to the control panel`
- `I should be logged in to the control panel as "admin"`
- `I should see the control panel login form`
- `I should see the login error "Invalid username or password."`
- `I ask for a password reset for "admin"`
- `I should see the password reset confirmation`
- `I open the password reset link sent to "admin@example.com"`
- `I choose the new password "Admin123456789!"`
- `I should see the new password error "should contain at least 6 characters"`

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
- `I open the "Passkeys" screen of the section navigation`
- `the control panel system name should be "Webship Test Site"`

### `craft-editor.steps.js` (24)

- `I start a new entry in the "Blog" section`
- `I save the edit form`
- `the save button of the edit form should read "Create entry"`
- `I choose "Save and continue editing" from the save menu of the edit form`
- `I choose "Delete entry" from the actions menu of the edit form`
- `the actions menu of the edit form should offer "Delete entry"`
- `the edit form should have the "Summary" field`
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

### `craft-site.steps.js` (5)

- `"blog/launch-day" should be published on the site`
- `the site should be powered by "Craft CMS"`
- `I go to page 2 of the "blog" listing`
- `I should be on page 2 of the listing`
- `I visit the page of "Launch day" from the index`

## Testing this package

```bash
npm install
SITE_DIR="$PWD/../craft-cms-site" .github/scripts/build-ddev-site.sh
npm run test:examples      # the examples and the features against the step patterns
npm run test:paths         # a feature or a scenario named on the command line runs alone
npx cucumber-js --dry-run  # no undefined and no ambiguous step
npm test                   # the suite, against the site
npm run test:must-fail     # assertions that must fail, each with its message
```

`LAUNCH_URL` points the suite at another site; `npx cucumber-js
tests/features/entries.feature` runs one feature and `npx cucumber-js
tests/features/entries.feature:<line>` one scenario (the line of its
`Scenario:`; the paths of `cucumber.js` are left out when the command line
names any); `FEATURES` runs a subset too
(`FEATURES=tests/features/entries.feature npm test`); `CUCUMBER_TAGS=@critical`
runs the smoke lane; `HEADLESS=false` shows the browser.

`tests/must-fail/` holds scenarios that assert something that is not true on
the test site. `npm run test:must-fail` runs them and checks that each one
fails at its last step, with the message it announces and a hint: a step that
cannot fail proves nothing.

The suite leaves the site as it found it: content a scenario creates is removed
(trash included), content of the site build a scenario changes is changed back.
Two things stay. A tag: typing a new tag into a tags field creates it at once,
and the control panel has no screen to delete a tag, so the tag "a tag the
suite made" of the fields feature remains in its tag group after the first run.
And the revisions: the system keeps a revision each time a scenario saves an
entry, so an entry changed and changed back has both versions in its history
(eight more a run).

## How the steps were written

Every screen a step touches was opened in a real browser first, and the step
was written from what is there: the roles and names of the accessibility tree,
the stable attributes, what the screen does while it loads or saves, the exact
messages. The steps are proven on the free edition of Craft CMS 5.12 in US
English with Chromium.

Not covered: everything of the paid editions (further accounts, user groups,
permissions), globals, several sites, the prompt for the password before a
sensitive change, inline editing and the export of an index, the cards and
index views of a matrix field, nested entries inside rich text, asset folders,
the image editor, and logging in on the site itself. Tags have no screen of
their own in the control panel: they are added and removed in a tags field.

## License

MIT

## Logo

The Craft CMS logo in this README comes from Simple Icons 16.37.0 (CC0-1.0), filled with the colour the set lists for the brand. The Craft CMS name and logo are trademarks of their owner; this pack is not affiliated with or endorsed by them.
