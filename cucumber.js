module.exports = {
  default: {
    // The step timeout is webship-js's (45 s, set when it loads): WEBSHIP_STEP_TIMEOUT=<milliseconds> changes it; a `timeout` key here is ignored.
    requireModule: ['tsx/cjs'],
    require: [
      'node_modules/webship-js/tests/step-definitions/**/*.js',          // Webship-js core step definitions (auto HTML report on exit; disable: WEBSHIP_REPORT_DISABLE=1).
      // 'node_modules/webship-js/tests/step-definitions-diffy/**/*.js', // Diffy step definitions (optional).
      'tests/step-definitions/**/*.js',                                  // Your custom step definitions.
    ],
    // FEATURES=tests/features/a.feature,tests/features/b.feature runs a subset.
    paths: process.env.FEATURES ? process.env.FEATURES.split(',') : ['tests/features/**/*.feature'],
    // CUCUMBER_TAGS=@critical runs a lane; the default keeps work-in-progress and auth-state setup out.
    tags: process.env.CUCUMBER_TAGS || 'not @wip and not @auth-setup',
    format: [
      '@cucumber/pretty-formatter',
      // REPORT_NAME=must-fail keeps the report of another run (tests/check-must-fail.js) apart.
      `json:tests/reports/${process.env.REPORT_NAME || 'cucumber_report'}.json`,
    ],
    formatOptions: {
      colorsEnabled: true,
      theme: {
        'feature keyword': ['bold', 'blue'],
        'feature name': ['blue', 'underline'],
        'feature description': ['blueBright'],
        'scenario keyword': ['bold', 'magenta'],
        'scenario name': ['magenta', 'underline'],
        'step keyword': ['bold', 'green'],
        'step text': ['greenBright', 'italic'],
      },
    },
    worldParameters: {
      // The default is the local DDEV site that .github/scripts/build-ddev-site.sh builds (project "craftcmssteps"),
      // never a site of somebody else: the suite logs in with the accounts below. LAUNCH_URL points it at another site.
      launchUrl: process.env.LAUNCH_URL || 'https://craftcmssteps.ddev.site',
      // The first segment of the control panel address (the `cpTrigger` general setting) and what comes before the
      // page number of a paginated listing (the `pageTrigger` general setting).
      cpTrigger: process.env.CP_TRIGGER || 'admin',
      pageTrigger: process.env.PAGE_TRIGGER || 'p',
      // The mailbox that catches the mail of the site (the password reset steps read it): the Mailpit of the DDEV project.
      mailUrl: process.env.MAIL_URL || (process.env.LAUNCH_URL || 'https://craftcmssteps.ddev.site').replace(/\/+$/, '') + ':8026',
      // An account that logged in once keeps its session for the rest of the run: later scenarios take it over instead
      // of filling in the login form again. The system limits login attempts from one address (10 a minute by default).
      reuseSessions: process.env.REUSE_SESSIONS !== 'false',
      // Video of the browser: 'off', 'on', 'on-failure' or 'tag' (scenarios tagged @video; @no-video opts out).
      video: { mode: process.env.WEBSHIP_VIDEO || 'off', dir: './videos', size: { width: 1280, height: 720 }, filenamePattern: '{datetime}.{feature_file}.{scenario}.{status}.{ext}' },
      // JavaScript errors the page raises: 'warn' reports them, 'fail' fails the scenario, 'off' ignores them; @js-fail, @js-warn and @js-off per scenario.
      javascript: { mode: process.env.WEBSHIP_JS_ERROR_MODE || 'warn', levels: ['error'], ignore: '', beforeScenario: false, afterScenario: true },
      // The accounts that "I am logged in to the control panel as ..." uses, by handle. They are configuration, not
      // test data: the site build creates them once (site/seed.php, run by .github/scripts/build-ddev-site.sh) and
      // a feature never creates or deletes users. Point the suite at another site with the *_USER and *_PASSWORD
      // variables.
      //   admin   an admin account          everything
      //   editor  the "Editors" user group  all entries, categories and assets; no users, no settings
      //   author  the "Authors" user group  its own entries in the Blog section, the Images volume
      //   member  no group                  an account that may not open the control panel
      users: {
        admin: { username: process.env.ADMIN_USER || 'admin', password: process.env.ADMIN_PASSWORD || 'Admin123456789!' },
        editor: { username: process.env.EDITOR_USER || 'editor', password: process.env.EDITOR_PASSWORD || 'Editor123456789!' },
        author: { username: process.env.AUTHOR_USER || 'author', password: process.env.AUTHOR_PASSWORD || 'Author123456789!' },
        member: { username: process.env.MEMBER_USER || 'member', password: process.env.MEMBER_PASSWORD || 'Member123456789!' },
      },
      minWaitTime: {
        page: 3000,
        before_scenario: 0,
        after_scenario: 0,
        before_step: 0,
        after_step: 0,
      },
      selectors: {
        css: {},
        xpath: {},
        filesPath: './tests/selectors/',
        files: [],
        offset: 60,
        breakpoints: {
          xs:   { width: 375,  height: 667  },
          sm:   { width: 576,  height: 800  },
          md:   { width: 768,  height: 1024 },
          lg:   { width: 992,  height: 768  },
          xl:   { width: 1200, height: 900, default: true },
          xxl:  { width: 1400, height: 900  },
          xxxl: { width: 1920, height: 1080 },
        },
      },
      screenshot: {
        dir: './screenshots',
        purge: false,
        onFailed: true,
        onEveryStep: false,
        alwaysFullscreen: false,
        failedPrefix: 'failed_',
        filenamePattern: '{datetime}.{feature_file}.feature_{step_line}.{ext}',
        filenamePatternFailed: '{failed_prefix}{datetime}.{feature_file}.feature_{step_line}.{ext}',
        infoTypes: '',
      },
      // Diffy visual-regression (optional). Uncomment and set apiKey / projectId to enable.
      // diffy: {
      //   apiKey: '',                                 // DIFFY_API_KEY
      //   projectId: 0,                               // DIFFY_PROJECT_ID
      //   breakpoints: '640,1200',                    // DIFFY_BREAKPOINTS
      //   windowHeight: 2000,                         // DIFFY_WINDOW_HEIGHT
      //   screenshotsDir: '',                         // DIFFY_SCREENSHOTS_DIR
      //   baseUrl: 'https://app.diffy.website/api/',  // DIFFY_API_BASE_URL
      //   maxWait: 30,                                // DIFFY_MAX_WAIT (seconds)
      //   env1Url: '',                                // DIFFY_ENV1_URL
      //   env2Url: '',                                // DIFFY_ENV2_URL
      // },
    },
  },
};
