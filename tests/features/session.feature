@session
Feature: The control panel session
  As somebody with an account
  I want to log in to and out of the control panel
  So that only the right people manage the content

  @critical
  Scenario: An admin logs in and out
    Given I am logged in to the control panel as "admin"
    Then I should be logged in to the control panel as "admin"
    And the control panel heading should be "Dashboard"
    And the control panel system name should be "Webship Test Site"
    When I log out of the control panel
    Then I should not be logged in to the control panel
    And I should see the control panel login form

  Scenario: A wrong password is refused
    When I log in to the control panel with the username "admin" and the password "not-the-password"
    Then I should see the login error "Invalid username or password."
    And I should not be logged in to the control panel

  Scenario: An account without access to the control panel is refused
    When I log in to the control panel with the username "member" and the password "Member123456789!"
    Then I should see the login error "You cannot access the control panel with that account."

  Scenario: Logging in as somebody else replaces the session
    Given I am logged in to the control panel as "editor"
    When I log in to the control panel as "author"
    Then I should be logged in to the control panel as "author"

  Scenario: A visitor is sent to the login form
    Given I am an anonymous user
    When I go to "/admin/content/entries"
    Then I should see the control panel login form
