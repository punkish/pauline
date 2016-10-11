var express = require('express');
var app = express();
var router = express.Router();

var path = require('path');
var yaml = require('yaml-front-matter');
var showdown = require('showdown');
var converter = new showdown.Converter({
    parseImgDimensions: true
});

/* GET home page. */
router.get('/', function(req, res, next) {
    var metadata = yaml.loadFront(
        path.join(__dirname, '..', 'data', 'static-pages', 'index.md')
    );

    res.render(
        'main', 
        {
            text : converter.makeHtml(metadata["__content"]),
            partials : {content : 'partials/index'}
        }
    );
});

module.exports = router;
