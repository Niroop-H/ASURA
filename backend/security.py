"""HMAC request authentication and bounded in-process replay protection.

Protocol v1: HMAC-SHA256(secret, METHOD + '\n' + path + '\n' +
timestamp + '\n' + nonce + '\n' + sha256(body)).
Never use this module as a persistent replay database.
"""
import hashlib
import hmac
import os
import secrets
import time
from collections import OrderedDict

WINDOW_SECONDS = 90
_NONCES: OrderedDict[str, float] = OrderedDict()
MAX_NONCES = 4096


class AuthenticationError(Exception):
    pass


def secret_bytes() -> bytes:
    value = os.environ.get("ASURA_ENGINE_SECRET", "")
    if len(value) < 32:
        raise AuthenticationError("ASURA_ENGINE_SECRET is missing or shorter than 32 characters")
    return value.encode("utf-8")


def body_hash(body: bytes) -> str:
    return hashlib.sha256(body).hexdigest()


def request_message(method: str, path: str, timestamp: str, nonce: str, body: bytes) -> bytes:
    if not path.startswith("/") or "//" in path or "?" in path:
        raise AuthenticationError("Invalid signed path")
    return f"{method.upper()}\n{path}\n{timestamp}\n{nonce}\n{body_hash(body)}".encode("utf-8")


def sign_request(method: str, path: str, body: bytes = b"", *, timestamp=None, nonce=None):
    ts = str(int(time.time()) if timestamp is None else timestamp)
    token = nonce or secrets.token_hex(16)
    signature = hmac.new(secret_bytes(), request_message(method, path, ts, token, body), hashlib.sha256).hexdigest()
    return {
        "X-ASURA-Timestamp": ts,
        "X-ASURA-Nonce": token,
        "X-ASURA-Signature": signature,
    }


def _forget_expired(now: float):
    while _NONCES:
        key, last = next(iter(_NONCES.items()))
        if last >= now - WINDOW_SECONDS:
            break
        _NONCES.popitem(last=False)
    while len(_NONCES) > MAX_NONCES:
        _NONCES.popitem(last=False)


def verify_request(method: str, path: str, body: bytes, headers: dict, *, now=None):
    current = time.time() if now is None else float(now)
    ts = headers.get("x-asura-timestamp") or headers.get("X-ASURA-Timestamp") or ""
    nonce = headers.get("x-asura-nonce") or headers.get("X-ASURA-Nonce") or ""
    sig = headers.get("x-asura-signature") or headers.get("X-ASURA-Signature") or ""
    if not ts.isdigit() or len(ts) > 12 or len(nonce) != 32 or not all(x in "0123456789abcdef" for x in nonce):
        raise AuthenticationError("Missing or malformed authentication fields")
    if not isinstance(sig, str) or len(sig) != 64:
        raise AuthenticationError("Invalid signature")
    if abs(current - int(ts)) > WINDOW_SECONDS:
        raise AuthenticationError("Expired signed request")
    signed = request_message(method, path, ts, nonce, body)
    expected = hmac.new(secret_bytes(), signed, hashlib.sha256).hexdigest()
    if not hmac.compare_digest(expected, sig):
        raise AuthenticationError("Signature mismatch")
    _forget_expired(current)
    if nonce in _NONCES:
        raise AuthenticationError("Replayed request nonce")
    _NONCES[nonce] = current
    _forget_expired(current)
    return True


def sign_event(body: str) -> str:
    return hmac.new(secret_bytes(), ("sse\n" + body).encode("utf-8"), hashlib.sha256).hexdigest()


def digest_payload(raw: bytes) -> str:
    return body_hash(raw)
