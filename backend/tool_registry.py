"""Typed contracts for 50 Blue Team projects.

A tool definition is not evidence that the upstream application is installed or
connected. Only allowlisted low-risk operations are attempted. In particular,
this coordinator never executes arbitrary shells, target scans, malware, or
host-response code. Tier 3 needs a separately deployed SOC bridge.
"""
import asyncio
import base64
import binascii
import hashlib
import ipaddress
import json
import os
import re
import shutil
import urllib.parse
from pathlib import Path

import httpx
from pydantic import BaseModel, ConfigDict, Field

CATALOG_PATH = Path(__file__).with_name("tool_catalog.json")
CATALOG = json.loads(CATALOG_PATH.read_text(encoding="utf-8"))["tools"]
BY_NAME = {item["name"]: item for item in CATALOG}
BY_REPO = {item["repository"]: item for item in CATALOG}
assert len(CATALOG) == len(BY_NAME) == len(BY_REPO) == 50, "Blue Team registry must have 50 unique contracts"

SCHEMA = {
    "type": "object",
    "properties": {
        "indicator": {"type": "string", "maxLength": 160, "description": "Public IPv4/IPv6 or domain indicator, not a target to scan"},
        "limit": {"type": "integer", "minimum": 1, "maximum": 20},
        "operation": {"type": "string", "enum": ["status", "read_only_lookup"]},
    },
    "additionalProperties": False,
}
ALLOWED_OPERATIONS = {"status", "read_only_lookup"}
LOCAL_BINARIES = {
    "aquasecurity/trivy": "trivy",
    "wallarm/gotestwaf": "gotestwaf",
    "owasp-modsecurity/ModSecurity": "modsecurity",
    "corazawaf/coraza": "coraza",
    "coreruleset/coreruleset": None,
}


def clean_indicator(value: str | None) -> str | None:
    if not isinstance(value, str):
        return None
    token = value.strip().lower().rstrip(".")
    if len(token) > 160 or not token or any(x in token for x in ("/", "\\", "@", "?", "#", " ", "\n")):
        return None
    try:
        ip = ipaddress.ip_address(token)
        docs = [
            ipaddress.ip_network("192.0.2.0/24"),
            ipaddress.ip_network("198.51.100.0/24"),
            ipaddress.ip_network("203.0.113.0/24"),
            ipaddress.ip_network("2001:db8::/32"),
        ]
        return str(ip) if ip.is_global or any(ip in network for network in docs) else None
    except ValueError:
        pass
    if token.endswith((".internal", ".localhost", ".local", ".invalid", ".test")):
        return None
    if len(token) > 253 or not re.fullmatch(r"(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}", token):
        return None
    return token


def validate_params(parameters: dict | None):
    if not isinstance(parameters, dict):
        return None
    if any(key not in SCHEMA["properties"] for key in parameters):
        return None
    op = parameters.get("operation", "status")
    if op not in ALLOWED_OPERATIONS:
        return None
    indicator = parameters.get("indicator")
    if indicator is not None and clean_indicator(indicator) is None:
        return None
    limit = parameters.get("limit", 10)
    if type(limit) is not int or not (1 <= limit <= 20):
        return None
    return {
        "operation": op,
        "indicator": clean_indicator(indicator) if indicator else None,
        "limit": limit,
    }


def _bridge_base():
    raw = os.getenv("SOC_TUNNEL_URL", "").rstrip("/")
    if not raw:
        return None
    parsed = urllib.parse.urlsplit(raw)
    # The operator's destination is pinned to a trusted HTTPS host via env.
    # No IP literals, credentials, port tricks, fragments or arbitrary paths.
    if (parsed.scheme != "https" or not parsed.hostname or parsed.username or
        parsed.password or parsed.query or parsed.fragment or
        parsed.port not in (None, 443) or parsed.path not in ("", "/")):
        return None
    host = parsed.hostname
    if host in {"localhost", "localdomain"} or host.endswith((".local", ".internal", ".localhost")):
        return None
    try:
        ipaddress.ip_address(host)
        return None
    except ValueError:
        pass
    return raw


async def bridge_readonly(item: dict, args: dict):
    url = _bridge_base()
    if not url or not os.getenv("SOC_TUNNEL_SECRET"):
        return {
            "status": "NOT_CONNECTED", "tool": item["name"], "executed": False,
            "reason": "A verified remote SOC bridge and its own shared secret are not configured.",
        }
    if args["operation"] != "read_only_lookup":
        return {"status": "REGISTRY_ONLY", "tool": item["name"], "executed": False}
    if not args["indicator"]:
        return {"status": "INVALID_PARAMETERS", "tool": item["name"], "executed": False,
                "reason": "Read-only lookup requires an explicit public indicator."}
    body = json.dumps({
        "repository": item["repository"], "action": "read_only_lookup",
        "indicator": args["indicator"], "limit": args["limit"],
    }, separators=(",", ":"), sort_keys=True).encode("utf-8")
    # This is an *integration contract*. Until a provider-compatible bridge
    # is actually installed and tested, upstream might return 404/503.
    signature = __import__("hmac").new(os.environ["SOC_TUNNEL_SECRET"].encode(), body,
                                      hashlib.sha256).hexdigest()
    try:
        async with httpx.AsyncClient(timeout=5.0, follow_redirects=False, trust_env=False) as client:
            response = await client.post(url + "/v1/security/read-only", content=body,
                headers={"Content-Type": "application/json",
                         "X-ASURA-Bridge-Signature": signature})
        if response.status_code != 200:
            return {"status": "UNAVAILABLE", "tool": item["name"], "executed": False,
                    "upstreamHttpStatus": response.status_code}
        payload = response.json()
        if not isinstance(payload, dict) or payload.get("repository") != item["repository"] or payload.get("readOnly") is not True:
            return {"status": "SCHEMA_REJECTED", "tool": item["name"], "executed": False}
        return {
            "status": "RETRIEVED", "tool": item["name"], "executed": True,
            "source": item["repository"], "providerVerified": False,
            "results": payload.get("findings", [])[:20] if isinstance(payload.get("findings"), list) else [],
            "note": "Remote SOC bridge response; backend does not independently verify originating observations.",
        }
    except (httpx.HTTPError, ValueError, TypeError) as exc:
        return {"status": "UNAVAILABLE", "tool": item["name"], "executed": False,
                "reason": "Remote SOC bridge request failed or returned invalid JSON."}


async def local_diagnostics(item: dict, args: dict):
    name = item["repository"]
    binary = LOCAL_BINARIES.get(name)
    if args["operation"] != "status":
        return {
            "status": "DISABLED", "executed": False, "tool": item["name"],
            "reason": "Local scanning and WAF manipulation are disabled in the 512 MB coordinator. Use audited export reports from an isolated runner.",
        }
    if not binary or not shutil.which(binary):
        return {
            "status": "NOT_INSTALLED", "executed": False, "tool": item["name"],
            "reason": "A corresponding CLI binary is absent; the registry entry is not an active tool.",
        }
    try:
        child = await asyncio.create_subprocess_exec(
            binary, "--version", stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.DEVNULL
        )
        stdout, _ = await asyncio.wait_for(child.communicate(), timeout=2.0)
        return {
            "status": "CLI_PRESENT_DIAGNOSTIC_ONLY" if child.returncode == 0 else "UNAVAILABLE",
            "tool": item["name"], "executed": False,
            "version": stdout.decode("utf-8", errors="replace")[:160],
            "reason": "Version probe only. No scanning, ruleset load or target access.",
        }
    except (FileNotFoundError, OSError, asyncio.TimeoutError):
        return {"status": "UNAVAILABLE", "tool": item["name"], "executed": False}


async def execute_tool(name: str, parameters: dict | None, *, approved=False):
    item = BY_NAME.get(name)
    if not item:
        return {"status": "NOT_IN_REGISTRY", "executed": False}
    args = validate_params(parameters)
    if args is None:
        return {"status": "INVALID_PARAMETERS", "tool": name, "executed": False}
    if args["operation"] == "status":
        if item["tier"] == 2:
            return await local_diagnostics(item, args)
        return {"status": integration_status(item), "tool": name, "executed": False,
                "repository": item["repository"], "tier": item["tier"]}
    if item["risk_level"] == "HIGH" and not approved:
        return {
            "status": "REQUIRES_HUMAN_APPROVAL", "tool": name, "executed": False,
            "reason": "High-risk tool actions do not run inside the autonomous read-only loop.",
        }
    if item["tier"] == 2:
        return await local_diagnostics(item, args)
    if item["repository"] == "gchq/CyberChef":
        return {
            "status": "BROWSER_TOOL_NOT_CONNECTED", "tool": name, "executed": False,
            "reason": "CyberChef is a browser application; ASURA has not installed or delegated to it.",
        }
    if item["repository"] == "urlscan/urlscan-py":
        return {
            "status": "NOT_CONNECTED", "tool": name, "executed": False,
            "reason": "Third-party URL scans are not automatically submitted from this service; no external scan permissions configured.",
        }
    return await bridge_readonly(item, args)


def integration_status(item: dict):
    if item["tier"] == 2:
        binary = LOCAL_BINARIES.get(item["repository"])
        return "CLI_PRESENT_DIAGNOSTIC_ONLY" if binary and shutil.which(binary) else "NOT_INSTALLED"
    if item["tier"] == 3 or item["tier"] == 1:
        return "BRIDGE_CONFIGURED_UNVERIFIED" if _bridge_base() and os.getenv("SOC_TUNNEL_SECRET") else "NOT_CONNECTED"
    return "NOT_CONNECTED"


def list_tool_status():
    return [
        {
            "name": item["name"],
            "repository": item["repository"],
            "category": item["category"],
            "tier": item["tier"],
            "risk_level": item["risk_level"],
            "parameters": SCHEMA,
            "status": integration_status(item),
            "operationallyValidated": False,
            "supportsAutonomousReadOnly": item["tier"] == 3 and bool(_bridge_base()) and bool(os.getenv("SOC_TUNNEL_SECRET")),
        }
        for item in CATALOG
    ]


def tool_function_specs():
    # A model is allowed to ask for a typed function, never an arbitrary
    # system command or URL. Runtime validation independently enforces scope.
    return [{
        "type": "function",
        "function": {
            "name": "inspect_blue_team_tool",
            "description": "Check one known Blue Team tool, or request read-only IOC observations from an explicitly configured SOC connector. Tool registry status does not imply active connection.",
            "parameters": {
                "type": "object",
                "properties": {
                    "name": {"type": "string", "enum": sorted(BY_NAME)},
                    "operation": {"type": "string", "enum": ["status", "read_only_lookup"]},
                    "indicator": {"type": "string", "description": "A public IP or domain, never a URL or arbitrary target"},
                    "limit": {"type": "integer", "minimum": 1, "maximum": 20},
                },
                "required": ["name", "operation"],
                "additionalProperties": False,
            },
        },
    }]
