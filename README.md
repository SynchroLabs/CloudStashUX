# CloudStashUX
Node.js web-based UX for Dropbox or compatible file storage solutions

To make CloudStash UX point at a backend other than Dropbox, edit the file overrides/get-base-url.js
before doing a build.

You will need to do a build before running CloudStashUX even if you do not override the backend.  You
build CloudStashUX by doing:

    npm run build

In order to build, you will have to:

1. Installed webpack globally

    sudo npm install webpack -g

1. From the node_modules/dropbox directory, install the dev dependencies for that package by doing:

    npm install

1. Download the webpack config files from the Dropbox Javascript API GitHub repo - https://github.com/dropbox/dropbox-sdk-js

    webpack-umd.config.js
    webpack.config.js

1. Edit overrides/get-base-url.js (optional)

1. Build CloudStashUX

    npm run build

This will create the file: public/Dropbox-sdk.min.js
