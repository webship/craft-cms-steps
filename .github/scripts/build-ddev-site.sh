#!/usr/bin/env bash
# Builds the site the suite runs against: the current stable Craft CMS 5 in a
# DDEV project, installed non-interactively the documented way, with the
# CKEditor plugin, the content model and the content of
# site/seed.php, and the Twig templates of site/templates.
#
# Settings (environment variables, all optional):
#   PROJECT_NAME     the DDEV project name             (default craftcmssteps)
#   SITE_DIR         the project folder                (default a new temporary folder)
#   CMS_VERSION      a composer constraint for craftcms/cms (default: what the starter project asks for, ^5)
#   ADMIN_USER, ADMIN_PASSWORD   the admin account     (default admin / Admin123456789!)
# The account is configuration: the installer creates it and cucumber.js names
# it; the features never create or delete users.
#
# The site stays on the free edition it is installed with (Solo). No licence is
# entered, no paid edition is switched on, not even as a trial, and nothing
# signs in anywhere.
set -euo pipefail

PROJECT_NAME="${PROJECT_NAME:-craftcmssteps}"
ADMIN_USER="${ADMIN_USER:-admin}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:-Admin123456789!}"
REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
SITE_DIR="${SITE_DIR:-$(mktemp -d)}"

mkdir -p "$SITE_DIR"
cd "$SITE_DIR"

ddev config --project-type=craftcms --docroot=web --project-name="$PROJECT_NAME"
ddev start

# The starter project. Its post-create script opens the interactive installer,
# so the scripts are skipped and their three steps are done here.
ddev composer create-project craftcms/craft --no-scripts
cp .env.example.dev .env
rm composer.json
mv composer.json.default composer.json
if [ -n "${CMS_VERSION:-}" ]; then
  ddev composer require "craftcms/cms:${CMS_VERSION}" --no-interaction --with-all-dependencies
fi

SITE_URL="$(ddev describe -j | python3 -c "import json,sys; print(json.load(sys.stdin)['raw']['primary_url'])")"

# A test site behaves like a live one: errors render the 404 template, not the
# developer's exception page.
sed -i 's/^CRAFT_DEV_MODE=.*/CRAFT_DEV_MODE=false/' .env

ddev craft setup/keys
ddev craft install/craft --interactive=0 \
  --username="$ADMIN_USER" --password="$ADMIN_PASSWORD" --email="$ADMIN_USER@example.com" \
  --site-name="Webship Test Site" --site-url="$SITE_URL" --language=en-US

# The rich text field is a first-party plugin.
ddev composer require craftcms/ckeditor --no-interaction
ddev craft plugin/install ckeditor

cp -r "$REPO_DIR/site/templates/." templates/
cp "$REPO_DIR/site/seed.php" seed.php
ddev exec php seed.php

if [ -n "${GITHUB_ENV:-}" ]; then
  echo "LAUNCH_URL=$SITE_URL" >> "$GITHUB_ENV"
fi
CMS_INSTALLED="$(ddev composer show craftcms/cms 2>/dev/null | awk '/^versions/ {print $NF}')"
echo "Built Craft CMS ${CMS_INSTALLED:-(unknown version)} at $SITE_URL"
