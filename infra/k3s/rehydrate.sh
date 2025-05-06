#!/bin/bash

### To run: sudo su && sh /usr/local/bin/rehydrate.sh ###

/bin/bash /usr/local/bin/k3s-killall.sh

apt-get update
apt-get upgrade -y

rm -rf /boot/firmware/*.bak

reboot