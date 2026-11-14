@fields
Feature: The fields of an entry
  As an editor
  I want to fill in every kind of field
  So that an entry carries its text, its options, its dates, its relations and its blocks

  Background:
    Given I am logged in to the control panel as "admin"

  @critical
  Scenario: An entry with every kind of field reaches the site
    Given there is no entry titled "An entry with every field"
    When I start a new entry in the "Blog" section
    And I fill in the "Title" field with "An entry with every field"
    And I fill in the "Summary" field with "One of each."
    And I fill in the rich text field "Body" with "The body, typed into the editor."
    And I add a "Text block" block to the "Blocks" field
    And I fill in "Heading" with "A heading in a block" in block 1 of the "Blocks" field
    And I fill in "Text" with "A paragraph in a block." in block 1 of the "Blocks" field
    And I add a "Quote" block to the "Blocks" field
    And I fill in "Text" with "A quote in a block." in block 2 of the "Blocks" field
    And I open the "Details" tab of the edit form
    And I switch the "Featured" switch on
    And I choose "Guide" in the "Kind" dropdown
    And I set the "Event date" date to "7/4/2027"
    And I add "Harbour" to the "Hero image" field
    And I add "About" to the "Related pages" field
    And I add "Contact" to the "Related pages" field
    And I add "Engineering" to the "Topics" field
    And I add the tag "howto" to the "Keywords" field
    And I add the tag "a tag the suite made" to the "Keywords" field
    And I save the edit form
    Then I should see the success notification "Entry created."
    When I visit the page of "An entry with every field" from the index
    Then I should see "An entry with every field"
    And I should see "One of each."
    And I should see "The body, typed into the editor."
    And I should see "A heading in a block"
    And I should see "A paragraph in a block."
    And I should see "A quote in a block."
    And I should see "Featured"
    And I should see "Guide"
    And I should see "Event date: 4 July 2027"
    And I should see "Topics: Engineering"
    And I should see "Keywords: howto, a tag the suite made"
    And I should see "Ada Admin"
    And there is no entry titled "An entry with every field"

  Scenario: The form shows the values an entry holds
    When I go to the control panel page "content/entries/blog"
    And I open "Launch day" from the index
    Then the "Title" field should have the value "Launch day"
    And the "Summary" field should have the value "Launch day: a short summary for the listing."
    And the rich text field "Body" should contain "The full text of “Launch day”."
    And the rich text field "Body" should not contain "Lorem ipsum"
    And the "Blocks" field should have 2 blocks
    And block 1 of the "Blocks" field should be a "Text block" block
    And block 2 of the "Blocks" field should be a "Quote" block
    And the "Featured" switch should be on
    And the "Kind" dropdown should show "News"
    And the "Event date" date should be "3/15/2026"
    And the "Hero image" field should hold "Harbour"
    And the "Hero image" field should not hold "Meadow"
    And the "Related pages" field should hold "About"
    And the "Topics" field should hold "Product"
    And the "Keywords" field should hold "release"
    And the "Slug" field should have the value "launch-day"
    And the "Enabled" switch should be on

  Scenario: Switches, dropdowns and dates change and change back
    When I go to the control panel page "content/entries/blog"
    And I open "Roadmap update" from the index
    Then the "Featured" switch should be off
    When I switch the "Featured" switch on
    Then the "Featured" switch should be on
    When I switch the "Featured" switch off
    Then the "Featured" switch should be off
    When I choose "Opinion" in the "Kind" dropdown
    Then the "Kind" dropdown should show "Opinion"
    When I choose "News" in the "Kind" dropdown
    Then the "Kind" dropdown should show "News"
    When I set the "Event date" date to "12/31/2030"
    Then the "Event date" date should be "12/31/2030"
    When I set the "Event date" date to ""
    Then the "Event date" date should be ""
    When I discard the unsaved changes
    Then the "Kind" dropdown should show "News"

  Scenario: Relations are added and removed
    When I go to the control panel page "content/entries/blog"
    And I open "Roadmap update" from the index
    Then the "Hero image" field should not hold "Meadow"
    When I add "Meadow" to the "Hero image" field
    Then the "Hero image" field should hold "Meadow"
    When I remove "Meadow" from the "Hero image" field
    Then the "Hero image" field should not hold "Meadow"
    When I add "Team" to the "Related pages" field
    And I add "Community" to the "Topics" field
    Then the "Related pages" field should hold "Team"
    And the "Topics" field should hold "Community"
    When I remove "Team" from the "Related pages" field
    And I remove "Community" from the "Topics" field
    Then the "Related pages" field should not hold "Team"
    And the "Topics" field should not hold "Community"
    When I add the tag "events" to the "Keywords" field
    Then the "Keywords" field should hold "events"
    When I remove "events" from the "Keywords" field
    Then the "Keywords" field should not hold "events"
    When I discard the unsaved changes
    Then the "Hero image" field should not hold "Meadow"

  Scenario: Blocks are added, filled in and deleted
    When I go to the control panel page "content/entries/blog"
    And I open "Roadmap update" from the index
    Then the "Blocks" field should have 0 blocks
    When I add a "Quote" block to the "Blocks" field
    And I add a "Text block" block to the "Blocks" field
    Then the "Blocks" field should have 2 blocks
    And block 1 of the "Blocks" field should be a "Quote" block
    And block 2 of the "Blocks" field should be a "Text block" block
    When I fill in "Text" with "Said somebody." in block 1 of the "Blocks" field
    And I delete block 2 of the "Blocks" field
    Then the "Blocks" field should have 1 block
    When I delete block 1 of the "Blocks" field
    Then the "Blocks" field should have 0 blocks
    When I discard the unsaved changes
    Then the "Blocks" field should have 0 blocks

  Scenario: A block without its required text stops the save
    Given there is no entry titled "An entry with an empty block"
    When I start a new entry in the "Blog" section
    And I fill in the "Title" field with "An entry with an empty block"
    And I fill in the "Summary" field with "The block is empty."
    And I add a "Quote" block to the "Blocks" field
    And I save the edit form
    Then I should see the error notification "Couldn’t create entry."
    And the error summary of the edit form should count 1 error
    And the error summary of the edit form should name "Text"
    And there is no entry titled "An entry with an empty block"
