import yaml

from lib.kubeconfig import rewrite

K3S_KUBECONFIG = """\
apiVersion: v1
clusters:
- cluster:
    certificate-authority-data: Q0E=
    server: https://127.0.0.1:6443
  name: default
contexts:
- context:
    cluster: default
    user: default
  name: default
current-context: default
kind: Config
preferences: {}
users:
- name: default
  user:
    client-certificate-data: Q0VSVA==
    client-key-data: S0VZ
"""


def test_renames_everything_after_the_cluster_and_points_at_the_server():
    config = yaml.safe_load(rewrite(K3S_KUBECONFIG, "prod", "https://prod-1.tail1234.ts.net:6443"))

    assert config["current-context"] == "prod"
    assert config["clusters"][0] == {
        "cluster": {"certificate-authority-data": "Q0E=", "server": "https://prod-1.tail1234.ts.net:6443"},
        "name": "prod",
    }
    assert config["contexts"][0] == {"context": {"cluster": "prod", "user": "prod"}, "name": "prod"}
    assert config["users"][0]["name"] == "prod"
    assert config["users"][0]["user"]["client-key-data"] == "S0VZ"
