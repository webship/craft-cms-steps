@must-fail
Feature: Assertions that must fail: the element index, assets and permissions
  Every scenario asserts something that is not true on the test site.
  tests/check-must-fail.js runs them and checks each failure and its message.

  Background:
    Given I am logged in to the control panel as "admin"

  Scenario: An edit form is not an index
    Fails with: There is no element index on this screen
    Given I am on the control panel page "content/entries/blog"
    When I open "Launch day" from the index
    Then I should not see "Roadmap update" in the index

  Scenario: The index has no such item
    Fails with: The index does not show "Launch dya"
    Given I am on the control panel page "content/entries/blog"
    Then I should see "Launch dya" in the index

  Scenario: The item is listed
    Fails with: Expected no "Launch day" in the index, but it is listed
    Given I am on the control panel page "content/entries/blog"
    Then I should not see "Launch day" in the index

  Scenario: The index holds another number of items
    Fails with: Expected the index to hold 15 items, but it holds 14
    Given I am on the control panel page "content/entries/blog"
    Then the index should hold 15 items

  Scenario: The index has no such source
    Fails with: The index has no source "Products"
    Given I am on the control panel page "entries"
    When I open the "Products" source of the index

  Scenario: Another source is selected
    Fails with: Expected the "Pages" source of the index to be selected
    Given I am on the control panel page "content/entries/blog"
    Then the "Pages" source of the index should be selected

  Scenario: The status is another one
    Fails with: Expected "Launch day" to have the status "Pending" in the index, found "Live"
    Given I am on the control panel page "content/entries/blog"
    Then "Launch day" should have the status "Pending" in the index

  Scenario: The column shows another value
    Fails with: Expected "Harbour" to show "meadow.png" in the "Filename" column of the index, found "harbour.png"
    Given I am on the control panel page "assets"
    Then "Harbour" should show "meadow.png" in the "Filename" column of the index

  Scenario: The index has no such column
    Fails with: The index has no "Slug" column
    Given I am on the control panel page "content/entries/blog"
    Then "Launch day" should show "launch-day" in the "Slug" column of the index

  Scenario: The order is the other way round
    Fails with: Expected "Contact" before "About" in the index
    Given I am on the control panel page "content/entries/pages"
    Then "Contact" should come before "About" in the index

  Scenario: The index is sorted by something else
    Fails with: Expected the index to be sorted by "Entry" in ascending order
    Given I am on the control panel page "content/entries/blog"
    Then the index should be sorted by "Entry" in "ascending" order

  Scenario: The column does not sort
    Fails with: The index cannot be sorted by its "Status" column
    Given I am on the control panel page "content/entries/blog"
    When I click the "Status" column heading of the index

  Scenario: The view menu offers no such column
    Fails with: The "View" menu of the index offers no "Colour" column
    Given I am on the control panel page "content/entries/blog"
    When I show the "Colour" column of the index

  Scenario: The level is another one
    Fails with: Expected "Team" at level 1 in the index, but it is at level 2
    Given I am on the control panel page "content/entries/pages"
    Then "Team" should be at level 1 in the index

  Scenario: A channel has no levels
    Fails with: "Launch day" has no level
    Given I am on the control panel page "content/entries/blog"
    Then "Launch day" should be at level 1 in the index

  Scenario: An item of a channel cannot be moved
    Fails with: "Launch day" has no handle to move it by
    Given I am on the control panel page "content/entries/blog"
    When I move "Launch day" below "Roadmap update" in the index

  Scenario: Nothing is selected
    Fails with: No item of the index is selected
    Given I am on the control panel page "content/entries/blog"
    Then the selected items should offer the action "Delete"

  Scenario: The selection offers no such action
    Fails with: Expected the selected items to offer the action "Restore"
    Given I am on the control panel page "content/entries/blog"
    When I select "Launch day" in the index
    Then the selected items should offer the action "Restore"

  Scenario: The selection does offer the action
    Fails with: Expected the selected items not to offer the action "Delete", but they do
    Given I am on the control panel page "content/entries/blog"
    When I select "Launch day" in the index
    Then the selected items should not offer the action "Delete"

  Scenario: Another number of items is selected
    Fails with: Expected 2 selected items in the index, found 1
    Given I am on the control panel page "content/entries/blog"
    When I select "Launch day" in the index
    Then 2 items should be selected in the index

  Scenario: The index has no such view
    Fails with: The index has no "thumbs" view
    Given I am on the control panel page "content/entries/blog"
    When I switch the index to the "thumbs" view

  Scenario: No question about a file is open
    Fails with: The control panel asks no question about a file that already exists
    Given I am on the control panel page "assets"
    When I answer the file conflict with "Keep both"

  Scenario: The file to upload does not exist
    Fails with: The file "tests/fixtures/nothing.png" does not exist
    Given I am on the control panel page "assets"
    When I upload the file "tests/fixtures/nothing.png" to the assets index

  Scenario: The account is in another group
    Fails with: Expected the account to be in the "Editors" user group. Its groups are: Authors
    Given I am on the control panel page "users"
    When I open "Arthur Author" from the index
    And I open the "Permissions" screen of the section navigation
    Then the account should be in the "Editors" user group

  Scenario: The permission is not granted
    Fails with: Expected the permission "View users" under "Users" to be granted, but it is not
    Given I am on the control panel page "users"
    When I open "Arthur Author" from the index
    And I open the "Permissions" screen of the section navigation
    Then the permission "View users" under "Users" should be granted

  Scenario: The permission is the account's own
    Fails with: Expected the permission "View users" under "Users" to come from a user group, but it is not granted
    Given I am on the control panel page "users"
    When I open "Arthur Author" from the index
    And I open the "Permissions" screen of the section navigation
    Then the permission "View users" under "Users" should come from a user group

  Scenario: There is no such permission
    Fails with: There is no permission "Publish entries" under "Section - Blog"
    Given I am on the control panel page "users"
    When I open "Arthur Author" from the index
    And I open the "Permissions" screen of the section navigation
    Then the permission "Publish entries" under "Section - Blog" should be granted
