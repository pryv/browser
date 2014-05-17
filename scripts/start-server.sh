#!/bin/sh

# working dir fix
scriptsFolder=$(cd $(dirname "$0"); pwd)
cd ${scriptsFolder}/..

serverPath=../dev-tools/web-server/source/server.js
distPath=./dist
username=$1

if [ ! -f ${serverPath} ]
then
  echo "
Expected dev tools web server in ${serverPath}
"
  exit 1
fi

if [ ! -d ${distPath} ]
then
  echo "
Expected built app in ${distPath}
"
  exit 1
fi

openAppDelayed() {
  if [ ! -z ${username} ]
  then
    sleep 1
    open https://${username}.rec.la:4443
  else
    echo "
Passing a username as argument will tell the script to automatically open the proper app URL
"
  fi
}
openAppDelayed &

node ${serverPath} --staticRootPath ${distPath}

