# Pauliner  
*a naive geoparser, but you may be intrigued by its presumptuousness*

## Installing

1. Clone the repository
2. `$ cd pauliner`
3. `$ npm install`
4. To test with Germany
   - download `DE.txt` from [Geonames](http://geonames.org)
   - move `DE.txt` to `data/geonames/DE/`
   - run `node bin/geonames2sqlite.js`
5. Start the application
   - In development  
     `$ DEBUG=pauliner:* npm start`  
   - In production  
     `$ NODE_ENV=production npm start`
   - or with `pm2`  
     `$ NODE_ENV=production pm2 start bin/www --name pauliner`