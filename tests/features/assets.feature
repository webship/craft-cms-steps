@assets
Feature: Assets
  As an editor
  I want to upload files and use them in entries
  So that articles carry their images

  Background:
    Given I am logged in to the control panel as "editor"

  @critical
  Scenario: The assets index lists the files of a volume
    When I go to the control panel page "assets"
    Then the control panel heading should be "Assets"
    And the "Images" source of the index should be selected
    And the index should hold 2 items
    And I should see "Harbour" in the index
    And "Harbour" should show "harbour.png" in the "Filename" column of the index
    And "Harbour" should show a thumbnail in the index
    And "Meadow" should show a thumbnail in the index

  Scenario: Upload a file to the assets index and delete it
    Given there is no asset titled "Pixel"
    When I go to the control panel page "assets"
    And I open the "Images" source of the index
    And I upload the file "tests/fixtures/pixel.png" to the assets index
    Then I should see "Pixel" in the index
    And the index should hold 3 items
    And "Pixel" should show "pixel.png" in the "Filename" column of the index
    When I search the index for "pixel"
    Then the index should hold 1 item
    When I select "Pixel" in the index
    And I choose "Delete" for the selected items of the index
    Then I should see the notification "Asset deleted."
    When I clear the search of the index
    Then the index should hold 2 items
    And there is no asset titled "Pixel"

  Scenario: Upload a file straight into a field
    Given there is no asset titled "Pixel"
    When I go to the control panel page "content/entries/blog"
    And I open "Roadmap update" from the index
    And I upload the file "tests/fixtures/pixel.png" to the "Hero image" field
    Then the "Hero image" field should hold "Pixel"
    When I discard the unsaved changes
    Then the "Hero image" field should not hold "Pixel"
    And there is no asset titled "Pixel"

  Scenario: An author may upload but sees no action to delete
    Given I log in to the control panel as "author"
    When I go to the control panel page "assets"
    Then I should see the "Images" source in the index
    And the index should hold 0 items
