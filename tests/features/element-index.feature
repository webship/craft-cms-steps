@index
Feature: The element index
  As an editor
  I want to find, sort and act on many entries at once
  So that I manage the content without opening each entry

  Background:
    Given I am logged in to the control panel as "editor"
    And I am on the control panel page "entries"

  @critical
  Scenario: Sources narrow the index
    Then the "All entries" source of the index should be selected
    When I open the "Blog" source of the index
    Then the "Blog" source of the index should be selected
    And the index should hold 14 items
    And I should see "Launch day" in the index
    And I should not see "About" in the index
    When I open the "Pages" source of the index
    Then the index should hold 3 items
    And I should see "About" in the index
    And I should see "Team" in the index

  Scenario: Search finds entries by their text
    When I open the "Blog" source of the index
    And I search the index for "scenarios"
    Then the index should hold 1 item
    And I should see "Writing good scenarios" in the index
    And I should not see "Launch day" in the index
    When I search the index for "no entry says this at all"
    Then the index should hold 0 items
    When I clear the search of the index
    Then the index should hold 14 items

  Scenario: The status menu filters the index
    When I open the "Blog" source of the index
    And I filter the index by the "Disabled" status
    Then the index should hold 1 item
    And I should see "Unfinished thoughts" in the index
    And "Unfinished thoughts" should have the status "Disabled" in the index
    When I filter the index by the "Live" status
    Then the index should hold 13 items
    And I should not see "Unfinished thoughts" in the index
    And "Launch day" should have the status "Live" in the index

  Scenario: The index sorts by an attribute
    When I open the "Blog" source of the index
    Then "Launch day" should come before "Writing good scenarios" in the index
    When I sort the index by "Title" in "ascending" order
    Then "A year of releases" should come before "Community meetup recap" in the index
    And "Community meetup recap" should come before "Launch day" in the index
    When I sort the index by "Title" in "descending" order
    Then "Writing good scenarios" should come before "Launch day" in the index
    When I sort the index by "Post Date" in "descending" order
    Then "Launch day" should come before "Writing good scenarios" in the index

  Scenario: The columns of the table show the attributes of an entry
    When I open the "Blog" source of the index
    Then "Launch day" should show "1/31/2026" in the "Post Date" column of the index
    And "Launch day" should show "Ada Admin" in the "Authors" column of the index
    And "Notes from the author" should show "Arthur Author" in the "Authors" column of the index

  Scenario: The index shows as cards
    When I open the "Blog" source of the index
    And I switch the index to the "cards" view
    Then I should see "Launch day" in the index
    And "Launch day" should have the status "Live" in the index
    And "Unfinished thoughts" should have the status "Disabled" in the index
    When I switch the index to the "table" view
    Then I should see "Launch day" in the index

  Scenario: The index pages through a long list
    When I open the "Notes" source of the index
    Then the index should hold 120 items
    And the index should show items 1 to 100 of 120
    And I should see "Note 120" in the index
    And I should not see "Note 020" in the index
    When I go to the next page of the index
    Then the index should show items 101 to 120 of 120
    And I should see "Note 020" in the index
    And I should not see "Note 120" in the index
    When I go to the previous page of the index
    Then the index should show items 1 to 100 of 120

  Scenario: A bulk action changes the status of the selected entries
    When I open the "Notes" source of the index
    And I search the index for "Note 00"
    Then the index should hold 9 items
    When I select "Note 001" in the index
    And I select "Note 002" in the index
    Then 2 items should be selected in the index
    When I set the status of the selected items to "Disabled"
    Then I should see the notification "Statuses updated."
    And "Note 001" should have the status "Disabled" in the index
    And "Note 002" should have the status "Disabled" in the index
    And "Note 003" should have the status "Live" in the index
    When I select all items in the index
    Then 9 items should be selected in the index
    When I set the status of the selected items to "Enabled"
    Then I should see the notification "Statuses updated."
    And "Note 001" should have the status "Live" in the index
    And "Note 002" should have the status "Live" in the index

  Scenario: Duplicate an entry, then delete the copies
    Given there is no entry titled "A note to copy"
    When I start a new entry in the "Notes" section
    And I fill in the "Title" field with "A note to copy"
    And I save the edit form
    And I search the index for "A note to copy"
    Then the index should hold 1 item
    When I select "A note to copy" in the index
    And I choose "Duplicate" for the selected items of the index
    Then I should see the notification "Elements duplicated."
    And the index should hold 2 items
    When I select all items in the index
    And I choose "Delete" for the selected items of the index
    Then I should see the notification "Entries deleted."
    And the index should hold 0 items
    And there is no entry titled "A note to copy"
