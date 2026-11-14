@drafts
Feature: Drafts and revisions
  As an editor
  I want to work on a draft and apply it when it is ready
  So that visitors see finished work only, and earlier versions stay at hand

  Background:
    Given I am logged in to the control panel as "admin"
    And there is no entry titled "An entry with versions"
    And I start a new entry in the "Blog" section
    And I fill in the "Title" field with "An entry with versions"
    And I fill in the "Summary" field with "The published summary."
    And I save the edit form
    And I open "An entry with versions" from the index

  @critical
  Scenario: A draft stays away from the site until it is applied
    When I create a draft from the edit form
    Then I should see the notification "Draft saved."
    And the edit form should show the "Draft 1" version
    And the save button of the edit form should read "Save draft"
    When I fill in the "Summary" field with "The summary of the draft."
    And I save the edit form
    Then I should see the notification "Draft saved."
    When I go to "/blog/an-entry-with-versions"
    Then I should see "The published summary."
    And I should not see "The summary of the draft."
    When I go to the control panel page "content/entries/blog"
    And I open "An entry with versions" from the index
    Then the version menu of the edit form should list "Draft 1"
    When I switch the edit form to the "Draft 1" version
    Then the "Summary" field should have the value "The summary of the draft."
    When I apply the draft
    Then I should see the notification "Draft applied."
    When I go to "/blog/an-entry-with-versions"
    Then I should see "The summary of the draft."
    And there is no entry titled "An entry with versions"

  Scenario: Each save keeps a revision
    Then the edit form should show the status "Live"
    When I fill in the "Summary" field with "The second summary."
    And I save the edit form
    And I open "An entry with versions" from the index
    Then the version menu of the edit form should list "Current"
    And the version menu of the edit form should list "Revision 1"
    And the version menu of the edit form should not list "Draft 1"
    When I switch the edit form to the "Revision 1" version
    Then the edit form should show the "Revision 1" version
    And I should see "The published summary."
    When I switch the edit form to the "Current" version
    Then the "Summary" field should have the value "The second summary."
    And there is no entry titled "An entry with versions"

  Scenario: A draft shows among the drafts of the index
    When I create a draft from the edit form
    And I go to the control panel page "content/entries/blog"
    And I filter the index by the "Drafts" status
    Then I should see "An entry with versions" in the index
    And "An entry with versions" should have the status "Draft" in the index
    When I filter the index by the "All" status
    Then "An entry with versions" should have the status "Live" in the index
    And there is no entry titled "An entry with versions"
