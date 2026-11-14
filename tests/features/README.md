# Features

Reference features for the test site that `.github/scripts/build-ddev-site.sh`
builds: a Blog channel, a Pages structure, a Home single, a Notes channel of 120
entries, an Images volume, a Topics category group, a Keywords tag group, the
user groups Editors and Authors, and four accounts. Copy a feature into your
project and replace the sections, the titles and the labels with those of your
site.

| Feature | Covers |
| --- | --- |
| `session` | Logging in to and out of the control panel, a wrong password, an account without access, a password reset through the mail. |
| `control-panel` | The primary navigation and its sub navigation, pages by name and by path, the breadcrumb and the menu of a crumb, the heading, the section navigation. |
| `permissions` | What an author and an editor see and may open, the "Unauthorized" screen, the permissions screen, the users index. |
| `entries` | Create, validate, change, discard changes, disable, delete and restore an entry; save and keep editing. |
| `drafts-and-revisions` | A draft that stays away from the site until it is applied, revisions, the drafts of the index. |
| `element-index` | Sources, search, the status filter, sorting by the View menu and by a column heading, showing and hiding a column, the cards view, pagination, the levels of a structure and moving an entry in it, selection, bulk actions and what the selection offers. |
| `slide-out-editors` | Changing an entry in a slide-out editor, closing it, its errors. |
| `fields` | Plain text, rich text, the lightswitch, the dropdown, the date, assets, entries, categories, tags and matrix blocks, to the page on the site. |
| `assets` | The assets index, the thumbnails view, uploading to the index and into a field, a file whose name is taken. |
| `categories` | The categories index, creating a category, its page on the site. |
| `preview` | The preview next to the edit form, and the link to the page on the site. |
| `site` | The home page, entry pages, entries that are not live, nested addresses, a paginated listing, the search of the listing. |
| `accessibility` | The accessibility audit of the pages of the site and of the control panel login. |

Scenarios that create content remove it at the end and start with a "there is
no ... titled ..." step, so a failed run does not stop the next one. Scenarios
that change the content of the site build change it back. No scenario creates
or deletes a user.
