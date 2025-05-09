#!/bin/bash

### To run: sudo su && sh /usr/local/bin/upgrade-worker.sh <VERSION> <TOKEN> ###

version=$1
token=$2

if [ -z "$version" || -z "$token" ]; then
	echo "ERROR: Version and token args are required"
	exit 1
fi

echo Version: $version
echo Token: $token

echo Running k3s kill all
/bin/bash /usr/local/bin/k3s-killall.sh

echo Upgrading k3s
curl -sfL https://get.k3s.io | INSTALL_K3S_CHANNEL=$version K3S_URL=https://no-proxy.maxstash.io:6443 K3S_TOKEN="$token" sh -