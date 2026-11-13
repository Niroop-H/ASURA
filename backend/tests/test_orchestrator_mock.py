import asyncio
import json
import os
import pathlib
import sys
import unittest
from types import SimpleNamespace
from unittest.mock import patch

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1]))
os.environ["ASURA_ENGINE_SECRET"]="mock-orchestrator-secret-string-more-than-32-characters"

from autonomous_orchestrator import run_directive, approve

def tool_call(id,name,parameters):
    return SimpleNamespace(
        id=id,function=SimpleNamespace(name=name,arguments=json.dumps(parameters)),
    )

def ai_message(calls=None,text=""):
    return SimpleNamespace(tool_calls=calls or [],content=text)

class FakeGroq:
    responses=[]
    captured=[]
    def __init__(self,*args,**kwargs):
        FakeGroq.captured=[]
        self.chat=SimpleNamespace(completions=SimpleNamespace(create=self.create))
    async def __aenter__(self):
        return self
    async def __aexit__(self,*args):
        return False
    async def create(self,**kwargs):
        FakeGroq.captured.append(kwargs)
        response=FakeGroq.responses.pop(0)
        if isinstance(response,Exception):
            raise response
        return SimpleNamespace(choices=[SimpleNamespace(message=response)])

class GroqPlannerContract(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        self.before=os.environ.get("GROQ_API_KEY")
        os.environ["GROQ_API_KEY"]="gsk_mocked_key_no_real_provider"
    def tearDown(self):
        if self.before is None:
            os.environ.pop("GROQ_API_KEY",None)
        else:
            os.environ["GROQ_API_KEY"]=self.before

    async def test_two_readonly_tools_then_synthesis_without_unverified_success(self):
        FakeGroq.responses=[
            ai_message([tool_call("c1","inspect_blue_team_tool",{
                "name":"wazuh","operation":"status"
            })]),
            ai_message([tool_call("c2","inspect_blue_team_tool",{
                "name":"misp","operation":"status"
            })]),
            ai_message(text="Wazuh and MISP are registered but not live-connected; verify the SOC bridge."),
        ]
        with patch("autonomous_orchestrator.AsyncGroq",FakeGroq):
            events=[x async for x in run_directive("Inspect Wazuh and MISP", "operator-hash")]
        self.assertEqual(events[0]["phase"],"REASON")
        self.assertEqual(events[1]["phase"],"PLAN")
        tools=[x for x in events if x["type"]=="tool"]
        self.assertEqual(len(tools),2)
        self.assertEqual(tools[0]["status"],"NOT_CONNECTED")
        self.assertEqual(tools[1]["status"],"NOT_CONNECTED")
        self.assertTrue(any(x["phase"]=="SYNTHESIZE" for x in events if x["type"]=="progress"))
        self.assertEqual(events[-1]["status"],"COMPLETED")
        self.assertEqual(events[-1]["executedTools"],2)
        self.assertIn("not live-connected",events[-1]["summary"])
        self.assertEqual(len(FakeGroq.captured),3)
        self.assertEqual(FakeGroq.captured[0]["tool_choice"],"auto")
        self.assertEqual(FakeGroq.captured[0]["parallel_tool_calls"],False)

    async def test_high_risk_proposal_pauses_before_any_execution(self):
        FakeGroq.responses=[
            ai_message([tool_call("c1","propose_containment",{
                "action":"block_ip","target":"203.0.113.10",
                "reason":"Synthetic sample: manual incident review requested",
            })]),
        ]
        with patch("autonomous_orchestrator.AsyncGroq",FakeGroq):
            events=[x async for x in run_directive("Propose only a containment of 203.0.113.10", "operator-hash")]
        approval=next(x for x in events if x["type"]=="approval")["approval"]
        self.assertEqual(approval["status"],"PENDING_APPROVAL")
        self.assertFalse(approval["executed"])
        self.assertRegex(approval["proposalSha256"],r"^[a-f0-9]{64}$")
        self.assertEqual(events[-1]["status"],"PENDING_APPROVAL")
        self.assertFalse(any(x.get("status")=="BRIDGE_REPORTED_EXECUTED" for x in events))
        decision=await approve(approval["approvalToken"],"reject","operator-hash")
        self.assertEqual(decision["status"],"REJECTED")

    async def test_groq_provider_exception_fails_visibly_without_made_up_findings(self):
        FakeGroq.responses=[RuntimeError("organization_secret_do_not_display")]
        with patch("autonomous_orchestrator.AsyncGroq",FakeGroq):
            events=[x async for x in run_directive("Inspect security source status", "operator-hash")]
        err=next(x for x in events if x["type"]=="error")
        self.assertEqual(err["status"],"PLANNER_ERROR")
        self.assertNotIn("organization_secret_do_not_display",json.dumps(events))
        self.assertEqual(events[-1]["status"],"INCOMPLETE")

if __name__=="__main__":
    unittest.main()
