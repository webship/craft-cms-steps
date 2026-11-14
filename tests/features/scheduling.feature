@scheduling
Feature: Scheduling an entry
  As the person who runs the site
  I want an entry to go live on its post date and to leave the site on its expiry date
  So that the site changes when I planned it to

  Background:
    Given I am logged in to the control panel as "admin"

  @critical
  Scenario: An entry with a post date in the future is pending
    Given there is no entry titled "A scheduled entry"
    When I start a new entry in the "Blog" section
    Then the edit form should have the "Post Date" field
    And the edit form should have the "Expiry Date" field
    When I fill in the "Title" field with "A scheduled entry"
    And I fill in the "Summary" field with "It waits for its post date."
    And I set the "Post Date" date to "1/1/2099"
    And I save the edit form
    Then I should see the success notification "Entry created."
    And "A scheduled entry" should have the status "Pending" in the index
    And "A scheduled entry" should show "1/1/2099" in the "Post Date" column of the index
    And "blog/a-scheduled-entry" should not be published on the site
    When I filter the index by the "Pending" status
    Then the index should hold 1 item
    And I should see "A scheduled entry" in the index
    When I filter the index by the "Live" status
    Then I should not see "A scheduled entry" in the index
    When I filter the index by the "All" status
    And I open "A scheduled entry" from the index
    Then the edit form should show the status "Pending"
    And the "Post Date" date should be "1/1/2099"
    And there is no entry titled "A scheduled entry"

  Scenario: An entry past its expiry date is expired
    Given there is no entry titled "An entry that ran out"
    When I start a new entry in the "Blog" section
    And I fill in the "Title" field with "An entry that ran out"
    And I fill in the "Summary" field with "It was live for a year."
    And I set the "Post Date" date to "1/1/2020"
    And I set the "Expiry Date" date to "1/1/2021"
    And I save the edit form
    Then I should see the success notification "Entry created."
    And "An entry that ran out" should have the status "Expired" in the index
    And "An entry that ran out" should show "1/1/2021" in the "Expiry Date" column of the index
    And "blog/an-entry-that-ran-out" should not be published on the site
    When I filter the index by the "Expired" status
    Then the index should hold 1 item
    And I should see "An entry that ran out" in the index
    When I filter the index by the "All" status
    Then I should see "An entry that ran out" in the index
    And there is no entry titled "An entry that ran out"

  Scenario: A pending entry goes live when its post date is moved back
    Given there is no entry titled "An entry that could not wait"
    When I start a new entry in the "Blog" section
    And I fill in the "Title" field with "An entry that could not wait"
    And I fill in the "Summary" field with "Planned for later, published now."
    And I set the "Post Date" date to "1/1/2099"
    And I save the edit form
    Then "An entry that could not wait" should have the status "Pending" in the index
    When I open "An entry that could not wait" from the index
    And I set the "Post Date" date to "1/1/2020"
    And I save the edit form
    Then I should see the notification "Entry saved."
    And "An entry that could not wait" should have the status "Live" in the index
    And "blog/an-entry-that-could-not-wait" should be published on the site
    And there is no entry titled "An entry that could not wait"
