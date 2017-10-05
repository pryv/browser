# Pryv for the web a.k.a. ‘the browser’

The Pryv web app, featuring the dashboard view.

![Pryv Browser screenshot](resources/screenshot.png)

## Usage

Normally exposed on the internet as `https://{username}.{domain}` 

A domain and user agnostic version is published on github gh-pages. It can be accessed with:   
`https://pryv.github.io/app-web/?username={username}&domain={domain}`   
for example:   
`https://pryv.github.io/app-web/?username=christine&domain=pryv.me`


## Contributing

*Prerequisites:* Node 0.10+ with associated Npm

### Setting up the development environment

`scripts/setup-environment-dev.sh`

Downloads Node dependencies and clones the repository's staging branch in `./dist`


### Building

- `npm run build-dev` for dev
- `npm run build-production` for production
- `npm run build-ghpages` for gh-pages

Build output goes to `./dist`


### Running the dev build locally

We use rec-la server [https://github.com/pryv/rec-la](https://github.com/pryv/rec-la).

1. Start the dev web server, pointing it to your built app (in `./dist`), `npm run webserver`
2. Open `https://{username}.rec.la:4443/?domain={domain.tld}`, where `{username}` points to an existing staging user and `{domain.tld}` to the domain running pryv. Ex.: [https://testuser.rec.la:4443/?domain=pryv.me](https://testuser.rec.la:4443/?domain=pryv.me)

example: `https://dummy.rec.la:4443/?domain=pryv.me`



## License

[Revised BSD license](https://github.com/pryv/documents/blob/master/license-bsd-revised.md)
