@permissions
Feature: What an account may do
  As the owner of the site
  I want each user group to reach only what it manages
  So that authors write and editors edit, and nobody else changes the settings

  @critical
  Scenario: An author sees the Blog section only
    Given I am logged in to the control panel as "author"
    Then I should see "Entries" in the control panel navigation
    And I should see "Assets" in the control panel navigation
    And I should not see "Categories" in the control panel navigation
    And I should not see "Users" in the control panel navigation
    And I should not see "Settings" in the control panel navigation
    And I should not see "Utilities" in the control panel navigation
    When I go to the control panel page "entries"
    Then I should see the "Blog" source in the index
    And I should not see the "Pages" source in the index
    And I should not see the "Notes" source in the index

  Scenario: An author sees its own entries, not those of others
    Given I am logged in to the control panel as "author"
    When I go to the control panel page "entries"
    And I open the "Blog" source of the index
    Then I should see "Notes from the author" in the index
    And I should not see "Launch day" in the index
    And the index should hold 1 item

  Scenario: An author may not open the settings, the users or the entries of others
    Given I am logged in to the control panel as "author"
    Then I should be allowed to open the control panel page "entries"
    And I should be allowed to open the control panel page "assets"
    And I should not be allowed to open the control panel page "settings"
    And I should not be allowed to open the control panel page "users"
    And I should not be allowed to open the control panel page "categories"
    And I should not be allowed to open the control panel page "system report"

  Scenario: The control panel explains why a request is refused
    Given I am logged in to the control panel as "author"
    When I go to the control panel page "settings"
    Then I should see the unauthorized screen
    And I should see the unauthorized screen with "User is not permitted to perform this action."

  Scenario: An editor manages the content but not the users or the settings
    Given I am logged in to the control panel as "editor"
    Then I should see "Entries" in the control panel navigation
    And I should see "Categories" in the control panel navigation
    And I should see "Assets" in the control panel navigation
    And I should not see "Users" in the control panel navigation
    And I should not see "Settings" in the control panel navigation
    And I should not be allowed to open the control panel page "settings"
    And I should not be allowed to open the control panel page "users"
    When I go to the control panel page "entries"
    Then I should see the "Blog" source in the index
    And I should see the "Pages" source in the index
    And I should see the "Notes" source in the index
    When I open the "Blog" source of the index
    Then I should see "Launch day" in the index
    And I should see "Notes from the author" in the index

  Scenario: The permissions screen of an account shows what its group grants
    Given I am logged in to the control panel as "admin"
    And I am on the control panel page "users"
    When I open "Arthur Author" from the index
    And I open the "Permissions" screen of the section navigation
    Then the account should be in the "Authors" user group
    And the permission "Access the control panel" under "General" should be granted
    And the permission "View entries" under "Section - Blog" should be granted
    And the permission "Save entries" under "Section - Blog" should be granted
    And the permission "View entries" under "Section - Pages" should not be granted
    And the permission "View users" under "Users" should not be granted
    And the permission "View assets" under "Volume - Images" should be granted
    And the permission "Delete assets" under "Volume - Images" should not be granted

  Scenario: The users index lists the accounts by group
    Given I am logged in to the control panel as "admin"
    And I am on the control panel page "users"
    Then the index should hold 4 items
    And "Arthur Author" should have the status "Active" in the index
    When I open the "Editors" source of the index
    Then I should see "Edith Editor" in the index
    And I should not see "Arthur Author" in the index
    And the index should hold 1 item
    When I open the "Admins" source of the index
    Then I should see "Ada Admin" in the index
