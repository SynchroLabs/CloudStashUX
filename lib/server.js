var express = require('express');
var exphbs  = require('express-handlebars');
var cookieParser = require('cookie-parser');
var request = require('request');
var http = require('http');
var https = require('https');
var path = require('path');
var fs = require('fs');

// !!! To make the Dropbox API work with a different domain, we need to replace the getBaseUrl function
//     in ../node_modules/dropbox/src/get-base-url
//
var Dropbox = require('dropbox');

// Config needs to contain CLIENT_ID, CLIENT_SECRET, and REDIRECT_URL.  It may also contain OAUTH_BASE to auth to 
// service other than Dropbox.
//
module.exports = function(config)
{
    var log = require('./../lib/logger').getLogger("server");

    log.info("Dropbox:", Dropbox);

    // SSL support
    //
    // For raw key/cert, use SSL_KEY and SSL_CERT.  To refer to key and/or cert files, use SSL_KEY_PATH and SSL_CERT_PATH.
    //
    // Note: It will generally be the case that SSL is terminated upstream from this server.  When an upstream proxy terminates SSL, it
    //       should add an "x-arr-ssl" header to the request to indicate to this server that the connection was secure (arr is for Application
    //       Request Routing).  The upstream proxy that terminates SSL should also either deny non-SSL requests or ensure that the "x-arr-ssl" 
    //       request header is not present on non-SSL requests.  Microsoft Azure terminates SSL and adds this header automatically.
    //
    // Note: This server will serve HTTP *OR* HTTPS, but not both.  This is by design.  HTTP should only be used for local development, or
    //       in production when SSL is terminated upstream.  There is no use case where serving both HTTP and HTTPS would be appropriate.
    //
    var sslOptions = { key: config.get("SSL_KEY"), cert: config.get("SSL_CERT") };

    if (!sslOptions.key)
    {
        var keyPath = config.get("SSL_KEY_PATH");
        if (keyPath)
        {
            sslOptions.key = fs.readFileSync(keyPath);
        }
    }

    if (!sslOptions.cert)
    {
        var certPath = config.get("SSL_CERT_PATH");
        if (certPath)
        {
            sslOptions.cert = fs.readFileSync(certPath);
        }
    }

    if (!sslOptions.key || !sslOptions.cert)
    {
        sslOptions = null;
    }

    var app = express();

    app.use(cookieParser("cookie_secret_420"));

    app.engine('handlebars', exphbs({defaultLayout: 'main'}));
    app.set('view engine', 'handlebars');

    app.get('/auth', function(req, res)
    {
        log.info("Auth callback from OAuth:", req.query);

        var form =
        {
            code: req.query.code,                       // required The code acquired by directing users to /oauth2/authorize?response_type=code.
            grant_type: "authorization_code",           // required The grant type, which must be authorization_code.
            client_id: config.get('CLIENT_ID'),         // If credentials are passed in POST parameters, this parameter should be present and should be the app's key (found in the App Console).
            client_secret: config.get('CLIENT_SECRET'), // If credentials are passed in POST parameters, this parameter should be present and should be the app's secret.
            redirect_uri: config.get('REDIRECT_URL')    // Only used to validate that it matches the original /oauth2/authorize, not used to redirect again.
        }

        request.post({ url: config.get('OAUTH_BASE') + "token", form: form }, function (e, r, body)
        {
            if (e || r.statusCode !== 200)
            {
                log.error("Error getting token from code:", e, r.statusCode);
                res.status(500).send('Error getting token from code');
            }
            else
            {
                var tokenResponse = JSON.parse(body);

                // The token response body should look like this:
                //
                // { 
                //     access_token: '<bunch of hex>',
                //     token_type: 'bearer',
                //     uid: '99999999',
                //     account_id: 'dbid:<bunch of hex with dashes>' 
                // }

                log.info("Got token response:", tokenResponse);

                var dbx = new Dropbox({ accessToken: tokenResponse.access_token });
                dbx.usersGetCurrentAccount()
                  .then(function(response) {
                    log.info("Got current account:", response);
                    res.cookie("dbx_access_token", tokenResponse.access_token, { signed: true });
                    res.cookie("dbx_user_email", response.email, { signed: true });
                    res.redirect('/');
                  })
                  .catch(function(error) {
                    log.error(error)
                  });
            }
        });
    });

    app.get('/login', function(req, res)
    {
        log.info("Logging in (redirecting to OAuth at provider)");

        // The Dropbox JS SDK doesn't support OAuth "code flow" directly, so we just build the auth endpoint URI the hard way...
        //
        var authUrl = config.get('OAUTH_BASE') + "authorize?response_type=code&client_id=" + config.get('CLIENT_ID') + "&redirect_uri=" + config.get('REDIRECT_URL');
        log.info("Auth url:", authUrl);
        res.redirect(authUrl);
    });

    app.get('/logout', function(req, res)
    {
        log.info("Clearing access token cookie");
        res.clearCookie("dbx_access_token", { signed: true });
        res.redirect('/');
    });

    app.use('/public', express.static('public'))

    app.get('/download', function (req, res) 
    {
        if (req.signedCookies && req.signedCookies.dbx_access_token)
        {
            var filepath = decodeURI(req.query.file);

            log.info("Download path:", filepath)

            var dbx = new Dropbox({ accessToken: req.signedCookies.dbx_access_token });
            dbx.filesDownload({path: filepath})
              .then(function(response) {
                res.writeHead(200, {
                  'Content-Type': 'application/octet-stream',
                  'Content-Disposition': 'attachment; filename=' + path.basename(filepath),
                  'Content-Length': response.size
                });
                res.end(response.fileBinary, 'binary');
              })
              .catch(function(error) {
                log.error(error);
              });
        }
        else
        {
            log.error("No access token");
        }
    });

    app.get('/', function (req, res) 
    {
        res.redirect('/home');
    })

    app.get('/search', function (req, res) 
    {
        if (req.signedCookies && req.signedCookies.dbx_access_token)
        {
            var query = decodeURI(req.query.query)

            log.info("Search, query:", query)

            var dbx = new Dropbox({ accessToken: req.signedCookies.dbx_access_token });
            dbx.filesSearch({ path: '/', query: query }).then(function(response) 
            {
                log.info("Got search response:", JSON.stringify(response))

                var matches = []
                if (response.matches)
                {
                    response.matches.forEach(function (match)
                    {
                        var entry = match.metadata
                        if (entry['.tag'] === 'folder')
                        {
                            entry.folder = true
                        }
                        entry.parent = entry.path_display.slice(0, - (entry.name.length + 1))
                        log.debug("Found match:", entry)
                        matches.push(entry)
                    })
                }

                var pathElements = [{ name: "Home", link: "/" }, { name: "Search Results" }];

                res.render('home', { 
                    dropboxApiEndpoint: g_dropboxApiEndpoint,
                    token: req.signedCookies.dbx_access_token, 
                    email: req.signedCookies.dbx_user_email, 
                    path: '/', 
                    pathElements: pathElements, 
                    entries: matches,
                    search: true
                });
            })
            .catch(function(error) 
            {
                log.error(error);
            })
        }
        else
        {
            log.error("No access token");
        }
    })

    app.get(['/home', '/home/*?'], function (req, res) 
    {
        if (req.signedCookies && req.signedCookies.dbx_access_token)
        {
            var dirpath = '/' + (req.params[0] || '');

            log.info("Path:", dirpath)

            var pathElements = dirpath.split('/');
            pathElements[0] = { name: "Home", link: "/home" };
            if ((pathElements.length > 1) && (pathElements[pathElements.length-1] === ''))
            {
                pathElements.pop();
            }
            if (pathElements.length > 1)
            {
                var currPath = "/home";
                for (var i = 1; i < pathElements.length; i++) 
                {
                    currPath += "/" + pathElements[i]
                    pathElements[i] = { name: pathElements[i], link: currPath };
                }
            }
            delete pathElements[pathElements.length-1].link;

            log.info("Path elements:", pathElements);

            if (dirpath === '/')
            {
                dirpath = '';
            }

            log.info("Access token present, doing Dropbox stuff");
            var dbx = new Dropbox({ accessToken: req.signedCookies.dbx_access_token });
            dbx.filesListFolder({path: dirpath}).then( function(response) 
            {
                log.info("List folder response:", response)
                response.entries.forEach(function(entry)
                {
                    if (entry['.tag'] === 'folder')
                    {
                        entry.folder = true;
                    }
                })
                log.info("api endpoint:", g_dropboxApiEndpoint)
                res.render('home', { 
                    dropboxApiEndpoint: g_dropboxApiEndpoint,
                    token: req.signedCookies.dbx_access_token, 
                    email: req.signedCookies.dbx_user_email, 
                    path: dirpath,
                    cursor: response.cursor, 
                    pathElements: pathElements, 
                    entries: response.entries,
                    folder: true
                });
              })
              .catch(function(error) {
                log.error(error);
              });
        }
        else
        {
            log.info("No access token");
            res.render('notconnected');
        }
    });

    var server;
    if (sslOptions)
    {
        server = https.createServer(sslOptions, app);
    }
    else
    {
        server = http.createServer(app);
    }

    return server;
}
