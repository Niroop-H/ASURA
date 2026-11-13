"""ASURA DEFENSE CORE FastAPI surface (Render Free).

/health performs no I/O, Groq call, audit append or network activity.
All other routes require signed server-to-server requests.
"""
import json
import os
import time
from datetime import datetime, timezone

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse, StreamingResponse

from autonomous_orchestrator import approve, run_directive
from security import AuthenticationError, sign_event, verify_request
from tool_registry import list_tool_status

app = FastAPI(title="ASURA DEFENSE CORE", version="0.1.0", docs_url=None, redoc_url=None, openapi_url=None)
_HEALTH = b'{"status":"ok","engine":"ASURA-DEFENSE-CORE"}'


def reply(payload, status=200):
    return JSONResponse(payload, status_code=status, headers={
        "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff",
    })


async def authorized(request: Request):
    body = await request.body()
    if len(body) > 16384:
        raise AuthenticationError("Request body exceeds 16 KiB")
    verify_request(request.method, request.url.path, body, dict(request.headers))
    return body


@app.get("/health", include_in_schema=False)
async def health():
    # Returned from a cached immutable bytes literal. This endpoint never
    # touches Groq, a disk, a database or any audit ledger.
    from starlette.responses import Response
    return Response(content=_HEALTH, media_type="application/json")


@app.get("/tools")
async def tools(request: Request):
    try:
        await authorized(request)
    except AuthenticationError:
        return reply({"success": False, "status": "UNAUTHORIZED"}, 401)
    records = list_tool_status()
    return reply({
        "success": True, "engine": "ASURA-DEFENSE-CORE", "total": len(records),
        "readiness": {
            "connectedVerified": 0,
            "contractRegistered": len(records),
            "note": "Tool status is a local capability diagnostic, not a provider health probe.",
        },
        "tools": records,
        "checkedAt": datetime.now(timezone.utc).isoformat(),
    })


@app.post("/autonomous/execute")
async def execute(request: Request):
    try:
        raw = await authorized(request)
    except AuthenticationError:
        return reply({"success": False, "status": "UNAUTHORIZED"}, 401)
    try:
        data = json.loads(raw)
    except (ValueError, TypeError):
        return reply({"success": False, "error": "Invalid JSON"}, 400)
    prompt = data.get("directive") if isinstance(data, dict) else None
    operator = data.get("operator") if isinstance(data, dict) else None
    if not isinstance(prompt, str) or not 4 <= len(prompt.strip()) <= 900:
        return reply({"success": False, "error": "Directive must be 4–900 characters"}, 400)
    if not isinstance(operator, str) or not 6 <= len(operator) <= 80 or not operator.isascii():
        return reply({"success": False, "error": "Operator identity missing"}, 400)
    if any(x in prompt.lower() for x in ("password=", "private key-----", "bearer ", "ssh-rsa ")):
        return reply({"success": False, "error": "Directive may contain secrets; redact before submitting"}, 400)

    async def events():
        async for entry in run_directive(prompt, operator):
            event_body = json.dumps(entry, separators=(",", ":"), ensure_ascii=False, sort_keys=True)
            wrapped = json.dumps({"body": event_body, "sig": sign_event(event_body)},
                                 separators=(",", ":"), ensure_ascii=False)
            yield "data: " + wrapped + "\n\n"

    return StreamingResponse(events(), media_type="text/event-stream", headers={
        "Cache-Control": "no-cache, no-transform",
        "X-Accel-Buffering": "no", "X-Content-Type-Options": "nosniff",
    })


@app.post("/autonomous/approve")
async def approve_action(request: Request):
    try:
        raw = await authorized(request)
    except AuthenticationError:
        return reply({"success": False, "status": "UNAUTHORIZED"}, 401)
    try:
        data = json.loads(raw)
    except (TypeError, ValueError):
        return reply({"success": False, "error": "Invalid JSON"}, 400)
    if not isinstance(data, dict):
        return reply({"success": False, "error": "Invalid payload"}, 400)
    result = await approve(data.get("approvalToken"), data.get("decision"), data.get("operator"))
    return reply({
        "success": result.get("status") not in {"INVALID_APPROVAL", "INVALID_DECISION"},
        **result,
        "checkedAt": datetime.now(timezone.utc).isoformat(),
        "note": "Human approval is not proof of resource authorization. Actual execution requires a separately approved SOC bridge and exact target scope.",
    }, 400 if result.get("status") in {"INVALID_APPROVAL", "INVALID_DECISION"} else 200)
