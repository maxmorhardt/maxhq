## Prerequisites
```bash
# Disable firewall (you can also allow 6443 and other ports)
sudo su
ufw disable

# Enable cgroups
nano /boot/firmware/cmdline.txt
add the following to the end: cgroup_enable=memory cgroup_memory=1

# CSI for longhorn
apt install -y open-iscsi
systemctl enable --now iscsid
```

## Main Node
```bash
sudo su
curl -sfL https://get.k3s.io | INSTALL_K3S_CHANNEL=v1.35 sh -s - \
  --tls-san "10.0.0.186" \
  --disable traefik \
  --kube-apiserver-arg service-node-port-range=25565-32767

# setup kubectl aliases
echo "alias k=\"k3s kubectl\"" >> /root/.bashrc
echo "alias k=\"sudo k3s kubectl\"" >> .bashrc
```

For worker token:
```bash
cat /var/lib/rancher/k3s/server/token
```

For kube config:
```bash
# On local machine, replace server field with DNS or IP
cat /etc/rancher/k3s/k3s.yaml
```

## Worker Node
```bash
sudo su
curl -sfL https://get.k3s.io | INSTALL_K3S_CHANNEL=v1.35 \
  K3S_URL=https://10.0.0.186:6443 \
  K3S_TOKEN=<token> \
  sh -s -
```

## Port Forwarding
The following ports should be open
- 443 (HTTPS)

## Other
Delete k3s main node: 
```bash
/usr/local/bin/k3s-uninstall.sh
```

Delete k3s worker node: 
```bash
/usr/local/bin/k3s-agent-uninstall.sh
```

Upgrades:
```bash
# SCP rehydrate.sh in nodes
mv rehydrate.sh /usr/local/bin
chmod +x /usr/local/bin/rehydrate.sh
chown 0:0 /usr/local/bin/rehydrate.sh

# SCP k3s-uncordon.service to worker nodes
# For control plane do the same steps but with k3s-uncordon-cp.service
mv k3s-uncordon.service /etc/systemd/system/
chmod 644 /etc/systemd/system/k3s-uncordon.service
chown 0:0 /etc/systemd/system/k3s-uncordon.service
systemctl daemon-reload
systemctl enable k3s-uncordon.service

# SCP kubeconfig to worker nodes for draining (make sure host is the right IP/DNS first)
mkdir -p /etc/rancher/k3s
mv k3s.yaml /etc/rancher/k3s/k3s.yaml
chmod 600 /etc/rancher/k3s/k3s.yaml
chown 0:0 /etc/rancher/k3s/k3s.yaml

# Crontab config (Tuesday 2am - 5am EST)
sudo su
crontab -e

# Main Node
0 2 * * 2 /usr/local/bin/rehydrate.sh >> /var/log/rehydrate/rehydrate-$(hostname)-$(date +\%Y-\%m-\%d).log 2>&1

# Worker 1
0 3 * * 2 /usr/local/bin/rehydrate.sh >> /var/log/rehydrate/rehydrate-$(hostname)-$(date +\%Y-\%m-\%d).log 2>&1

# Worker 2
0 4 * * 2 /usr/local/bin/rehydrate.sh >> /var/log/rehydrate/rehydrate-$(hostname)-$(date +\%Y-\%m-\%d).log 2>&1

# Worker 3
0 5 * * 2 /usr/local/bin/rehydrate.sh >> /var/log/rehydrate/rehydrate-$(hostname)-$(date +\%Y-\%m-\%d).log 2>&1
```
