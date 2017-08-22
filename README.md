# CloudStashWeb

Node.js web-based user interface for Dropbox or compatible file storage solutions

## Overview

CloudStashWeb uses the Dropbox JavaScript API to access Dropbox or compatible file storage solutions (such as CloudStash).  CloudStashWeb uses the Dropbox API from both Node.js on the server and from the browser.  It is indended in part to demonstrate how to build a real world Dropbox app in JavaScript in either a Node.js or client/browser environment.

## Configuration

Configuration is typically via a config.json file containing some the following:

* PORT - The port that this server will run on (default: 80)
* REDIRECT_URL - Where OAuth responses should return, for localhost running on 1337 would be "http://localhost:1337/auth"

* CLIENT_ID - Dropbox client ID (sometimes called app ID)
* CLIENT_SECRET - Dropbox client secret

* DROPBOX_API_ENDPOINT - Alternate Dropbox API endpoing, for example: "https://api.cloudstash.net/2/"
* OAUTH_BASE - OAuth endpoint for alternate Dropbox API, for example: "https://api.cloudstash.net/oauth2/"

If SSL is desired, specify either key/cert values via SSL_KEY and SSL_CERT or specify key/cert files via SSL_CERT_PATH and SSL_KEY_PATH.

## Running CloudStashWeb

First you will need to install the required modules:

    npm install

Then you will need to do a build:

    npm run build

And to run, just do:

    node app.js

## Modifying the Dropbox API

If you make a change to overrides/get-base-url.js (or it you add any additional overrides) and you want to generate a new Dropbox-sdk.min.js, you will need to build the Dropbox API package:

1. Installed webpack globally

    sudo npm install webpack -g

1. From the node_modules/dropbox directory, install the dev dependencies for that package by doing:

    npm install

1. Download the webpack config files from the Dropbox Javascript API GitHub repo - https://github.com/dropbox/dropbox-sdk-js

    webpack-umd.config.js
    webpack.config.js

1. Edit overrides/get-base-url.js as desired

1. Build the Dropbox API and update the local Dropbox script file

    npm run build-dropbox

This will update the file: public/Dropbox-sdk.min.js with the new version of overrides/get-base-url.js
