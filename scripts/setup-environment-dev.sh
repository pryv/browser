#!/bin/sh


echo "
Installing Node modules from 'package.json' if necessary...
"
npm install

echo "
Runing grunt setup
"
grunt setup

echo "


If no errors were listed above, the setup is complete.
"
