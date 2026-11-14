@must-fail
Feature: Assertions that must fail: the edit form, fields and the site
  Every scenario asserts something that is not true on the test site.
  tests/check-must-fail.js runs them and checks each failure and its message.

  Background:
    Given I am logged in to the control panel as "admin"
    And I am on the control panel page "content/entries/blog"

  Scenario: The form has no such field
    Fails with: There is no field labelled "Subtitle" on the form
    When I open "Launch day" from the index
    Then the "Subtitle" field should have the value "Anything"

  Scenario: The field has another value
    Fails with: Expected the "Title" field to have the value "Launch night", found "Launch day"
    When I open "Launch day" from the index
    Then the "Title" field should have the value "Launch night"

  Scenario: The form does have the field
    Fails with: Expected the edit form not to have the "Summary" field, but it does
    When I open "Launch day" from the index
    Then the edit form should not have the "Summary" field

  Scenario: The form lacks the field
    Fails with: Expected the edit form to have the "Subtitle" field
    When I open "Launch day" from the index
    Then the edit form should have the "Subtitle" field

  Scenario: An index is no edit form
    Fails with: This screen has no edit form
    Then the edit form should have the "Title" field

  Scenario: The actions menu offers no such item
    Fails with: Expected the actions menu of the edit form to offer "Delete draft"
    When I open "Launch day" from the index
    Then the actions menu of the edit form should offer "Delete draft"

  Scenario: The actions menu does offer the item
    Fails with: Expected the actions menu of the edit form not to offer "Delete entry", but it does
    When I open "Launch day" from the index
    Then the actions menu of the edit form should not offer "Delete entry"

  Scenario: The status is another one
    Fails with: Expected the edit form to show the status "Pending", found "Live"
    When I open "Launch day" from the index
    Then the edit form should show the status "Pending"

  Scenario: The version is another one
    Fails with: Expected the edit form to show the "Draft 1" version, found "Current"
    When I open "Launch day" from the index
    Then the edit form should show the "Draft 1" version

  Scenario: The save button reads something else
    Fails with: Expected the save button of the edit form to read "Create entry", found "Save"
    When I open "Launch day" from the index
    Then the save button of the edit form should read "Create entry"

  Scenario: No change is stored
    Fails with: Expected to see the notice "Showing your unsaved changes."
    When I open "Launch day" from the index
    Then I should see the unsaved changes notice

  Scenario: No slide-out editor is open
    Fails with: Expected to see a slide-out editor
    Then I should see a slide-out editor

  Scenario: The switch is on
    Fails with: Expected the "Featured" switch to be off, but it is on
    When I open "Launch day" from the index
    Then the "Featured" switch should be off

  Scenario: The dropdown shows another option
    Fails with: Expected the "Kind" dropdown to show "Guide", found "News"
    When I open "Launch day" from the index
    Then the "Kind" dropdown should show "Guide"

  Scenario: The dropdown has no such option
    Fails with: The "Kind" dropdown has no option "Podcast"
    When I open "Launch day" from the index
    And I choose "Podcast" in the "Kind" dropdown

  Scenario: The field is not a date
    Fails with: The "Summary" field is not a date field
    When I open "Launch day" from the index
    Then the "Summary" date should be "1/1/2026"

  Scenario: The relation field holds something else
    Fails with: Expected the "Hero image" field to hold "Meadow". It holds: Harbour
    When I open "Launch day" from the index
    Then the "Hero image" field should hold "Meadow"

  Scenario: The field already holds the tag
    Fails with: The "Keywords" field already holds the tag "release"
    When I open "Launch day" from the index
    And I add the tag "release" to the "Keywords" field

  Scenario: The rich text holds something else
    Fails with: Expected the rich text field "Body" to contain "a sentence nobody wrote"
    When I open "Launch day" from the index
    Then the rich text field "Body" should contain "a sentence nobody wrote"

  Scenario: The field has another number of blocks
    Fails with: Expected the "Blocks" field to have 5 blocks
    When I open "Launch day" from the index
    Then the "Blocks" field should have 5 blocks

  Scenario: The field is required
    Fails with: Expected the "Summary" field not to be marked as required
    When I open "Launch day" from the index
    Then the "Summary" field should not be marked as required

  Scenario: The address is published
    Fails with: Expected "blog/launch-day" not to be published, but a visitor gets it (HTTP 200)
    Then "blog/launch-day" should not be published on the site

  Scenario: The address is not published
    Fails with: Expected "blog/nothing-here" to be published, but a visitor gets HTTP 404
    Then "blog/nothing-here" should be published on the site

  Scenario: The site is powered by something else
    Fails with: Expected the site to be powered by "Something Else", but its X-Powered-By header is "Craft CMS"
    Then the site should be powered by "Something Else"

  Scenario: The listing is on another page
    Fails with: page 3 of the listing
    When I go to page 2 of the "blog" listing
    Then I should be on page 3 of the listing
