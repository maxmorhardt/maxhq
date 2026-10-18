import pytest

from lib.settings import SettingsError, env_suffix, load_cluster_secrets, load_ssh


def test_ssh_prefers_the_cluster_user_over_the_environment():
    ssh = load_ssh({"SSH_USER": "max", "SSH_IDENTITY": "~/.ssh/id_ed25519"}, user_override="root")

    assert ssh.user == "root"
    assert ssh.connect_kwargs() == {"key_filename": "~/.ssh/id_ed25519"}


def test_ssh_accepts_a_password_instead_of_a_key():
    ssh = load_ssh({"SSH_USER": "max", "SSH_PASSWORD": "hunter2"})

    assert ssh.connect_kwargs() == {"password": "hunter2"}


def test_ssh_reports_everything_missing_at_once():
    with pytest.raises(SettingsError, match="SSH_USER.*SSH_IDENTITY or SSH_PASSWORD"):
        load_ssh({})


def test_cluster_secrets_are_keyed_by_cluster_name():
    secrets = load_cluster_secrets({"K3S_TOKEN_PROD": "t", "TS_AUTHKEY_PROD": "k"}, "prod")

    assert (secrets.k3s_token, secrets.tailscale_auth_key) == ("t", "k")


def test_cluster_secrets_name_the_missing_keys():
    with pytest.raises(SettingsError, match="K3S_TOKEN_DEV, TS_AUTHKEY_DEV"):
        load_cluster_secrets({"K3S_TOKEN_PROD": "t"}, "dev")


def test_env_suffix_turns_dashes_into_underscores():
    assert env_suffix("prod-eu") == "PROD_EU"
