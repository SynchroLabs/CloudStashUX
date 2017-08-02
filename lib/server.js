var express = require('express');
var exphbs  = require('express-handlebars');

module.exports = function(config)
{
    var log = require('./../lib/logger').getLogger("server");

    var server = express();

    server.engine('handlebars', exphbs({defaultLayout: 'main'}));
    server.set('view engine', 'handlebars');

    server.get('/', function (req, res) 
    {
        res.render('home', { message: "Hello World" });
    });

    server.use('/public', express.static('public'))

    return server;
}
