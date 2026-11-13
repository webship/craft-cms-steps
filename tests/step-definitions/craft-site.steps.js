'use strict';

// The site as visitors get it: whether an address is published, the page of an
// index item, the pages of a paginated listing (the page trigger of the
// address) and the header the system signs its answers with.
//
// The markup of the site is the project's own (its Twig templates), so text,
// links, menus and breadcrumbs are asserted with the webship-js steps. These
// steps cover what the system itself decides: addresses, statuses and headers.
//
// Every failure is a friendly error with a hint instead of a raw Playwright
// timeout stack.

const { When, Then } = require('@cucumber/cucumber');
const { friendly } = require('webship-js/tests/step-definitions/webship');
const {
  budget,
  clean,
  siteUrl,
  open,
  eventually,
  forgetNotifications,
  indexScope,
  waitForIndex,
  requireIndexItem,
} = require('./craft-helpers');

/**
 * The page trigger: what the system puts before the page number of a
 * paginated listing (`p` gives blog/p2; a trigger starting with `?` gives
 * blog?page=2). `worldParameters.pageTrigger` in cucumber.js overrides it.
 */
function pageTrigger(world) {
  return String((world.parameters && world.parameters.pageTrigger) || 'p');
}

/** The address of a page of a listing. */
function listingUrl(world, listing, number) {
  const base = siteUrl(world, listing).replace(/\/+$/, '');
  if (number <= 1) return base;
  const trigger = pageTrigger(world);
  if (trigger.startsWith('?')) return `${base}${trigger}=${number}`;
  return `${base}/${trigger}${number}`;
}

/** The page number the current address names (1 when it names none). */
function currentPageNumber(world) {
  const url = new URL(world.page.url());
  const trigger = pageTrigger(world);
  if (trigger.startsWith('?')) return Number(url.searchParams.get(trigger.slice(1)) || 1);
  const match = url.pathname.match(new RegExp('/' + trigger.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(\\d+)/?$'));
  return match ? Number(match[1]) : 1;
}

/** Request an address of the site as a visitor: a new session without cookies. */
async function visitorRequest(world, url) {
  const playwright = require('playwright');
  const context = await playwright.request.newContext({ ignoreHTTPSErrors: true });
  try {
    const response = await context.get(siteUrl(world, url), { maxRedirects: 5, timeout: budget(world) });
    return { status: response.status(), headers: response.headers() };
  } finally {
    await context.dispose();
  }
}

/**
 * Assert that an address of the site is, or is not, published: a visitor who
 * is not logged in gets the page, or "not found". A disabled entry, a draft,
 * a pending or an expired entry is not published.
 *
 * Example #1: Then "blog/launch-day" should be published on the site
 * Example #2: Then "blog/unfinished-thoughts" should not be published on the site
 * Example #3: Then "about/team" should be published on the site
 * Example #4: And "blog/a-draft-only" should not be published on the site
 * Example #5: And "topics/product" should be published on the site
 */
Then(/^"([^"]*)" should( not)* be published on the site$/, async function (url, notCase) {
  let answer;
  try {
    answer = await visitorRequest(this, url);
  } catch (err) {
    throw friendly({ message: `The site did not answer ${siteUrl(this, url)}.`, cause: err, hint: 'Check launchUrl in cucumber.js and that the site is running.' });
  }
  const published = answer.status >= 200 && answer.status < 300;
  if (notCase && published) {
    throw friendly({ message: `Expected "${url}" not to be published, but a visitor gets it (HTTP ${answer.status}).`, hint: 'An element is published when it is enabled, its post date has passed and it has not expired.' });
  }
  if (!notCase && !published) {
    throw friendly({ message: `Expected "${url}" to be published, but a visitor gets HTTP ${answer.status}.`, hint: 'Check the status of the element, its slug, and the URI format and the template of its section.' });
  }
  if (notCase && answer.status !== 404 && answer.status !== 410) {
    throw friendly({ message: `Expected "${url}" not to be published (not found), but a visitor gets HTTP ${answer.status}.`, hint: 'An address that is not published answers 404.' });
  }
});

/**
 * Assert the system that signs the answers of the site, as its "X-Powered-By"
 * header names it.
 *
 * Example #1: Then the site should be powered by "Craft CMS"
 * Example #2: Then the site should be powered by "Craft"
 * Example #3: And the site should be powered by "Craft CMS"
 * Example #4: Then the site should be powered by "CMS"
 * Example #5: And the site should be powered by "Craft"
 */
Then(/^the site should be powered by "([^"]*)"$/, async function (name) {
  const answer = await visitorRequest(this, '').catch((err) => {
    throw friendly({ message: `The site did not answer ${siteUrl(this, '')}.`, cause: err, hint: 'Check launchUrl in cucumber.js and that the site is running.' });
  });
  const header = answer.headers['x-powered-by'] || '';
  if (!header.split(',').map(clean).some((value) => value.includes(name))) {
    throw friendly({ message: `Expected the site to be powered by "${name}", but its X-Powered-By header is "${header || '(not sent)'}".`, hint: 'The header is sent unless the general setting `sendPoweredByHeader` turns it off.' });
  }
});

/**
 * Open a page of a paginated listing of the site, by its number: the address
 * of the listing followed by the page trigger and the number (blog/p2).
 *
 * Example #1: When I go to page 2 of the "blog" listing
 * Example #2: When I go to page 1 of the "blog" listing
 * Example #3: When we go to page 3 of the "blog" listing
 * Example #4: And I go to page 2 of the "news/archive" listing
 * Example #5: When I go to page 4 of the "blog" listing
 */
When(/^(I |we )*go to page (\d+) of the "([^"]*)" listing$/, async function (pronounCase, number, listing) {
  await open(this, listingUrl(this, listing, Number(number)));
});

/**
 * Assert the page of a paginated listing the browser is on, as the address
 * names it: no page number means page 1.
 *
 * Example #1: Then I should be on page 2 of the listing
 * Example #2: Then I should be on page 1 of the listing
 * Example #3: Then we should be on page 3 of the listing
 * Example #4: And I should be on page 2 of the listing
 * Example #5: And we should be on page 1 of the listing
 */
Then(/^(I |we )*should be on page (\d+) of the listing$/, async function (pronounCase, number) {
  const wanted = Number(number);
  await eventually(this, async () => currentPageNumber(this), (found) => found === wanted, (found) => ({
    message: `Expected to be on page ${wanted} of the listing, but the address names page ${found} (${this.page.url()}).`,
    hint: `The page number follows the page trigger ("${pageTrigger(this)}") in the address; set worldParameters.pageTrigger when the site uses another.`,
  }));
});

/**
 * Open the page of an index item on the site, through the link of its "Link"
 * column, in the same tab.
 *
 * Example #1: When I visit the page of "Launch day" from the index
 * Example #2: When I visit the page of "About" from the index
 * Example #3: When we visit the page of "Product" from the index
 * Example #4: And I visit the page of "Team" from the index
 * Example #5: And we visit the page of "Launch day" from the index
 */
When(/^(I |we )*visit the page of "([^"]*)" from the index$/, async function (pronounCase, title) {
  const scope = await indexScope(this);
  await waitForIndex(this, scope);
  const item = await requireIndexItem(this, scope, title);
  const href = await item.evaluate((node) => {
    const link = node.querySelector('td[data-attr="link"] a[href], td[data-attr="uri"] a[href]');
    if (link) return link.href;
    const own = node.matches('tr') ? node.querySelector('th .element') : node.querySelector('.element');
    return own ? own.getAttribute('data-url') : null;
  });
  if (!href) {
    throw friendly({ message: `"${title}" has no page on the site.`, hint: 'An element has a page when its section or group has a URI format, and the element is not a draft.' });
  }
  await forgetNotifications(this);
  await open(this, href);
});
