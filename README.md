# craft-cms-steps

Cucumber step definitions for testing Craft CMS sites with
[webship-js](https://webship.co/docs/webship-js/2.0.x), a BDD browser automation
harness built on Playwright and Cucumber-js.

This first version holds the foundations: the control panel session (login by
a handle of the users registry or by credentials, logout, the login form and
its errors), the control panel around the content (pages by name, the primary
navigation, the breadcrumb, the heading, notifications, the "Unauthorized"
screen) and the test site the suite runs against. The element index, the edit
form, fields, assets, users and the site follow.

No step phrase names the platform: a scenario reads `I am logged in to the
control panel as "editor"`.

CI builds a real Craft CMS site with [DDEV](https://ddev.com) and runs the suite
against it on every push and pull request; see
[`.github/workflows/test.yml`](.github/workflows/test.yml).

## Testing this package

```bash
npm install
SITE_DIR="$PWD/../craft-cms-site" .github/scripts/build-ddev-site.sh
npm run test:examples
npx cucumber-js --dry-run
npm test
```

## License

MIT
