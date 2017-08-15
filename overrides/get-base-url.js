// dropbox/src/get-base-url.js
//
// This file overwrites the default file from the Dropbox API in order to make it work
// with the provider at the destination of your choice.
//
function getBaseURL(host) {
  // return 'https://api.cloudstash.net/2/';
  // return 'http://localhost:1338/2/';
  return 'https://' + host + '.dropboxapi.com/2/';
}

module.exports = getBaseURL;
