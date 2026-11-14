# Step definitions

| File | Covers |
| --- | --- |
| `craft-session.steps.js` | The control panel session: login by a handle of the users registry or by credentials, logout, who is signed in, the login form and its errors, a password reset through the mail the system sends. |
| `craft-cp.steps.js` | The control panel around the content: pages by name, the primary navigation and its sub navigation, the breadcrumb and the menu of a crumb, the heading, notifications, the "Unauthorized" screen, the section navigation, the system name. |
| `craft-index.steps.js` | The element index of entries, categories and assets: sources, search, the status filter, sorting by the View menu and by a column heading, the columns of the table, views (table, cards, thumbnails, structure), pagination, items and their status, the levels of a structure and moving an item in it, selection, bulk actions and what the selection offers, and the cleanup of content by title. |
| `craft-editor.steps.js` | The edit form: a new entry or category, saving, the save and the actions menus, tabs, stored changes, drafts and revisions, slide-out editors, the preview, the page on the site. |
| `craft-fields.steps.js` | Fields by label: text, rich text, the lightswitch, the dropdown, the date, relation fields and their selection modal, uploads, tags, matrix blocks, errors, the required marker, the characters left. |
| `craft-assets.steps.js` | Assets: uploads to the assets index, the question the control panel asks about a file whose name is taken, thumbnails. |
| `craft-site.steps.js` | The site as visitors get it: published addresses, the pages of a listing, the page of an index item, the header the system signs its answers with. |
| `craft-helpers.js` | Shared plumbing: the wait budget, background requests, friendly errors, control panel addresses, the users registry, the mailbox of the test site, notifications, menus, the element index, the edit form. It registers no step. |

## Rules for a new step

- Check `node_modules/webship-js/tests/step-definitions/` first: a step that the
  generic click, fill and see vocabulary already covers is not added here.
- No step phrase names the platform. The name appears only where it is what a
  step asserts, as an argument (`the site should be powered by "..."`).
- The regular expression starts with the pronoun group `(I |we )*` where a
  person acts, and an assertion takes `should( not)*`, so one definition reads
  both polarities.
- A JSDoc block above the step holds at least five `Example #N:` lines. Run
  `npm run test:examples`: every example must match its own step and no step of
  webship-js.
- Find things the way a person does: a label, a title, a role. The stable hooks
  of the control panel (`data-label`, `data-attribute`, `aria-*`, documented
  ids) are the fallback.
- Wait on the page, never on a fixed time: on the locator, on the index
  (`waitForIndex`), on the background requests (`settle`, `afterRequests`), on
  the stored changes of a form (`waitForStoredChanges`). The control panel keeps
  a timer running, so "no pending timers" never comes true there.
- Fail with `friendly({ message, hint })`: what was expected, what was found
  and where to look.
- A step never creates or deletes a user: accounts are configuration, named in
  the `users` registry of `cucumber.js` and created by the site build.
- Open the screen in a real browser before writing or changing its step, and
  write the step from what is there: the roles and names of the accessibility
  tree, the stable attributes, what the screen does while it loads or saves.
- Give every assertion a scenario in `tests/must-fail/` that makes it fail.
