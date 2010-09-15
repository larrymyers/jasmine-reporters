#!/bin/bash

java -cp ../ext/js.jar:../ext/jline.jar org.mozilla.javascript.tools.shell.Main -opt -1 env.bootstrap.js $@
