<?php
/**
 * Seeds the content model, the accounts and the content the test suite runs
 * against. Run once on a fresh install, from the project root, inside the web
 * container:
 *
 *   php seed.php
 *
 * It goes through the platform's own services, so the result is the same as a
 * site built by hand in the control panel, and the project config YAML is
 * written as usual. Running it again on a seeded site does nothing.
 *
 * Passwords come from the environment (EDITOR_PASSWORD, AUTHOR_PASSWORD,
 * MEMBER_PASSWORD), with the defaults of cucumber.js.
 */

use craft\elements\Asset;
use craft\elements\Category;
use craft\elements\Entry;
use craft\elements\Tag;
use craft\elements\User;
use craft\enums\CmsEdition;
use craft\fieldlayoutelements\CustomField;
use craft\fieldlayoutelements\entries\EntryTitleField;
use craft\fields\Assets as AssetsField;
use craft\fields\Categories as CategoriesField;
use craft\fields\Date as DateField;
use craft\fields\Dropdown;
use craft\fields\Entries as EntriesField;
use craft\fields\Lightswitch;
use craft\fields\Matrix;
use craft\fields\PlainText;
use craft\fields\Tags as TagsField;
use craft\fs\Local;
use craft\models\CategoryGroup;
use craft\models\CategoryGroup_SiteSettings;
use craft\models\EntryType;
use craft\models\FieldLayout;
use craft\models\FieldLayoutTab;
use craft\models\Section;
use craft\models\Section_SiteSettings;
use craft\models\TagGroup;
use craft\models\UserGroup;
use craft\models\Volume;

require __DIR__ . '/bootstrap.php';
/** @var craft\console\Application $app */
$app = require CRAFT_VENDOR_PATH . '/craftcms/cms/bootstrap/console.php';

function fail(string $what, $model = null): void
{
    $errors = $model && method_exists($model, 'getErrors') ? json_encode($model->getErrors()) : '';
    fwrite(STDERR, "Seed failed: $what $errors\n");
    exit(1);
}

function say(string $line): void
{
    echo $line . "\n";
}

if (Craft::$app->getEntries()->getSectionByHandle('blog')) {
    say('The site is already seeded.');
    exit(0);
}

// User groups and permissions need the Pro edition, which runs as a free trial
// on a local development domain. No licence is entered.
Craft::$app->setEdition(CmsEdition::Pro);
// One time zone everywhere, so dates read the same on every machine.
Craft::$app->getProjectConfig()->set('system.timeZone', 'UTC');
date_default_timezone_set('UTC');

$siteId = Craft::$app->getSites()->getPrimarySite()->id;
$admin = User::find()->admin()->status(null)->orderBy('id')->one();
$fields = Craft::$app->getFields();
$entries = Craft::$app->getEntries();

function field(string $type, string $handle, string $name, array $settings = [])
{
    $fields = Craft::$app->getFields();
    $field = $fields->createField(['type' => $type, 'handle' => $handle, 'name' => $name] + $settings);
    if (!$fields->saveField($field)) {
        fail("field $handle", $field);
    }
    return $field;
}

function layout(string $elementType, array $tabs): FieldLayout
{
    $layout = new FieldLayout(['type' => $elementType]);
    $layoutTabs = [];
    foreach ($tabs as $name => $elements) {
        $tab = new FieldLayoutTab(['layout' => $layout, 'name' => $name]);
        $tab->setElements($elements);
        $layoutTabs[] = $tab;
    }
    $layout->setTabs($layoutTabs);
    return $layout;
}

function entryType(string $name, string $handle, array $tabs, array $config = []): EntryType
{
    $type = new EntryType(['name' => $name, 'handle' => $handle] + $config);
    $type->setFieldLayout(layout(Entry::class, $tabs));
    if (!Craft::$app->getEntries()->saveEntryType($type)) {
        fail("entry type $handle", $type);
    }
    return $type;
}

function section(string $name, string $handle, string $type, array $entryTypes, ?string $uriFormat, ?string $template, array $config = []): Section
{
    $siteId = Craft::$app->getSites()->getPrimarySite()->id;
    $section = new Section(['name' => $name, 'handle' => $handle, 'type' => $type, 'enableVersioning' => true] + $config);
    $section->setSiteSettings([$siteId => new Section_SiteSettings([
        'siteId' => $siteId,
        'enabledByDefault' => true,
        'hasUrls' => $uriFormat !== null,
        'uriFormat' => $uriFormat,
        'template' => $template,
    ])]);
    $section->setEntryTypes($entryTypes);
    if (!Craft::$app->getEntries()->saveSection($section)) {
        fail("section $handle", $section);
    }
    return $section;
}

function entry(Section $section, EntryType $type, string $title, array $values = [], array $config = []): Entry
{
    global $admin;
    $parentId = $config['parentId'] ?? null;
    unset($config['parentId']);
    $entry = new Entry($config + ['sectionId' => $section->id, 'typeId' => $type->id, 'authorId' => $admin->id, 'title' => $title]);
    if ($parentId) {
        $entry->setParentId($parentId);
    }
    $entry->setFieldValues($values);
    if (!Craft::$app->getElements()->saveElement($entry)) {
        fail("entry $title", $entry);
    }
    return $entry;
}

// ---------------------------------------------------------------------------
// Assets: a local filesystem and one volume.
// ---------------------------------------------------------------------------
$fs = new Local(['name' => 'Uploads', 'handle' => 'uploads', 'hasUrls' => true, 'url' => '@web/uploads', 'path' => '@webroot/uploads']);
Craft::$app->getFs()->saveFilesystem($fs) || fail('filesystem', $fs);
$volume = new Volume(['name' => 'Images', 'handle' => 'images']);
$volume->setFsHandle('uploads');
Craft::$app->getVolumes()->saveVolume($volume) || fail('volume', $volume);

// ---------------------------------------------------------------------------
// Categories and tags.
// ---------------------------------------------------------------------------
$topics = new CategoryGroup(['name' => 'Topics', 'handle' => 'topics', 'maxLevels' => 2]);
$topics->setSiteSettings([$siteId => new CategoryGroup_SiteSettings(['siteId' => $siteId, 'hasUrls' => true, 'uriFormat' => 'topics/{slug}', 'template' => 'topics/_category'])]);
Craft::$app->getCategories()->saveGroup($topics) || fail('category group', $topics);
$tagGroup = new TagGroup(['name' => 'Keywords', 'handle' => 'keywords']);
Craft::$app->getTags()->saveTagGroup($tagGroup) || fail('tag group', $tagGroup);

// ---------------------------------------------------------------------------
// Fields, one of each common type.
// ---------------------------------------------------------------------------
$summary = field(PlainText::class, 'summary', 'Summary', ['multiline' => true, 'initialRows' => 2, 'charLimit' => 160, 'instructions' => 'One or two sentences shown in listings.']);
$subtitle = field(PlainText::class, 'subtitle', 'Subtitle');
$ckeditor = Craft::$app->getPlugins()->isPluginInstalled('ckeditor');
$body = $ckeditor
    ? field('craft\\ckeditor\\Field', 'body', 'Body')
    : field(PlainText::class, 'body', 'Body', ['multiline' => true, 'initialRows' => 6]);
$featured = field(Lightswitch::class, 'featured', 'Featured');
$kind = field(Dropdown::class, 'kind', 'Kind', ['options' => [
    ['label' => 'News', 'value' => 'news', 'default' => true],
    ['label' => 'Guide', 'value' => 'guide', 'default' => false],
    ['label' => 'Opinion', 'value' => 'opinion', 'default' => false],
]]);
$eventDate = field(DateField::class, 'eventDate', 'Event date', ['showDate' => true, 'showTime' => false]);
$heroImage = field(AssetsField::class, 'heroImage', 'Hero image', ['sources' => ['volume:' . $volume->uid], 'defaultUploadLocationSource' => 'volume:' . $volume->uid, 'defaultUploadLocationSubpath' => '', 'maxRelations' => 1, 'allowedKinds' => ['image'], 'restrictFiles' => true, 'viewMode' => 'large']);
$text = field(PlainText::class, 'text', 'Text', ['multiline' => true, 'initialRows' => 3]);
$heading = field(PlainText::class, 'heading', 'Heading');
$topicsField = field(CategoriesField::class, 'topics', 'Topics', ['source' => 'group:' . $topics->uid]);
$keywords = field(TagsField::class, 'keywords', 'Keywords', ['source' => 'taggroup:' . $tagGroup->uid]);

// ---------------------------------------------------------------------------
// Entry types and sections.
// ---------------------------------------------------------------------------
$textBlock = entryType('Text block', 'textBlock', ['Content' => [
    new CustomField($heading),
    new CustomField($text, ['required' => true]),
]], ['hasTitleField' => false, 'titleFormat' => '{heading ?: "Text block"}', 'showSlugField' => false, 'showStatusField' => false]);
$quoteBlock = entryType('Quote', 'quote', ['Content' => [
    new CustomField($text, ['required' => true]),
]], ['hasTitleField' => false, 'titleFormat' => 'Quote', 'showSlugField' => false, 'showStatusField' => false]);
$blocks = field(Matrix::class, 'blocks', 'Blocks', ['entryTypes' => [$textBlock, $quoteBlock], 'viewMode' => Matrix::VIEW_MODE_BLOCKS]);

$noteType = entryType('Note', 'note', ['Content' => [new EntryTitleField()]]);
$notes = section('Notes', 'notes', Section::TYPE_CHANNEL, [$noteType], null, null);

$pageType = entryType('Page', 'page', ['Content' => [
    new EntryTitleField(),
    new CustomField($subtitle),
    new CustomField($body),
]]);
$pages = section('Pages', 'pages', Section::TYPE_STRUCTURE, [$pageType], '{parent.uri}/{slug}', 'pages/_entry', ['maxLevels' => 2]);

$homeType = entryType('Home', 'home', ['Content' => [
    new EntryTitleField(),
    new CustomField($subtitle),
]]);
$home = section('Home', 'home', Section::TYPE_SINGLE, [$homeType], '__home__', 'index');

$related = field(EntriesField::class, 'relatedPages', 'Related pages', ['sources' => ['section:' . $pages->uid], 'maxRelations' => 3]);
$articleType = entryType('Article', 'article', [
    'Content' => [
        new EntryTitleField(),
        new CustomField($summary, ['required' => true]),
        new CustomField($body),
        new CustomField($blocks),
    ],
    'Details' => [
        new CustomField($featured),
        new CustomField($kind),
        new CustomField($eventDate),
        new CustomField($heroImage),
        new CustomField($related),
        new CustomField($topicsField),
        new CustomField($keywords),
    ],
]);
$blog = section('Blog', 'blog', Section::TYPE_CHANNEL, [$articleType], 'blog/{slug}', 'blog/_entry');

// ---------------------------------------------------------------------------
// User groups, permissions and the accounts of cucumber.js.
// ---------------------------------------------------------------------------
function group(string $name, string $handle, array $permissions): UserGroup
{
    $group = new UserGroup(['name' => $name, 'handle' => $handle]);
    Craft::$app->getUserGroups()->saveGroup($group) || fail("user group $handle", $group);
    Craft::$app->getUserPermissions()->saveGroupPermissions($group->id, $permissions);
    return $group;
}

function entryPermissions(Section $section, bool $peers): array
{
    $own = ['viewEntries', 'createEntries', 'saveEntries', 'deleteEntries'];
    $peer = ['viewPeerEntries', 'savePeerEntries', 'deletePeerEntries', 'viewPeerEntryDrafts', 'savePeerEntryDrafts', 'deletePeerEntryDrafts'];
    return array_map(fn($name) => "$name:{$section->uid}", $peers ? array_merge($own, $peer) : $own);
}

$assetPermissions = array_map(fn($name) => "$name:{$volume->uid}", ['viewAssets', 'saveAssets', 'deleteAssets', 'viewPeerAssets', 'savePeerAssets', 'deletePeerAssets', 'createFolders']);
$categoryPermissions = array_map(fn($name) => "$name:{$topics->uid}", ['viewCategories', 'saveCategories', 'deleteCategories']);

// Editors manage all content, assets and categories, but not users or settings.
$editors = group('Editors', 'editors', array_merge(
    ['accessCp'],
    entryPermissions($blog, true),
    entryPermissions($pages, true),
    entryPermissions($notes, true),
    entryPermissions($home, true),
    $assetPermissions,
    $categoryPermissions,
));
// Authors write their own Blog entries and see the Images volume, nothing else.
$authors = group('Authors', 'authors', array_merge(
    ['accessCp'],
    entryPermissions($blog, false),
    ["viewAssets:{$volume->uid}", "saveAssets:{$volume->uid}"],
));

function account(string $username, string $fullName, string $password, array $groups): User
{
    $user = new User(['username' => $username, 'email' => "$username@example.com", 'fullName' => $fullName, 'newPassword' => $password]);
    Craft::$app->getElements()->saveElement($user) || fail("user $username", $user);
    Craft::$app->getUsers()->activateUser($user);
    Craft::$app->getUsers()->assignUserToGroups($user->id, array_map(fn($group) => $group->id, $groups));
    return $user;
}

$editor = account('editor', 'Edith Editor', getenv('EDITOR_PASSWORD') ?: 'Editor123456789!', [$editors]);
$author = account('author', 'Arthur Author', getenv('AUTHOR_PASSWORD') ?: 'Author123456789!', [$authors]);
// A member has an account but no access to the control panel.
$member = account('member', 'Mia Member', getenv('MEMBER_PASSWORD') ?: 'Member123456789!', []);
$admin->fullName = 'Ada Admin';
Craft::$app->getElements()->saveElement($admin);

// ---------------------------------------------------------------------------
// Content.
// ---------------------------------------------------------------------------
$categories = [];
foreach (['Product', 'Engineering', 'Community'] as $title) {
    $category = new Category(['groupId' => $topics->id, 'title' => $title]);
    Craft::$app->getElements()->saveElement($category) || fail("category $title", $category);
    $categories[$title] = $category;
}
$tags = [];
foreach (['release', 'howto', 'events'] as $title) {
    $tag = new Tag(['groupId' => $tagGroup->id, 'title' => $title]);
    Craft::$app->getElements()->saveElement($tag) || fail("tag $title", $tag);
    $tags[$title] = $tag;
}

// Two images, drawn here so the build needs no binary fixtures.
$images = [];
foreach (['Harbour' => [30, 90, 160], 'Meadow' => [60, 140, 70]] as $title => $rgb) {
    $path = sys_get_temp_dir() . '/' . strtolower($title) . '.png';
    $image = imagecreatetruecolor(640, 360);
    imagefill($image, 0, 0, imagecolorallocate($image, ...$rgb));
    imagefilledrectangle($image, 40, 220, 600, 320, imagecolorallocate($image, 240, 240, 240));
    imagepng($image, $path);
    $asset = new Asset();
    $asset->tempFilePath = $path;
    $asset->setFilename(strtolower($title) . '.png');
    $asset->newFolderId = Craft::$app->getAssets()->getRootFolderByVolumeId($volume->id)->id;
    $asset->setVolumeId($volume->id);
    $asset->title = $title;
    $asset->alt = "$title placeholder image";
    $asset->uploaderId = $admin->id;
    $asset->avoidFilenameConflicts = true;
    $asset->setScenario(Asset::SCENARIO_CREATE);
    Craft::$app->getElements()->saveElement($asset) || fail("asset $title", $asset);
    $images[$title] = $asset;
}

$homeEntry = Entry::find()->section('home')->status(null)->one();
$homeEntry->title = 'Welcome to the test site';
$homeEntry->setFieldValues(['subtitle' => 'A small site for the step definitions.']);
Craft::$app->getElements()->saveElement($homeEntry) || fail('home entry', $homeEntry);

$about = entry($pages, $pageType, 'About', ['subtitle' => 'Who we are', 'body' => '<p>We build and test websites.</p>'], ['slug' => 'about']);
$team = entry($pages, $pageType, 'Team', ['subtitle' => 'The people', 'body' => '<p>A small team.</p>'], ['slug' => 'team', 'parentId' => $about->id]);
$contact = entry($pages, $pageType, 'Contact', ['subtitle' => 'Get in touch', 'body' => '<p>Write to us.</p>'], ['slug' => 'contact']);

$articles = [
    ['Launch day', 'news', true, 'Product', 'release', 'Harbour'],
    ['Writing good scenarios', 'guide', false, 'Engineering', 'howto', 'Meadow'],
    ['Why acceptance tests matter', 'opinion', false, 'Engineering', null, null],
    ['Community meetup recap', 'news', false, 'Community', 'events', null],
    ['Version two is here', 'news', true, 'Product', 'release', null],
    ['Testing forms step by step', 'guide', false, 'Engineering', 'howto', null],
    ['A year of releases', 'opinion', false, 'Product', null, null],
    ['How we review changes', 'guide', false, 'Engineering', 'howto', null],
    ['Spring conference notes', 'news', false, 'Community', 'events', null],
    ['Keeping suites fast', 'guide', false, 'Engineering', 'howto', null],
    ['Roadmap update', 'news', false, 'Product', null, null],
    ['Thanks to our contributors', 'opinion', false, 'Community', null, null],
];
foreach ($articles as $index => [$title, $kindValue, $isFeatured, $topic, $tag, $image]) {
    entry($blog, $articleType, $title, [
        'summary' => "$title: a short summary for the listing.",
        'body' => "<p>The full text of “{$title}”.</p>",
        'featured' => $isFeatured,
        'kind' => $kindValue,
        'eventDate' => $index === 0 ? new DateTime('2026-03-15') : null,
        'heroImage' => $image ? [$images[$image]->id] : [],
        'relatedPages' => $index === 0 ? [$about->id] : [],
        'topics' => [$categories[$topic]->id],
        'keywords' => $tag ? [$tags[$tag]->id] : [],
        'blocks' => $index === 0 ? [
            'new1' => ['type' => 'textBlock', 'fields' => ['heading' => 'What is new', 'text' => 'Everything.']],
            'new2' => ['type' => 'quote', 'fields' => ['text' => 'It just works.']],
        ] : [],
    ], [
        // Newest first: "Launch day" is the most recent article.
        'postDate' => (new DateTime('2026-01-31 09:00:00'))->modify("-$index day"),
    ]);
}
// One article of the author's own, one disabled article, and one draft.
entry($blog, $articleType, 'Notes from the author', ['summary' => 'Written by the author account.', 'kind' => 'opinion', 'topics' => [$categories['Community']->id]], ['authorId' => $author->id, 'postDate' => new DateTime('2026-01-10 09:00:00')]);
entry($blog, $articleType, 'Unfinished thoughts', ['summary' => 'Not ready for visitors.', 'kind' => 'opinion'], ['enabled' => false, 'postDate' => new DateTime('2026-01-05 09:00:00')]);

// 120 notes without URLs, for the pagination and the bulk actions of the element index.
for ($number = 1; $number <= 120; $number++) {
    entry($notes, $noteType, sprintf('Note %03d', $number), [], ['postDate' => (new DateTime('2025-06-01 08:00:00'))->modify("+$number hour")]);
}

Craft::$app->getQueue()->run();
// A console command writes the project config when it ends; this script is not one, so it does it itself.
Craft::$app->getProjectConfig()->saveModifiedConfigData();
say('Seeded: sections Blog, Pages, Home, Notes; volume Images; categories, tags, groups Editors and Authors; accounts editor, author, member.');
