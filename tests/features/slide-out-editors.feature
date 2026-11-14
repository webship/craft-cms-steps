@slideouts
Feature: Slide-out editors
  As an editor
  I want to change an entry without leaving the index
  So that small changes are quick

  Background:
    Given I am logged in to the control panel as "admin"
    And I am on the control panel page "content/entries/pages"

  @critical
  Scenario: Change an entry in a slide-out editor
    When I open "Contact" in a slide-out editor
    Then I should see a slide-out editor
    And the "Title" field should have the value "Contact"
    And the "Subtitle" field should have the value "Get in touch"
    When I fill in the "Subtitle" field with "Changed in a slide-out"
    And I save the edit form
    Then I should see the notification "Entry saved."
    And I should not see a slide-out editor
    When I go to "/contact"
    Then I should see "Changed in a slide-out"
    When I go to the control panel page "content/entries/pages"
    And I open "Contact" in a slide-out editor
    And I fill in the "Subtitle" field with "Get in touch"
    And I save the edit form
    Then I should see the notification "Entry saved."
    When I go to "/contact"
    Then I should see "Get in touch"

  Scenario: Close a slide-out editor without saving
    When I open "Team" in a slide-out editor
    Then the "Subtitle" field should have the value "The people"
    When I close the slide-out editor
    Then I should not see a slide-out editor
    And I should see "Team" in the index

  Scenario: A slide-out editor shows the errors of a save
    When I open "Team" in a slide-out editor
    And I fill in the "Title" field with ""
    And I save the edit form
    Then I should see a slide-out editor
    And the "Title" field should have the error "cannot be blank"
    When I fill in the "Title" field with "Team"
    And I wait for the edit form to store my changes
    And I discard the unsaved changes
    And I go to the control panel page "content/entries/pages"
    Then I should see "Team" in the index
