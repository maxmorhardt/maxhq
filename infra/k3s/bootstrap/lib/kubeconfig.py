"""Turns the k3s-generated kubeconfig into one named after its cluster."""

import yaml


def rewrite(raw: str, cluster: str, server: str) -> str:
    config = yaml.safe_load(raw)

    for entry in config["clusters"]:
        entry["name"] = cluster
        entry["cluster"]["server"] = server
    for entry in config["users"]:
        entry["name"] = cluster
    for entry in config["contexts"]:
        entry["name"] = cluster
        entry["context"]["cluster"] = cluster
        entry["context"]["user"] = cluster
    config["current-context"] = cluster

    return yaml.safe_dump(config, sort_keys=False)
