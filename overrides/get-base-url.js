// dropbox/src/get-base-url.js
//
// This file overwrites the default file from the Dropbox API in order to make it work
// with the provider at the destination of your choice.
//
function getBaseURL(host) {
  if (g_dropboxApiEndpoint) {
    // Return custom Dropbox API endpoint
    return g_dropboxApiEndpoint
  } else {
    // Default Dropbox behavior
    return 'https://' + host + '.dropboxapi.com/2/';
  }
}

module.exports = getBaseURL;
