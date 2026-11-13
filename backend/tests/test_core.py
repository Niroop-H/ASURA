import asyncio
import hashlib
import hmac
import json
import os
import pathlib
import sys
import time
import unittest

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1]))
os.environ["ASURA_ENGINE_SECRET"] = "dev-test-secret-that-is-more-than-32-characters-only"
os.environ.pop("ASURA_ENABLE_CONTAINMENT", None)
os.environ.pop("SOC_TUNNEL_URL", None)
os.environ.pop("SOC_TUNNEL_SECRET", None)

from fastapi.testclient import TestClient
from main import app
from security import sign_event, sign_request
from tool_registry import CATALOG, BY_NAME, clean_indicator, execute_tool, list_tool_status, validate_params
from autonomous_orchestrator import approve, propose, run_directive

client = TestClient(app)


class HealthContract(unittest.TestCase):
    def test_cheap_health_is_exact_and_no_auth_needed(self):
        os.environ.pop("GROQ_API_KEY", None)
        start = time.perf_counter()
        res = client.get("/health")
        elapsed = (time.perf_counter() - start) * 1000
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.content, b'{"status":"ok","engine":"ASURA-DEFENSE-CORE"}')
        # Wall-clock 5ms is a target for a warm process, not a network SLA.
        self.assertLess(elapsed, 1000, f"In-process test should not hang: {elapsed:.1f}ms")

    def test_50_registry_metadata_is_protected_and_honest(self):
        self.assertEqual(client.get("/tools").status_code, 401)
        headers = sign_request("GET", "/tools")
        response = client.get("/tools", headers=headers)
        self.assertEqual(response.status_code, 200, response.text)
        data = response.json()
        self.assertEqual(data["total"], 50)
        self.assertEqual(data["readiness"]["connectedVerified"], 0)
        self.assertTrue(all(x["operationallyValidated"] is False for x in data["tools"]))
        self.assertEqual(sum(x["tier"] == 1 for x in data["tools"]), 8)
        self.assertEqual(sum(x["tier"] == 2 for x in data["tools"]), 5)
        self.assertEqual(sum(x["tier"] == 3 for x in data["tools"]), 37)
        self.assertEqual(client.get("/tools", headers=headers).status_code, 401, "Nonce must be one-time")

    def test_bad_signature_replay_timestamp_and_path_fail_closed(self):
        payload = b'{"directive":"Investigate indicator","operator":"test-operator"}'
        good = sign_request("POST", "/autonomous/execute", payload)
        bad_body = b'{"directive":"Investigate different","operator":"test-operator"}'
        self.assertEqual(client.post("/autonomous/execute", content=bad_body, headers=good).status_code, 401)
        expired = sign_request("POST", "/autonomous/execute", payload, timestamp=int(time.time()) - 180)
        self.assertEqual(client.post("/autonomous/execute", content=payload, headers=expired).status_code, 401)
        wrong = sign_request("POST", "/tools", payload)
        self.assertEqual(client.post("/autonomous/execute", content=payload, headers=wrong).status_code, 401)

    def test_planner_missing_key_is_explicit_signed_failure_not_fake_completion(self):
        os.environ.pop("GROQ_API_KEY", None)
        body = json.dumps({"directive":"Investigate suspicious IP 203.0.113.10","operator":"test-operator"}).encode()
        response = client.post("/autonomous/execute",
                               content=body, headers=sign_request("POST", "/autonomous/execute", body))
        self.assertEqual(response.status_code, 200, response.text)
        lines = [x[6:] for x in response.text.splitlines() if x.startswith("data: ")]
        events = []
        for line in lines:
            envelope = json.loads(line)
            expected = sign_event(envelope["body"])
            self.assertTrue(hmac.compare_digest(expected, envelope["sig"]))
            events.append(json.loads(envelope["body"]))
        self.assertEqual([x["type"] for x in events], ["progress", "error", "complete"])
        self.assertEqual(events[1]["status"], "PLANNER_UNAVAILABLE")
        self.assertEqual(events[2]["status"], "INCOMPLETE")
        self.assertEqual(events[2]["executedTools"], 0)


class ToolRegistry(unittest.IsolatedAsyncioTestCase):
    async def test_50_unique_typed_contracts(self):
        self.assertEqual(len(CATALOG), 50)
        self.assertEqual(len(BY_NAME), 50)
        self.assertTrue(all(x["risk_level"] in {"LOW", "MEDIUM", "HIGH"} for x in CATALOG))
        self.assertTrue(all(x["category"] in {"waf","siem","dfir","soar","threat","malware","network","exposure"} for x in CATALOG))
        self.assertTrue(all(isinstance(x["tier"], int) and x["tier"] in (1,2,3) for x in CATALOG))
        self.assertTrue(all(x["integration_status"] == "NOT_CONFIGURED" for x in CATALOG))
        self.assertTrue(all("parameters" in x for x in list_tool_status()))
        self.assertFalse(any(x["status"] == "CONNECTED" for x in list_tool_status()))

    async def test_invalid_indicator_and_actions_cannot_launch_anything(self):
        self.assertIsNone(clean_indicator("http://127.0.0.1/admin"))
        self.assertIsNone(clean_indicator("metadata.google.internal"))
        self.assertEqual(clean_indicator("203.0.113.10"), "203.0.113.10")
        self.assertIsNone(validate_params({"operation":"shell","command":"whoami"}))
        self.assertEqual((await execute_tool("not-a-tool", {}))["status"], "NOT_IN_REGISTRY")
        name = next(x["name"] for x in CATALOG if x["risk_level"] == "HIGH")
        result = await execute_tool(name, {"operation":"read_only_lookup","indicator":"203.0.113.10"})
        self.assertEqual(result["status"], "REQUIRES_HUMAN_APPROVAL")
        self.assertFalse(result["executed"])

    async def test_no_unconfigured_soc_bridge_is_reported_as_live(self):
        item = next(x for x in CATALOG if x["tier"] == 3 and x["risk_level"] == "LOW")
        result = await execute_tool(item["name"], {"operation":"read_only_lookup","indicator":"example.org"})
        self.assertEqual(result["status"], "NOT_CONNECTED")
        self.assertFalse(result["executed"])


class ApprovalContract(unittest.IsolatedAsyncioTestCase):
    async def test_signed_payload_requires_exact_operator_and_one_shot_decision(self):
        pending = propose("block_ip", "203.0.113.10", "Training report review", "test-operator")
        self.assertEqual(pending["status"], "PENDING_APPROVAL")
        self.assertFalse(pending["executed"])
        self.assertEqual(len(pending["proposalSha256"]), 64)
        denied = await approve(pending["approvalToken"], "approve", "wrong-operator")
        self.assertEqual(denied["status"], "INVALID_APPROVAL")
        approved = await approve(pending["approvalToken"], "approve", "test-operator")
        self.assertEqual(approved["status"], "APPROVED_NOT_EXECUTED")
        self.assertFalse(approved["executed"])
        again = await approve(pending["approvalToken"], "approve", "test-operator")
        self.assertEqual(again["status"], "INVALID_APPROVAL")
        rejected = propose("block_ip", "203.0.113.11", "Test only", "test-operator")
        result = await approve(rejected["approvalToken"], "reject", "test-operator")
        self.assertEqual(result["status"], "REJECTED")

    async def test_natural_language_without_planner_never_contacted_soc(self):
        os.environ.pop("GROQ_API_KEY", None)
        events = [x async for x in run_directive("Analyze 203.0.113.10", "test-operator")]
        self.assertEqual(events[-1]["status"], "INCOMPLETE")
        self.assertTrue(all(x.get("executedTools",0) == 0 for x in events))


if __name__ == "__main__":
    unittest.main()
