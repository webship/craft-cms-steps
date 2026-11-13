@control-panel
Feature: The control panel navigation
  As an editor
  I want to find my way around the control panel
  So that I reach the content I manage

  Background:
    Given I am logged in to the control panel as "admin"

  @critical
  Scenario: The primary navigation leads to the entries
    When I click "Entries" in the control panel navigation
    Then the control panel heading should be "Entries"
    And the control panel navigation item "Entries" should be selected
    And the "All entries" source of the index should be selected

  Scenario: The primary navigation lists the areas an admin manages
    Then I should see "Dashboard" in the control panel navigation
    And I should see "Entries" in the control panel navigation
    And I should see "Categories" in the control panel navigation
    And I should see "Assets" in the control panel navigation
    And I should see "Users" in the control panel navigation
    And I should see "Utilities" in the control panel navigation
    And I should see "Settings" in the control panel navigation
    And I should not see "Globals" in the control panel navigation

  Scenario: A page opens by its name
    When I go to the control panel page "sections"
    Then the control panel heading should be "Sections"
    And the control panel breadcrumb should be "Settings"
    And the control panel navigation item "Settings" should be selected
    And I should see "Blog"
    And I should see "Pages"

  Scenario: A page opens by its path
    When I go to the control panel page "content/entries/pages"
    Then the control panel heading should be "Entries"
    And the "Pages" source of the index should be selected

  Scenario: The breadcrumb of an entry leads back to its section
    Given I am on the control panel page "entries"
    When I open the "Blog" source of the index
    And I open "Launch day" from the index
    Then the control panel heading should be "Launch day"
    And the control panel breadcrumb should be "Entries > Blog > Launch day"
    When I click "Blog" in the control panel breadcrumb
    Then the control panel heading should be "Entries"
    And the "Blog" source of the index should be selected

  Scenario: The section navigation of an account
    Given I am on the control panel page "users"
    When I open "Arthur Author" from the index
    Then the control panel breadcrumb should be "Users > Arthur Author"
    When I open the "Permissions" screen of the section navigation
    Then the account should be in the "Authors" user group
    And the account should not be in the "Editors" user group
