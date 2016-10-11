var express = require('express');
var app = express();
var router = express.Router();
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');

var path = require('path');
// var dir_data = path.join(__dirname, '..', 'data');

// var Datastore = require('nedb');
// var db = new Datastore({
//     filename: path.join(dir_data, 'geonames', 'DE', 'DE.db'), 
//     autoload: true
// });

var country = 'DE';
var dir_data = path.join(__dirname, '..', 'data', 'geonames');

var sqlite3 = require('sqlite3').verbose();
var db = new sqlite3.Database(path.join(dir_data, country, country + '.sqlite'));

var async = require('async');

var natural = require('natural');
var Tagger = natural.BrillPOSTagger;
var tokenizer = new natural.WordTokenizer();
var dir_tagger = path.join(__dirname, '..', 'node_modules', 'natural', 'lib', 'natural', 'brill_pos_tagger');
var dir_english = path.join(dir_tagger, 'data', 'English');
var file_rules = path.join(dir_english, 'tr_from_posjs.txt');
var file_lexicon = path.join(dir_english, 'lexicon_from_posjs.json');
var default_category = 'N';

router.post('/', bodyParser.urlencoded({ extended: false }), function (req, res) {
    if (!req.body) return res.sendStatus(400);

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

            var stmt = "SELECT name, feature_code, latitude, longitude " + 
                "FROM geonames " +
                "WHERE name = ? AND feature_class = 'P'";

            // possible_places.forEach(function(e, i) {
            //     //console.log("looking for " + e);
            //     db.each(
            //         stmt, 
            //         e, 
            //         function(err, row) {
            //             //console.log(row.name, row.feature_code, row.latitude, row.longitude);
            //             found_places.push({
            //                 name : row.name,
            //                 latitude : row.latitude,
            //                 longitude : row.longitude,
            //                 feature_code : row.feature_code
            //             });
            //         },
            //         function(err, count) {
            //             res.send(found_places);
            //         });
            // });
                
            
            async.each(
                possible_places, 

                function(possible_place, cb) {

                    // Perform operation on file here.
                    //console.log('Trying to match possible place "' + possible_place + '"');
                    // db.find(
                    //     {
                    //         name : possible_place,
                    //         feature_code : /^PPL/
                    //     }, 
                    // 
                    //     function (err, places) {
                    //         if (!err) {
                    //             if (places.length > 0) {
                    //                 places.forEach(function(el, i) {
                    //                     found_places.push({
                    //                         name : el.name,
                    //                         latitude : el.latitude,
                    //                         longitude : el.longitude
                    //                     });
                    // 
                    //                 });
                    //             }
                    //         }
                    // 
                    //         cb();
                    //     }
                    // );
                    
                    db.each(
                        stmt, 
                        possible_place, 
                        function(err, row) {
                            //console.log(row.name, row.feature_code, row.latitude, row.longitude);
                            found_places.push({
                                name : row.name,
                                latitude : row.latitude,
                                longitude : row.longitude,
                                feature_code : row.feature_code
                            });
                        },
                        function(err, count) {
                            cb();
                        }
                    );
                    
                    
                }, 

                function(err) {

                    // if any of the file processing produced an error, err would equal that error
                    if(err) {
                        // One of the iterations produced an error.
                        // All processing will now stop.
                        //console.log('A possible place failed to match');
                    } 
                    else {
                        res.send(found_places);
                    }
                }
            );
            
        }
    });
});

module.exports = router;
