# CloudStashUX
Node.js web-based UX for Dropbox or compatible file storage solutions

## Configuration

Configuration is typically via a config.json file containing some the following:

PORT - The port that this server will run on (default: 80)
REDIRECT_URL - Where OAuth responses should return, for localhost running on 1337 would be "http://localhost:1337/auth"

DROPBOX_API_ENDPOINT - Alternate Dropbox API endpoing, for example: "https://api.cloudstash.net/2/"
OAUTH_BASE - OAuth endpoint for alternate Dropbox API, for example: "https://api.cloudstash.net/oauth2/"

CLIENT_ID - Dropbox client ID (sometimes called app ID)
CLIENT_SECRET - Dropbox client secret

If SSL is desired, specify either key/cert values via SSL_KEY and SSL_CERT or specify key/cert files via SSL_CERT_PATH and SSL_KEY_PATH.

## Running CloudStashUX

You will need to do a build before running CloudStashUX.  You build CloudStashUX by doing:

    npm run build

## Modifying the Dropbox API

If you make a change to overrides/get-base-url.js and you want to generate a new Dropbox-sdk.min.js, you will need to build the Dropbox API package:

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
