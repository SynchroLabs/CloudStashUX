// dropbox/src/get-base-url.js
//
// This file overwrites the default file from the Dropbox API in order to make
// it work with the provider at CloudStash.net.
//
function getBaseURL(host) {
  //return 'https://' + host + '.dropboxapi.com/2/';
  return 'https://api.cloudstash.net/2/';
}

module.exports = getBaseURL;
