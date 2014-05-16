# Pryv Browser

The Pryv web app, featuring @glance view.


## Setting up the development environment

`./scripts/setup-environment-dev.sh`


## Building

- `grunt` for dev
- `grunt staging` for staging
- `grunt production` for production

Build output goes to `./dist`


## Running the dev build locally

Requires a working copy of our [dev tools repo](https://github.com/pryv/dev-tools).

1. Start the dev web server, pointing it to your built app (in `./dist`), for example: `node ../dev-tools/web-server/source/server.js --staticRootPath ./dist`
2. Open `https://{username}.rec.la`, where `{username}` points to an existing staging user
