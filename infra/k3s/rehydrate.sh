#!/bin/bash

### To run: sudo su && sh /usr/local/bin/rehydrate.sh ###

echo Running k3s kill all
/bin/bash /usr/local/bin/k3s-killall.sh

echo Upgrading apt packages
apt-get update
apt-get upgrade -y

echo Removing backups
rm -rf /boot/firmware/*.bak

echo Rebooting
reboot