@site
Feature: The site visitors see
  As a visitor
  I want to read the pages the editors published
  So that I find the articles and the pages of the site

  @critical
  Scenario: The home page is the single entry of the Home section
    Given I am on the homepage
    Then I should see "Welcome to the test site"
    And I should see "A small site for the step definitions."
    And I should see "Launch day"
    And the site should be powered by "Craft CMS"

  Scenario: An entry has a page at the address of its section
    Then "blog/launch-day" should be published on the site
    When I go to "/blog/launch-day"
    Then I should see "Launch day"
    And I should see "31 January 2026"
    And I should see "Ada Admin"
    And I should see "What is new"
    And I should see "It just works."
    And I should see "Event date: 15 March 2026"
    And the response status code should be 200

  Scenario: Entries that are not live have no page
    Then "blog/unfinished-thoughts" should not be published on the site
    And "blog/nothing-was-ever-here" should not be published on the site
    When I go to "/blog/unfinished-thoughts"
    Then I should see "Page not found"
    And the response status code should be 404

  Scenario: A structure gives its pages nested addresses
    Then "about" should be published on the site
    And "about/team" should be published on the site
    And "team" should not be published on the site
    When I go to "/about/team"
    Then I should see "The people"
    And I should see "About" in the "nav[aria-label='Breadcrumb']" element

  Scenario: A listing pages through its entries
    When I go to page 1 of the "blog" listing
    Then I should be on page 1 of the listing
    And I should see "Launch day"
    And I should not see "Testing forms step by step"
    When I click "Next"
    Then I should be on page 2 of the listing
    And I should see "Testing forms step by step"
    And I should not see "Launch day"
    When I go to page 3 of the "blog" listing
    Then I should be on page 3 of the listing
    And I should see "Roadmap update"
    And I should see "Notes from the author"
    When I click "Previous"
    Then I should be on page 2 of the listing

  Scenario: The listing searches the entries
    Given I am on "/blog"
    When I fill in "Search the blog" with "scenarios"
    And I press "Search"
    Then I should see "1 result"
    And I should see "Writing good scenarios"
    And I should not see "Launch day"
