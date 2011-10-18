#!/bin/bash

# sanity check number of args
if [ $# -ne 1 ]
then
    echo "Usage: `basename $0` path_to_runner.html"
    echo
    exit 1
fi

SCRIPTDIR=$(dirname `perl -e 'use Cwd "abs_path";print abs_path(shift)' $0`)
TESTFILE=`perl -e 'use Cwd "abs_path";print abs_path(shift)' $1`

# cleanup previous test runs
cd $SCRIPTDIR
rm -f *.xml

# make sure phantomjs submodule is initialized
cd ..
git submodule update --init

# fire up the phantomjs environment and run the test
cd $SCRIPTDIR
/usr/bin/env python ../ext/phantomjs/python/pyphantomjs/pyphantomjs.py $SCRIPTDIR/phantomjs-testrunner.js $TESTFILE
