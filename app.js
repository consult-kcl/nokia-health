// Imports
var express = require('express');
var session = require('express-session')
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var request = require('request');
var auth = require('basic-auth');

// Environment variables
require('dotenv').config()

// Models
var models = require('./models');

// Libs
const config = require('./lib/config');
const QueueMessage = require('./lib/queueMessage');

// Express app
var app = express();
var router = express.Router();

// Session
var session = require('express-session');
app.use(session({
  resave: true,
  saveUninitialized: true,
  secret: "secret"
}));

// Views
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

// Default use
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

///////////////////////////

// Routes
var register = require('./routes/register');
var connect = require('./routes/connect');
var dashboard = require('./routes/dashboard');
var notify = require('./routes/notify');
var simulate = require('./routes/simulate');

// Route setup involving async
function init() {

  if ( config.MESSAGE_QUEUE == true ) {

    var amqp = require('amqplib');
    var QueueMessage = require('./lib/queueMessage');

    // Return AMQP connect Promise from init.
    return amqp.connect('amqp://localhost').then(function(connection) {

      router.use('/simulate', simulate(new QueueMessage(connection, "device-integration_nokia-sensor-fhir-mapper")));

    }).catch(console.warn);

    // .finally(function() { conn.close(); });

  } else {

    var HTTPMessage = require('./lib/httpMessage');
    router.use('/simulate', simulate(new HTTPMessage()));
    return Promise.resolve();

  }

}

// Non-async route setup

router.use('/connect', connect)
router.use('/notify', notify)

router.use('/', function(req, res, next) {

  var credentials = auth(req)

  if ( !credentials || credentials.name !== config.USERNAME || credentials.pass !== config.PASSWORD ) {

    res.status(401);
    res.header('WWW-Authenticate', 'Basic realm="forbidden"');
    res.send('Access denied');

  } else {

    next();

  }

});

router.use('/register', register)
router.use('/dashboard', dashboard)


app.use('/nokia', router)

///////////////////////////

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

// Start app once async init done.
init()
    .then(() => app.listen(3000))
    .catch(err=>console.error(err));

module.exports = app;
