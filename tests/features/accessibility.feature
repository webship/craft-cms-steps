@a11y
Feature: Accessibility
  As somebody who uses assistive technology
  I want the pages of the site and the door of the control panel to be accessible
  So that I can read the site and sign in

  Scenario: The home page passes the accessibility audit
    Given I am on the homepage
    Then the page should pass an accessibility audit at level "AA"
    And the page should have a title
    And the page should have exactly one h1

  Scenario: An entry page passes the accessibility audit
    Given I am on "/blog/launch-day"
    Then the page should pass an accessibility audit at level "AA"
    And every image should have an alt attribute
    And the page should have exactly one h1

  Scenario: The listing passes the accessibility audit
    Given I am on "/blog"
    Then the page should pass an accessibility audit at level "AA"
    And every form field should have an accessible label

  Scenario: The control panel login form labels its fields
    Given I am on "/admin/login"
    Then I should see the control panel login form
    And the page should have a title
    And every form field should have an accessible label
