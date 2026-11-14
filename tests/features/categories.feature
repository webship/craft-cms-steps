@categories
Feature: Categories
  As an editor
  I want to manage the topics that group the articles
  So that visitors browse the blog by topic

  Background:
    Given I am logged in to the control panel as "admin"

  @critical
  Scenario: The categories index lists the topics
    When I go to the control panel page "categories"
    Then the control panel heading should be "Categories"
    And the "Topics" source of the index should be selected
    And the index should hold 3 items
    And "Product" should have the status "Enabled" in the index
    And "Product" should come before "Engineering" in the index

  Scenario: The form of a category has its own fields
    When I go to the control panel page "categories"
    And I open "Product" from the index
    Then the control panel breadcrumb should be "Categories > Topics > Product"
    And the edit form should have the "Title" field
    And the edit form should have the "Parent" field
    And the edit form should not have the "Summary" field
    And the edit form should show the status "Enabled"

  Scenario: Create a category, find it on the site and delete it
    Given there is no category titled "A topic the suite made"
    When I start a new category in the "Topics" group
    And I fill in the "Title" field with "A topic the suite made"
    And I save the edit form
    Then I should see the success notification "Category created."
    And I should see "A topic the suite made" in the index
    And "topics/a-topic-the-suite-made" should be published on the site
    When I visit the page of "A topic the suite made" from the index
    Then I should see "A topic the suite made"
    And I should see "No articles in this topic."
    And there is no category titled "A topic the suite made"
    And "topics/a-topic-the-suite-made" should not be published on the site

  Scenario: A topic page lists its articles
    When I go to "/topics/community"
    Then I should see "Community meetup recap"
    And I should see "Thanks to our contributors"
    And I should not see "Launch day"
