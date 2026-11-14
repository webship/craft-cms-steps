@preview
Feature: The preview
  As an editor
  I want to see the page while I write
  So that I publish what I meant

  Background:
    Given I am logged in to the control panel as "admin"
    And I am on the control panel page "content/entries/pages"

  @critical
  Scenario: The preview follows the form
    When I open "Contact" from the index
    And I open the preview of the edit form
    Then the preview should show "Contact"
    And the preview should show "Get in touch"
    When I fill in the "Subtitle" field with "Typed a moment ago"
    Then the preview should show "Typed a moment ago"
    And the preview should not show "Get in touch"
    When I close the preview
    Then I should see the unsaved changes notice
    When I discard the unsaved changes
    Then the "Subtitle" field should have the value "Get in touch"
    When I go to "/contact"
    Then I should see "Get in touch"
    And I should not see "Typed a moment ago"

  Scenario: The edit form links to the page on the site
    When I open "Team" from the index
    And I view the page of the edit form on the site
    Then I should be on "/about/team"
    And I should see "The people"
