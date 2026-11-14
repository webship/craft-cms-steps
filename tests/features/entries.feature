@entries
Feature: Entries
  As an editor
  I want to create, change, disable, delete and restore entries
  So that the site shows what I mean it to show

  Background:
    Given I am logged in to the control panel as "admin"

  @critical
  Scenario: Create and publish an entry
    Given there is no entry titled "A scenario wrote this"
    When I start a new entry in the "Blog" section
    Then the control panel heading should be "Create a new entry"
    And the save button of the edit form should read "Create entry"
    When I fill in the "Title" field with "A scenario wrote this"
    And I fill in the "Summary" field with "Written by the suite."
    And I save the edit form
    Then I should see the success notification "Entry created."
    And I should not see an error notification
    And I should see "A scenario wrote this" in the index
    And "A scenario wrote this" should have the status "Live" in the index
    And "blog/a-scenario-wrote-this" should be published on the site
    And there is no entry titled "A scenario wrote this"

  Scenario: An entry without its required fields is not created
    Given there is no entry titled "An entry without a summary"
    When I start a new entry in the "Blog" section
    And I fill in the "Title" field with "An entry without a summary"
    And I save the edit form
    Then I should see the error notification "Couldn’t create entry."
    And the error summary of the edit form should count 1 error
    And the error summary of the edit form should name "Summary"
    And the "Summary" field should have the error "cannot be blank"
    And the "Summary" field should be marked as required
    And the "Kind" field should not be marked as required
    And there is no entry titled "An entry without a summary"

  Scenario: A text that is too long is refused
    Given there is no entry titled "Too long a summary"
    When I start a new entry in the "Blog" section
    And I fill in the "Title" field with "Too long a summary"
    Then the "Summary" field should have 160 characters left
    When I fill in the "Summary" field with "This summary goes on and on, well past the one hundred and sixty characters the field allows, so that the system refuses to save the entry and says why under the field."
    Then the "Summary" field should have -8 characters left
    When I save the edit form
    Then I should see the error notification "Couldn’t create entry."
    And the "Summary" field should have the error "should contain at most 160 characters"
    And there is no entry titled "Too long a summary"

  Scenario: Change an entry and see the change on the site
    Given there is no entry titled "An entry to change"
    When I start a new entry in the "Blog" section
    And I fill in the "Title" field with "An entry to change"
    And I fill in the "Summary" field with "The first summary."
    And I save the edit form
    Then I should see the notification "Entry created."
    When I open "An entry to change" from the index
    Then the "Summary" field should have the value "The first summary."
    And the save button of the edit form should read "Save"
    When I fill in the "Summary" field with "The second summary."
    Then I should see the unsaved changes notice
    When I save the edit form
    Then I should see the success notification "Entry saved."
    When I visit the page of "An entry to change" from the index
    Then I should see "The second summary."
    And I should not see "The first summary."
    And there is no entry titled "An entry to change"

  Scenario: Discard the changes the form stored
    When I go to the control panel page "content/entries/pages"
    And I open "Contact" from the index
    And I fill in the "Subtitle" field with "A subtitle nobody keeps"
    Then I should see the unsaved changes notice
    When I discard the unsaved changes
    Then I should not see the unsaved changes notice
    And the "Subtitle" field should have the value "Get in touch"

  Scenario: A disabled entry leaves the site
    Given there is no entry titled "An entry to disable"
    When I start a new entry in the "Blog" section
    And I fill in the "Title" field with "An entry to disable"
    And I fill in the "Summary" field with "Here today."
    And I save the edit form
    Then "blog/an-entry-to-disable" should be published on the site
    When I open "An entry to disable" from the index
    Then the "Enabled" switch should be on
    And the edit form should show the status "Live"
    When I switch the "Enabled" switch off
    And I save the edit form
    Then I should see the notification "Entry saved."
    And "An entry to disable" should have the status "Disabled" in the index
    And "blog/an-entry-to-disable" should not be published on the site
    And there is no entry titled "An entry to disable"

  Scenario: Delete an entry from its edit form and restore it from the trash
    Given there is no entry titled "An entry to delete"
    When I start a new entry in the "Blog" section
    And I fill in the "Title" field with "An entry to delete"
    And I fill in the "Summary" field with "Gone tomorrow."
    And I save the edit form
    And I open "An entry to delete" from the index
    And I choose "Delete entry" from the actions menu of the edit form
    Then I should see the notification "Entry deleted."
    And I should not see "An entry to delete" in the index
    And "blog/an-entry-to-delete" should not be published on the site
    When I filter the index by the "Trashed" status
    Then I should see "An entry to delete" in the index
    When I select "An entry to delete" in the index
    And I choose "Restore" for the selected items of the index
    Then I should see the notification "Entries restored."
    When I filter the index by the "All" status
    Then I should see "An entry to delete" in the index
    And "blog/an-entry-to-delete" should be published on the site
    And there is no entry titled "An entry to delete"

  Scenario: Save and keep editing
    When I go to the control panel page "content/entries/pages"
    And I open "Contact" from the index
    And I fill in the "Subtitle" field with "Write or call"
    And I choose "Save and continue editing" from the save menu of the edit form
    Then I should see the notification "Entry saved."
    And the control panel heading should be "Contact"
    And the "Subtitle" field should have the value "Write or call"
    When I fill in the "Subtitle" field with "Get in touch"
    And I save the edit form
    Then I should see the notification "Entry saved."

  Scenario: The edit form has the fields and the actions of its entry
    When I go to the control panel page "content/entries/blog"
    And I open "Launch day" from the index
    Then the edit form should have the "Summary" field
    And the edit form should have the "Related pages" field
    And the edit form should have the "Post Date" field
    And the edit form should not have the "Subtitle" field
    And the edit form should not have the "Author" field
    And the actions menu of the edit form should offer "Section settings"
    And the actions menu of the edit form should offer "Entry type settings"
    And the actions menu of the edit form should offer "Delete entry"
    And the actions menu of the edit form should not offer "Delete draft"
