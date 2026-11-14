@must-fail
Feature: Assertions that must fail: the session and the control panel
  Every scenario asserts something that is not true on the test site.
  tests/check-must-fail.js runs them and checks each failure and its message.

  Scenario: A login that worked shows no login error
    Fails with: Expected the login error "Invalid username or password."
    When I log in to the control panel with the username "editor" and the password "Editor123456789!"
    Then I should see the login error "Invalid username or password."

  Scenario: Somebody else is logged in
    Fails with: Expected "admin" to be logged in to the control panel
    Given I am logged in to the control panel as "editor"
    Then I should be logged in to the control panel as "admin"

  Scenario: A handle that is not in the users registry
    Fails with: The user "publisher" is not in the users registry
    Given I am logged in to the control panel as "publisher"

  Scenario: The navigation has no such item
    Fails with: Expected "Globals" in the control panel navigation
    Given I am logged in to the control panel as "admin"
    Then I should see "Globals" in the control panel navigation

  Scenario: An author does see the entries
    Fails with: Expected no "Entries" in the control panel navigation
    Given I am logged in to the control panel as "author"
    Then I should not see "Entries" in the control panel navigation

  Scenario: The heading is another one
    Fails with: Expected the control panel heading "Posts", found "Entries"
    Given I am logged in to the control panel as "admin"
    When I go to the control panel page "entries"
    Then the control panel heading should be "Posts"

  Scenario: The breadcrumb is another one
    Fails with: Expected the control panel breadcrumb "Entries > Pages > Launch day", found "Entries > Blog > Launch day"
    Given I am logged in to the control panel as "admin"
    And I am on the control panel page "content/entries/blog"
    When I open "Launch day" from the index
    Then the control panel breadcrumb should be "Entries > Pages > Launch day"

  Scenario: A page that does not exist is not a refusal
    Fails with: The control panel has no page "settings/users/groups"
    Given I am logged in to the control panel as "author"
    Then I should not be allowed to open the control panel page "settings/users/groups"

  Scenario: A page that does not exist does not open
    Fails with: The control panel has no page "settings/nothing-here"
    Given I am logged in to the control panel as "admin"
    When I go to the control panel page "settings/nothing-here"

  Scenario: An admin is not refused
    Fails with: Expected the control panel page "settings" to be refused, but it opened
    Given I am logged in to the control panel as "admin"
    Then I should not be allowed to open the control panel page "settings"

  Scenario: An author is refused
    Fails with: Expected the control panel page "users" to open, but it was refused
    Given I am logged in to the control panel as "author"
    Then I should be allowed to open the control panel page "users"

  Scenario: An open page is not the unauthorized screen
    Fails with: Expected the "Unauthorized" screen
    Given I am logged in to the control panel as "admin"
    When I go to the control panel page "settings"
    Then I should see the unauthorized screen

  Scenario: The refusal has another reason
    Fails with: found the message "Unauthorized User is not permitted to perform this action."
    Given I am logged in to the control panel as "author"
    When I go to the control panel page "settings"
    Then I should see the unauthorized screen with "not authorized to edit this element"

  Scenario: No notification was shown
    Fails with: Expected the notification "Entry saved."
    Given I am logged in to the control panel as "admin"
    When I go to the control panel page "entries"
    Then I should see the notification "Entry saved."

  Scenario: The crumb menu has no such section
    Fails with: has no item "Products"
    Given I am logged in to the control panel as "admin"
    And I am on the control panel page "content/entries/blog"
    When I open "Launch day" from the index
    And I choose "Products" from the menu of the "Blog" crumb

  Scenario: No mail was sent to that address
    Fails with: No e-mail to nobody@example.org arrived in the mailbox
    When I ask for a password reset for "nobody-with-that-name"
    And I open the password reset link sent to "nobody@example.org"
