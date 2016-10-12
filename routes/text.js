var express = require('express');
var app = express();
var router = express.Router();
var bodyParser = require('body-parser');
var debug = require('debug')('pauliner:text');
var stopwords = require('stopwords-iso'); 
var english = stopwords.en;

var path = require('path');

var country = 'DE';
var dir_data = path.join(__dirname, '..', 'data', 'geonames');

var sqlite3 = require('sqlite3').verbose();
var db = new sqlite3.Database(
    path.join(dir_data, country, country + '.sqlite')
);

// geonames feature_class and feature_code list
var gfc = require('../data/geonames/feature_codes.json');

var async = require('async');

var natural = require('natural');
var Tagger = natural.BrillPOSTagger;
var tokenizer = new natural.WordTokenizer();
var dir_tagger = path.join(
    __dirname, 
    '..', 
    'node_modules', 
    'natural', 
    'lib', 
    'natural', 
    'brill_pos_tagger'
);
var dir_english = path.join(dir_tagger, 'data', 'English');
var file_rules = path.join(dir_english, 'tr_from_posjs.txt');
var file_lexicon = path.join(dir_english, 'lexicon_from_posjs.json');
var default_category = 'N';

router.post('/', bodyParser.urlencoded({extended: false}), function (req, res) {
    if (!req.body) return res.sendStatus(400);

    var tagger = new Tagger(
        file_lexicon, 
        file_rules, 
        default_category, 
        function(error) {
            if (error) {
                console.log(error);
            }
            else {
                debug(req.body.text);
                
                natural.PorterStemmer.attach();
                var stemmed_tokens = req.body.text.tokenizeAndStem();
                debug(stemmed_tokens);
                
                var tagged_tokens = tagger.tag(stemmed_tokens);
                debug(tagged_tokens);
                
                // collect all the nouns (NN and NNP) as they may be 
                // possible_places
                var possible_places = [];
                tagged_tokens.forEach(function(el, i) {
                    if (el[1] === default_category) {
                        possible_places.push(el[0]);
                    }
                });
                debug(possible_places);
                
                var found_places = [];
    
                var stmt = 
                    "SELECT name, feature_class, feature_code, " + 
                    "  latitude, longitude " + 
                    "FROM geonames " +
                    "WHERE Lower(asciiname) = ?";
                
                async.each(
                    possible_places, 
    
                    function(possible_place, cb) {
                        db.each(
                            stmt, 
                            possible_place.toLowerCase(), 
                            function(err, row) {
                                
                                // let us look up the feature_class and 
                                // feature_code in the geonames list
                                var feature_class, feature_code;
                                var i=0, j=gfc.length;
                                for (; i<j; i++) {
                                    if (gfc[i]["name"] === row.feature_class) {
                                        feature_class = gfc[i]["desc"];
                                    }
                                    
                                    var d = gfc[i]["dddd"];
                                    var k=0, l=d.length;
                                    for (; k<l; k++) {
                                        if (d[k]["name"] === row.feature_code) {
                                            feature_code = d[k]["desc"];
                                        }
                                    }
                                }
                                
                                found_places.push({
                                    name : row.name,
                                    latitude : row.latitude,
                                    longitude : row.longitude,
                                    feature_class : feature_class,
                                    feature_code : feature_code
                                });
                            },
                            function(err, count) {
                                cb();
                            }
                        );
                    }, 
    
                    function(err) {
    
                        // if any of the file processing produced an error, 
                        // err would equal that error
                        if(err) {
                            // One of the iterations produced an error.
                            // All processing will now stop.
                            //console.log('A possible place failed to match');
                        } 
                        else {
                            debug(found_places);
                            res.send(found_places);
                        }
                    }
                );
            }
        }
    );
});

module.exports = router;
