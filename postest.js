var path = require('path');
var natural = require('natural');

var base_folder = path.join(path.dirname(require.resolve("natural")), "brill_pos_tagger");
var rulesFilename = base_folder + "/data/English/tr_from_posjs.txt";
var lexiconFilename = base_folder + "/data/English/lexicon_from_posjs.json";
var defaultCategory = 'N';

var lexicon = new natural.Lexicon(lexiconFilename, defaultCategory);
var rules = new natural.RuleSet(rulesFilename);
var tokenizer = new natural.RegexpTokenizer({pattern: / /});
var stemmer = natural.PorterStemmer;
var tagger = new natural.BrillPOSTagger(lexicon, rules);

var country = 'DE';
var dir_data = path.join(__dirname, 'data', 'geonames');

var sqlite3 = require('sqlite3').verbose();
var db = new sqlite3.Database(
    path.join(dir_data, country, country + '.sqlite')
);

// geonames feature_class and feature_code list
var gfc = require('./data/geonames/feature_codes.json');
var async = require('async');
var ch = require('convex-hull');
var centroid = require('polygon-centroid');

var sentence = 'I live in Göttingen but I love Berlin';

// tokenizer takes a sentence
var senarr = tokenizer.tokenize(sentence);

// stemmer takes a word or a token
senarr.forEach(function(el) {
    stemmer.stem(el);
});

//var str = senarr.join(' ');
var possible_places = [];
tagger.tag(senarr).forEach(function(el) {
    if (el[1] === 'N' || el[1] === 'NNP') {
        possible_places.push(el[0]);
    }
});

var found_places = {};
var uniq_places = [];
var stmt = "SELECT name, country_code, feature_class, feature_code, latitude, longitude \
FROM geonames \
WHERE Lower(name) = ? \
ORDER BY country_code, name";

async.each(
    possible_places, 

    function(possible_place, cb) {
        db.each(
            stmt, 
            possible_place.toLowerCase(), 
            function(err, row) {
                
                // let us look up the feature_class and 
                // feature_code in the geonames list
                // var feature_class;
                // var feature_code;
                // var i=0;
                // var j=gfc.length;
                // for (; i<j; i++) {
                //     if (gfc[i]["name"] === row.feature_class) {
                //         feature_class = gfc[i]["desc"];
                //     }
                    
                //     var d = gfc[i]["dddd"];
                //     var k=0, l=d.length;
                //     for (; k<l; k++) {
                //         if (d[k]["name"] === row.feature_code) {
                //             feature_code = d[k]["desc"];
                //         }
                //     }
                // }
                
                // found_places.push({
                //     name : row.name,
                //     latitude : row.latitude,
                //     longitude : row.longitude,
                //     country_code: row.country_code
                //     // feature_class : feature_class,
                //     // feature_code : feature_code
                // });
                var tmp = row.country_code + ' ' + row.name;
                if (tmp in found_places) {
                    found_places[tmp].push([row.longitude, row.latitude]);
                }
                else {
                    found_places[tmp] = [[row.longitude, row.latitude]];
                }
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
            console.log(Object.keys(found_places).length);
            var center;
            for (place in found_places) {
                var coords = found_places[place];
                if (coords.length > 1) {
                    var cnvh = ch(coords);
                    console.log(cnvh);
                    center = centroid(cnvh);
                    console.log(center);
                }
                else {
                    center = coords[0];
                }

                uniq_places.push({
                    name: place.split(/ /)[1],
                    country: place.split(/ /)[0],
                    latitude: center.y,
                    longitude: center.x
                });
            }

            //console.log(uniq_places);
            console.log(found_places);
        }
    }
);