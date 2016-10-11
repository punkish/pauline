var geonames = require('geonames-reader');

var callbackAfterGeonamesInserted = function (err, newDocs) {   
 
     // newDocs is and array of the newly inserted document, including its _id
     console.log("    " + newDocs.length + " records inserted");
     
     app.listen(6000, function () {
         console.log('Geoparser is now listening on port 6000!');
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