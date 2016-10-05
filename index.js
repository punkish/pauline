var fs = require('fs');
var path = require('path');

var Datastore = require('nedb');
var db = new Datastore();
var geonames = require('geonames-reader');
var dir_data = path.join(__dirname, 'data');

var express = require('express');
var app = express();
var bodyParser = require('body-parser');
var jsonParser = bodyParser.json();
var cookieParser = require('cookie-parser');

var Hogan = require('hogan.js');
var dir_views = path.join(__dirname, 'views');
var dir_layouts = path.join(__dirname, 'views', 'layouts');

var logger = require('morgan');
var favicon = require('serve-favicon');

var async = require('async');

var natural = require('natural');
var Tagger = natural.BrillPOSTagger;
var tokenizer = new natural.WordTokenizer();
var dir_tagger = path.join(__dirname, 'node_modules', 'natural', 'lib', 'natural', 'brill_pos_tagger');
var dir_english = path.join(dir_tagger, 'data', 'English');
var file_rules = path.join(dir_english, 'tr_from_posjs.txt');
var file_lexicon = path.join(dir_english, 'lexicon_from_posjs.json');
var default_category = 'N';

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'mustache');

/*
The order of which middleware are "defined" using app.use()
is very important, they are invoked sequentially, thus this
defines middleware precedence. For example usually
express.logger() is the very first middleware you would
use, logging every request EXCEPT static files
*/
app.use(function(req, res, next) {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    next();
});

// uncomment after placing your favicon in /public
app.use(favicon(path.join(__dirname, 'public', 'lib', 'Skeleton-2.0.4', 'images', 'favicon.png')));
//app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.get("/", function (req, res) {
    var data = {};

    // An incoming query is either for data (an API query) or for 
    // a web page. We can find out which based on request header.
    // 
    if (req.headers["content-type"] === "application/json;charset=UTF-8") {

        // Since the content-type requested is JSON, we send back JSON
        res.json(data);
    }


    // On the other hand, if the request header wants back HTML or XML, it is a
    // web request, so we format it as HTML, and then send the html back.
    // 
    else {

        var layout = Hogan.compile(
            fs.readFileSync(path.join(__dirname, "views", "layouts", "main.mustache"), "utf8")
        );
        
        var layout_data = {
        };

        var view = Hogan.compile(
            fs.readFileSync(path.join(__dirname, "views", "index.mustache"), "utf8")
        );
        
        var view_data = {};

        // combine resource-specific html with layout html
        var html = layout.render(layout_data, {"content" : view.render(view_data)});
        

        res.send(html);
    }
});

app.post('/text', jsonParser, function (req, res) {
    if (!req.body) return res.sendStatus(400);
    
    console.log('received "' + req.body.text + '"');
    
    var tagger = new Tagger(file_lexicon, file_rules, default_category, function(error) {
        if (error) {
            console.log(error);
        }
        else {
            var tokens = tokenizer.tokenize(req.body.text);
            var tagged_tokens = tagger.tag(tokens);
            
            // collect all the nouns (NN and NNP) as they may be 
            // possible_places
            var possible_places = [];
            tagged_tokens.forEach(function(el, i) {
                if (el[1] === "NNP" || el[1] === "NN") {
                    possible_places.push(el[0]);
                }
            });
            
            var found_places = [];
            
            async.each(
                possible_places, 
                
                function(possible_place, cb) {
            
                    // Perform operation on file here.
                    console.log('Trying to match possible place "' + possible_place + '"');
                    db.find(
                        {
                            name : possible_place,
                            feature_code : /^PPL/
                        }, 
                        
                        function (err, places) {
                            if (!err) {
                                if (places.length > 0) {
                                    places.forEach(function(el, i) {
                                        found_places.push({
                                            name : el.name,
                                            latitude : el.latitude,
                                            longitude : el.longitude
                                        });
                                        
                                    });
                                    
                                }
                            }
                            
                            cb();
                        }
                    );
                }, 
                
                function(err) {
                
                    // if any of the file processing produced an error, err would equal that error
                    if(err) {
                      // One of the iterations produced an error.
                      // All processing will now stop.
                      console.log('A possible place failed to match');
                    } 
                    else {
                      console.log(possible_places.length + ' possible places have been matched successfully');
                      console.log("We now have " + found_places.length + " found places");
                      res.send(found_places);
                    }
                }
            ); 
        }
    });
});

app.use(function(req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

var callbackAfterGeonamesInserted = function (err, newDocs) {   

    // newDocs is and array of the newly inserted document, including its _id
    console.log("    " + newDocs.length + " records inserted");
    
    app.listen(3000, function () {
        console.log('Geoparser is now listening on port 3000!');
    });
};

var features = [];

var insertIntoDb = function(err) {
    if (err) console.log(err);

    console.log("    " + features.length + " features read");
    console.log("Inserting Geonames into db…");

    // Callback is optional
    db.insert(features, callbackAfterGeonamesInserted);
};

var readFeature = function(feature, callback) {
    features.push(feature);
    callback();
};

console.log("Reading Geonames…");
geonames.read(path.join(dir_data, 'DE', 'DE.txt'), readFeature, insertIntoDb);