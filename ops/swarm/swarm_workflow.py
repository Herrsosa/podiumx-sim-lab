import asyncio
import os
from pathlib import Path

from dotenv import load_dotenv

# Load env BEFORE importing Agents SDK (it reads env vars early)
load_dotenv()

from agents import Agent, Runner, set_default_openai_key
from agents.tool import WebSearchTool
from agents.mcp import MCPServerStdio

OUT_DIR = Path("out")
OUT_DIR.mkdir(exist_ok=True)


def write_out(name: str, content: str):
    (OUT_DIR / name).write_text(content, encoding="utf-8")


PROTOCOL = """
Return YAML:
type: REPORT | FLAG | QUESTION | DECISION | VERIFY
agent: <agent_name>
version: v1 | v2
summary: <5 bullets max>
deliverables: <list>
assumptions: <list>
claims_requiring_sources:
  - claim: "..."
    source: "US-style citation + URL"
open_risks: <list>
handoff: {to: "...", request: "..."}
Rules:
- If you can’t cite a factual claim, mark it as an assumption or remove it.
- Keep to your single responsibility.
"""

KICKOFF = f"""
Read CONTEXT FIRST: ops/swarm/CONTEXT.md

Goal: Create a “Founding Athlysts 14-Day Sprint Pack” to grow Athlyst.fun’s pre-launch waitlist via Instagram-first distribution.

Constraints:
- Single CTA: join waitlist (email capture).
- Plan executable in 60–90 minutes/day.
- Separate assumptions vs facts; cite factual claims (US-style).
- Include: message protocol, arbitration, stopping rule, budget, verification steps.

{PROTOCOL}
"""


def make_agents(codex_mcp):
    icp = Agent(
        name="ICP & Offer Architect",
        instructions=(
            "Single responsibility: ICP + offer + objections + bio/landing copy.\n"
            "Deliverables: primary+secondary ICP, 1-sentence promise + 3 proof points, "
            "5 objections+rebuttals, 3 bio variants.\n" + PROTOCOL
        ),
        tools=[WebSearchTool()],
        mcp_servers=[codex_mcp],
    )

    content = Agent(
        name="Content & Conversation Designer",
        instructions=(
            "Single responsibility: content + comments + DM flows.\n"
            "Deliverables: 3 pillars, 10 post concepts, 14 stories, "
            "20 reusable comments + 10 templates, DM flow (3 variants).\n" + PROTOCOL
        ),
        mcp_servers=[codex_mcp],
    )

    growth = Agent(
        name="Growth Ops & Distribution",
        instructions=(
            "Single responsibility: distribution plan + outreach workflows + time budget.\n"
            "Deliverables: 14-day schedule, target rubric, outreach scripts, partnership offer, time estimates.\n"
            + PROTOCOL
        ),
        tools=[WebSearchTool()],
        mcp_servers=[codex_mcp],
    )

    analytics = Agent(
        name="Analytics & Verification",
        instructions=(
            "Single responsibility: KPIs + tracking + verification.\n"
            "Deliverables: north star + 3 supporting metrics, UTM scheme, sheet columns, "
            "premortem (7 risks+mitigations). Then VERIFY final pack with status.\n" + PROTOCOL
        ),
        tools=[WebSearchTool()],
        mcp_servers=[codex_mcp],
    )

    lead = Agent(
        name="Swarm Lead (Arbiter)",
        instructions=(
            "Single responsibility: integrate into final Sprint Pack + decide.\n"
            "Arbitration: prefer cited evidence, then measurability, then simplicity.\n"
            "Output: one cohesive markdown Sprint Pack + one-page daily routine.\n" + PROTOCOL
        ),
        mcp_servers=[codex_mcp],
    )

    return icp, content, growth, analytics, lead


async def main():
    key = os.getenv("OPENAI_API_KEY")
    if not key:
        raise RuntimeError("OPENAI_API_KEY not set. Put it in ops/swarm/.env.")
    set_default_openai_key(key)

    # Start Codex CLI as an MCP server
    async with MCPServerStdio(
        name="codex",
        params={"command": "codex", "args": ["mcp-server"]},
        client_session_timeout_seconds=360000,
    ) as codex_mcp:
        icp, content, growth, analytics, lead = make_agents(codex_mcp)

        # Budget via max_turns (prevents runaway loops)
        icp_res = await Runner.run(icp, KICKOFF, max_turns=4)
        icp_txt = icp_res.final_output
        write_out("1_icp.yml", icp_txt)

        content_res = await Runner.run(content, KICKOFF + "\n\nICP:\n" + icp_txt, max_turns=4)
        content_txt = content_res.final_output
        write_out("2_content.yml", content_txt)

        growth_res = await Runner.run(
            growth,
            KICKOFF + "\n\nICP:\n" + icp_txt + "\n\nCONTENT:\n" + content_txt,
            max_turns=4,
        )
        growth_txt = growth_res.final_output
        write_out("3_growth.yml", growth_txt)

        lead_input = (
            KICKOFF
            + "\n\nINPUTS:\n\nICP:\n"
            + icp_txt
            + "\n\nCONTENT:\n"
            + content_txt
            + "\n\nGROWTH:\n"
            + growth_txt
        )
        lead_res = await Runner.run(lead, lead_input, max_turns=6)
        lead_txt = lead_res.final_output
        write_out("4_sprint_pack.md", lead_txt)

        verify_res = await Runner.run(
            analytics,
            KICKOFF
            + "\n\nFINAL PACK:\n"
            + lead_txt
            + "\n\nReturn VERIFY with status and critical fixes only.",
            max_turns=4,
        )
        verify_txt = verify_res.final_output
        write_out("5_verify.yml", verify_txt)

        # One allowed fix round
        if "status: NOT_VERIFIED" in verify_txt:
            fix_res = await Runner.run(
                lead,
                "Apply ONLY the critical fixes from VERIFY. Do not expand scope.\n\nVERIFY:\n"
                + verify_txt
                + "\n\nCURRENT PACK:\n"
                + lead_txt,
                max_turns=6,
            )
            write_out("6_sprint_pack_v2.md", fix_res.final_output)


if __name__ == "__main__":
    asyncio.run(main())
