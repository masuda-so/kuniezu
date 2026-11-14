from .base import *  # noqa: F403
from .base import env

# GENERAL
# ------------------------------------------------------------------------------
# https://docs.djangoproject.com/en/dev/ref/settings/#debug
DEBUG = True
# https://docs.djangoproject.com/en/dev/ref/settings/#secret-key
SECRET_KEY = env(
    "DJANGO_SECRET_KEY",
    default="local-development-only-not-a-secret",
)
# https://docs.djangoproject.com/en/dev/ref/settings/#allowed-hosts
ALLOWED_HOSTS = ["localhost", "0.0.0.0", "127.0.0.1"]  # noqa: S104

# ADMIN
# ------------------------------------------------------------------------------
# The admin site for reading the history database (kuniezu/history/admin.py).
# Only these development settings enable it: the static export
# (scripts/build_static.py, config.settings.test) and the public site do not
# carry it. Create an account with ``manage.py createsuperuser``.
INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    *INSTALLED_APPS,  # noqa: F405
]
MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]
TEMPLATES[0]["OPTIONS"]["context_processors"] = [  # type: ignore[index]  # noqa: F405
    *TEMPLATES[0]["OPTIONS"]["context_processors"],  # type: ignore[index]  # noqa: F405
    "django.contrib.auth.context_processors.auth",
    "django.contrib.messages.context_processors.messages",
]
