var cloudStashWebServer = require('./lib/server');
var cloudStashWebConfig = require('./lib/config');
var pkg = require('./package.json');

// Process command line params
//
var commander = require('commander');
commander.version(pkg.version);
commander.option('-p, --port <n>', 'The port on which the CloudStash server will listen', parseInt);
commander.option('-c, --config <value>', 'Use the specified configuration file');
commander.parse(process.argv);

var overrides = {};

if (commander.port)
{
    overrides.PORT = commander.port;
}

var config = cloudStashWebConfig.getConfig(commander.config, overrides);

var loggerModule = require('./lib/logger');
loggerModule.createMainLogger(config);

var log = loggerModule.getLogger("app");

log.info("CloudStashWeb server v%s loading - %s", pkg.version, config.configDetails);

global.g_dropboxApiEndpoint = config.get('DROPBOX_API_ENDPOINT')

var server = cloudStashWebServer(config);

server.listen(config.get('PORT'), function (err) 
{
    if (err)
    {
        log.error("CloudStashWeb server failed in listen()", err);
    }
    else
    {
        log.info('CloudStashWeb listening on port:', this.address().port);
    }
});

server.on('error', function(err)
{
    if (err.code === 'EACCES')
    {
        log.error("PORT specified (%d) already in use", config.get('PORT'));
    }
    else
    {
        log.error("CloudStashWeb server error:", err);
    }
});

process.on('SIGTERM', function ()
{
    log.info('SIGTERM - preparing to exit.');
    process.exit();
});

process.on('SIGINT', function ()
{
    log.info('SIGINT - preparing to exit.');
    process.exit();
});

process.on('exit', function (code)
{
    log.info('Process exiting with code:', code);
});
