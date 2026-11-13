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
    And I should see "GraphQL" in the control panel navigation
    And I should not see "Globals" in the control panel navigation
    And I should not see "Tags" in the control panel navigation

  Scenario: An item of the navigation unfolds its own pages
    When I click "Tokens" under "GraphQL" in the control panel navigation
    Then the control panel heading should be "GraphQL Tokens"
    And the control panel navigation item "GraphQL" should be selected
    When I click "Schemas" under "GraphQL" in the control panel navigation
    Then the control panel heading should be "GraphQL Schemas"

  Scenario: A page opens by its name
    When I go to the control panel page "sections"
    Then the control panel heading should be "Sections"
    And the control panel breadcrumb should be "Settings"
    And the control panel navigation item "Settings" should be selected
    And I should see "Blog"
    And I should see "Pages"

  Scenario Outline: The named pages are the ones the control panel has
    When I go to the control panel page "<name>"
    Then the control panel heading should be "<heading>"

    Examples:
      | name            | heading            |
      | dashboard       | Dashboard          |
      | categories      | Categories         |
      | assets          | Assets             |
      | users           | Users              |
      | my account      | My Account         |
      | system report   | System Report      |
      | settings        | Settings           |
      | general settings | General Settings  |
      | entry types     | Entry Types        |
      | fields          | Fields             |
      | sites           | Sites              |
      | volumes         | Asset Settings     |
      | filesystems     | Asset Settings     |
      | category groups | Category Groups    |
      | tag groups      | Tag Groups         |
      | user groups     | User Settings      |
      | user settings   | User Settings      |
      | plugins         | Plugins            |

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

  Scenario: The section crumb of an entry leads to the other sections
    Given I am on the control panel page "content/entries/blog"
    When I open "Launch day" from the index
    And I choose "Pages" from the menu of the "Blog" crumb
    Then the control panel heading should be "Entries"
    And the "Pages" source of the index should be selected

  Scenario: The section navigation of an account
    Given I am on the control panel page "users"
    When I open "Arthur Author" from the index
    Then the control panel breadcrumb should be "Users > Arthur Author"
    When I open the "Permissions" screen of the section navigation
    Then the account should be in the "Authors" user group
    And the account should not be in the "Editors" user group
