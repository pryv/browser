#!/bin/sh


echo "
Installing Node modules from 'package.json' if necessary...
"
# for some reasons mocha needs to be installed upfront
npm install mocha
npm install

npm install -g grunt

echo "
Runing grunt setup
"
grunt setup

echo "


If no errors were listed above, the setup is complete.
"
