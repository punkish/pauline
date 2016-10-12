## 0.3.0 Oct 12, 2016

- added natural stemming (using Porter stemmer) before doing a match in `sqlite3`
- added geonames feature_class and feature_code lookup list

## 0.2.0 Oct 11, 2016

- swapped `nedb` for `sqlite3` as indexed tables in a real RDBMS are way much faster than even an in-memory docs collection. (`nedb` is great for proof-of-concept and for data where records are around 10K. At >180K records, `nedb` was grinding and also taking too much memory.)

## 0.1.0 Oct 6, 2016

- using `nedb` for storing geonames country data
- `natural` for tokenizing and tagging parts of speech (POS)