var path = require('path');
var linereader  = require('line-reader');

var country = 'DE';
var dir_data = path.join(__dirname, '..', 'data', 'geonames');

var sqlite3 = require('sqlite3').verbose();
var db = new sqlite3.Database(path.join(dir_data, country, country + '.sqlite'));

var cols = {
    id : "INTEGER", 
    name : "TEXT", 
    asciiname : "TEXT", 
    alternatenames : "TEXT", 
    latitude : "REAL", 
    longitude : "REAL", 
    feature_class : "TEXT", 
    feature_code : "TEXT", 
    country_code : "TEXT", 
    cc2 : "TEXT", 
    admin1_code : "TEXT", 
    admin2_code : "TEXT", 
    admin3_code : "TEXT", 
    admin4_code : "TEXT", 
    population : "INTEGER", 
    elevation : "REAL", 
    dem : "INTEGER", 
    timezone : "TEXT", 
    date_modified : "TEXT"
};

var selectFromTable = function() {
    console.log("selecting some data…");
    var stmt = "SELECT name, feature_class, feature_code, latitude, longitude " + 
        "FROM geonames " +
        "WHERE name = ? AND feature_class = 'P'";
    
    ['Berlin', 'Hamburg'].forEach(function(e, i) {
        //console.log("looking for " + e);
        db.each(stmt, e, function(err, row) {
            console.log(row.name, row.feature_code, row.latitude, row.longitude);
        });
    });
    console.log("done");
};

var createIndex = function() {
    console.log("creating index…");
    var stmt = "CREATE INDEX IF NOT EXISTS idx_names ON geonames (name)";
    db.run(stmt);
    console.log("done");
};

var populateTable = function(country) {
    var geonames_file = path.join(dir_data, country, country + '.txt');
    console.log("populating table from " + geonames_file + "…");
    
    var qs = [];
    Object.keys(cols).forEach(function(el, i) {
        qs.push('?');
    });
    
    var stmt_txt = "INSERT INTO geonames (" +
        Object.keys(cols).join(", ") + 
        ") VALUES (" + 
        qs.join(", ") + 
        ")";
    
    db.run("BEGIN TRANSACTION");
    var stmt = db.prepare(stmt_txt);
    
    linereader.eachLine(geonames_file, function(line, last) {
        if (last) {
            //console.log(line);
            var vals = line.split(/\t/);
            stmt.run(vals);
            stmt.finalize();
            db.run("END TRANSACTION");
            db.close();
            console.log("done");
        }
        else {
            var vals = line.split(/\t/);
            stmt.run(vals);
        }
    });
};

var createTable = function(country) {   
    console.log("creating table…"); 
    var cols_defs = []
    for (var i in cols) {
        cols_defs.push(i + " " + cols[i]);
    }
    
    var stmt = "CREATE TABLE IF NOT EXISTS geonames (" + 
         cols_defs.join(", ") + 
        ")";
    
    db.run(stmt);
    console.log("done");
};

createTable(country);
populateTable(country);
createIndex();
//selectFromTable();