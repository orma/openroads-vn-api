#!/bin/bash
set -e
cd /init/
# download fixture zip file, unzip its contents, then remove the zip
wget -qO- -O /init/fixture.zip https://s3.amazonaws.com/openroads-vn-fixture/fixture.zip \
&& unzip /init/fixture.zip \
&& rm /init/fixture.zip
