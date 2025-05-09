#!/bin/bash

### To run: sudo su && sh /usr/local/bin/upgrade-master.sh <VERSION> ###

version=$1
echo Version: $version

if [ -z "$version" ]; then
	echo "ERROR: Version arg is required"
	exit 1
fi

echo Running k3s kill all
/bin/bash /usr/local/bin/k3s-killall.sh

echo Upgrading k3s
curl -sfL https://get.k3s.io | INSTALL_K3S_CHANNEL=$version sh -s - --tls-san "no-proxy.maxstash.io" --disable traefik --kube-apiserver-arg service-node-port-range=25565-32767