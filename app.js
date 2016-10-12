var fs = require('fs');
var path = require('path');
var express = require('express');
var app = express();
var favicon = require('serve-favicon');
var logger = require('morgan');

// import all the resources
var index = require('./routes/index');
var maps = require('./routes/maps');
var text = require('./routes/text');

// Hogan view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hjs');

app.use(express.static(path.join(__dirname, 'public')));
app.use(
    favicon(
        path.join(
            __dirname, 
            'public', 
            'lib', 
            'Skeleton-2.0.4', 
            'images', 
            'favicon.png'
        )
    )
);

/*
The order of which middleware are "defined" using app.use() is very important, they are invoked sequentially, thus this defines middleware precedence. For example usually express.logger() is the very first middleware you would use, logging every request EXCEPT static files
*/

// output the web log based on running environment
if (app.get('env') === 'production') {
    
    // http://stackoverflow.com/questions/23494956/how-to-use-morgan-logger#23600596
    // in production, write the log to a file
    var access_log = fs.createWriteStream(
        path.join(__dirname, 'logs', 'access.log'),
        
        // append mode
        {flags: 'a'}
    );
    
    app.use(
        logger(
            
            // common log format
            'common', 
            {
                
                // no need to write successful responses
                // log only the errors
                skip: function(req, res) {
                    return res.statusCode < 400
                }, 
                
                stream: access_log
            }
        )
    );
}
else {
    
    // in development mode, log to STDOUT
    app.use(logger('dev'));
}

app.use(function(req, res, next) {
    res.header('Access-Control-Allow-Origin', '*');
    res.header(
        'Access-Control-Allow-Headers', 
        'Origin, X-Requested-With, Content-Type, Accept'
    );
    next();
});

// Assign the resources to the routes
app.use('/', index);
app.use('/index', index);
app.use('/maps', maps);
app.use('/text', text);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
    app.use(function(err, req, res, next) {
        res.status(err.status || 500);
        res.render('main', {
            message: err.message,
            error: err,
            partials : {content : 'partials/error'}
        });
    });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('main', {
        message: err.message,
        error: {},
        partials : {content : 'partials/error'}
    });
});

module.exports = app;
