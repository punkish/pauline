# pauliner
## a naive geoparser

A rather naive geoparser, but you may be intriguted by its pretentiousness. I use `natural` to tokeninize the input, then match NN and NNP against a dump of Geonames (right now using only German placenames).

Lots of things to do, in no particular order:

- spellcheck and suggestions
- confidence rating for matches
- crowdsourcing the accuracy of matches
- more sophisticated NLP ("1 hour south of Göttingen on the autobahn toward Kassel" is not a match for "Göttingen" or "Kassel" but for some place 1 hour drive south of Göttingen in the direction of Kassel)

As usual, everything is in the public domain using the CC0 Public Domain Dedication.
