#!/bin/bash

/bin/bash /usr/local/bin/k3s-killall.sh

apt-get update
apt-get upgrade -y

rm -rf /boot/firmware/*.bak

reboot