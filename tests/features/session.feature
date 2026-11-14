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

  Scenario: A username nobody has is refused the same way
    When I log in to the control panel with the username "nobody-with-that-name" and the password "not-the-password"
    Then I should see the login error "Invalid username or password."

  Scenario: The email address logs in too
    When I log in to the control panel with the username "admin@example.com" and the password "Admin123456789!"
    Then I should be logged in to the control panel as "admin"

  Scenario: A visitor is sent to the login form
    Given I am an anonymous user
    When I go to "/admin/content/entries"
    Then I should see the control panel login form

  Scenario: A password that is too short never reaches the server
    When I log in to the control panel with the username "admin" and the password "short"
    Then I should see the login error "Password should contain at least 6 characters."
    And I should see the control panel login form

  Scenario: The login form confirms a password reset whoever asks
    When I ask for a password reset for "nobody-with-that-name"
    Then I should see the password reset confirmation
    And I should see "Check your email for instructions to reset your password."

  Scenario: An account resets its password through the mail
    When I ask for a password reset for "admin"
    Then I should see the password reset confirmation
    When I open the password reset link sent to "admin@example.com"
    Then I should see "Choose a new password"
    When I choose the new password "abc"
    Then I should see the new password error "should contain at least 6 characters"
    When I choose the new password of "admin"
    Then I should see the control panel login form
    When I log in to the control panel as "admin"
    Then I should be logged in to the control panel as "admin"
