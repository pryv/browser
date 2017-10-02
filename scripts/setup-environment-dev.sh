#!/bin/sh

# working dir fix
scriptsFolder=$(cd $(dirname "$0"); pwd)
cd $scriptsFolder/..

echo "
Installing Node modules from 'package.json' if necessary...
"
npm install


echo "
Runing grunt setup
"
node_modules/.bin/grunt setup

echo "


If no errors were listed above, the setup is complete.
"
