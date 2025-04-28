## Prerequisites
```bash
sudo su
ufw disable
apt install linux-modules-extra-raspi

nano /boot/firmware/cmdline.txt
add the following to the end: cgroup_enable=memory cgroup_memory=1
```

## Main Node
```bash
sudo su
curl -sfL https://get.k3s.io | INSTALL_K3S_CHANNEL=v1.31 sh -s - --tls-san "no-proxy.maxstash.io" --disable traefik --kube-apiserver-arg service-node-port-range=25565-32767
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
curl -sfL https://get.k3s.io | INSTALL_K3S_CHANNEL=v1.31 K3S_URL=https://no-proxy.maxstash.io:6443 K3S_TOKEN=<token> sh -
```

## Port Forwarding
The following ports should be open
- 6443 (K8s)
- 80 (HTTP)
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