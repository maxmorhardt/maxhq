import pytest

from lib.settings import S3Credentials, SettingsError, env_suffix, load_cluster_secrets, load_ssh


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


def test_snapshotting_clusters_need_s3_keys():
    with pytest.raises(SettingsError, match="ETCD_S3_ACCESS_KEY_PROD, ETCD_S3_SECRET_KEY_PROD"):
        load_cluster_secrets({"K3S_TOKEN_PROD": "t", "TS_AUTHKEY_PROD": "k"}, "prod", etcd_snapshots=True)


def test_snapshotting_clusters_carry_their_s3_keys():
    env = {"K3S_TOKEN_PROD": "t", "TS_AUTHKEY_PROD": "k", "ETCD_S3_ACCESS_KEY_PROD": "a", "ETCD_S3_SECRET_KEY_PROD": "s"}

    secrets = load_cluster_secrets(env, "prod", etcd_snapshots=True)

    assert secrets.etcd_s3 == S3Credentials("a", "s")
    assert load_cluster_secrets(env, "prod").etcd_s3 is None
