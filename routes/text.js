var express = require('express');
var app = express();
var router = express.Router();
var bodyParser = require('body-parser');
var debug = require('debug')('pauliner:text');
var stopwords = require('stopwords-iso'); 
var english = stopwords.en;
const convexHull = require('monotone-convex-hull-2d');

var path = require('path');

var country = 'DE';
var dir_data = path.join(__dirname, '..', 'data', 'geonames');

var sqlite3 = require('sqlite3').verbose();
var db = new sqlite3.Database(
    path.join(dir_data, country, country + '.sqlite')
);

// geonames feature_class and feature_code list
//var gfc = require('../data/geonames/feature_codes.json');

var async = require('async');

var natural = require('natural');
natural.PorterStemmer.attach();

var base_folder = path.join(path.dirname(require.resolve("natural")), "brill_pos_tagger");
var rulesFilename = base_folder + "/data/English/tr_from_posjs.txt";
var lexiconFilename = base_folder + "/data/English/lexicon_from_posjs.json";
var defaultCategory = 'N';

var lexicon = new natural.Lexicon(lexiconFilename, defaultCategory);
var rules = new natural.RuleSet(rulesFilename);
var tagger = new natural.BrillPOSTagger(lexicon, rules);

var stmt = "SELECT name, feature_class, feature_code, latitude, longitude " + 
    "FROM geonames " +
    "WHERE feature_class = 'P' AND Lower(asciiname) = ? " + 
    "ORDER BY name";
    
const centroid = function(poly) {
    const l = poly.length;
    if (l == 0) {
        return false;
    }
    else if (l == 1) {
        return poly[0];
    }

    return poly.reduce(function(center, p, i) {
        center[0] += p[0];
        center[1] += p[1];

        if(i === l - 1) {
            center[0] /= l;
            center[1] /= l;
        }

        return center;
    }, [0, 0]);
};

const chpoly = function(points) {
    if (points.length < 3) {
        return points;
    }
    
    return convexHull(points).map(function(el) {
        return points[el];
    });
};

router.post('/', bodyParser.urlencoded({extended: false}), function (req, res) {
    
    if (!req.body) return res.sendStatus(400);

    debug("input: " + req.body.text);

    var stemmedTokens = req.body.text.tokenizeAndStem();
    debug("stemmed tokens: " + stemmedTokens);

    var possible_places = tagger.tag(stemmedTokens).map(function(el) {
        return el[0];
    });
    debug("possible places: " + possible_places);

    var found_places = {};

    async.each(
        possible_places, 

        function(possible_place, cb) {
            
            db.each(
                stmt, 
                possible_place.toLowerCase(), 
                function(err, row) {
                    if (row.name in found_places) {
                        found_places[row.name].push(
                            [row.longitude, row.latitude]
                        );
                    }
                    else {
                        found_places[row.name] = [
                            [row.longitude, row.latitude]
                        ];
                    }
                },
                function(err, count) {
                    cb();
                }
            )
        },

        function(err) {
            
            // if any of the file processing produced an error, 
            // err would equal that error
            if(err) {

                // One of the iterations produced an error.
                // All processing will now stop.
                console.log(err);
            } 
            else {
                debug(found_places);
                var places = [];
                for (name in found_places) {
                    var points = found_places[name];
                    var ch = chpoly(points);
                    var center = centroid(ch);
                    if (name === 'Berlin') {
                        debug(ch);
                        debug(center);
                    }
                    places.push({
                        name: name,
                        longitude: center[0],
                        latitude: center[1]
                    })
                }
                res.send(places);
            }
        }
    );
});

module.exports = router;
