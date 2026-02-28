---
description: 5-step orchestrator (explorer → planner → implementer → reviewer → implementer)
---
Use the subagent tool with the **chain** parameter for: $@

1. **explorer**: collect architecture/context relevant to "$@".
2. **planner**: create an implementation plan from `{previous}` + goal "$@".
3. **implementer**: execute the plan from `{previous}`.
4. **reviewer**: review implementation from `{previous}` against "$@".
5. **implementer**: apply reviewer feedback from `{previous}` and return final completion summary.

Requirements:
- Execute as a single chain call.
- Pass outputs forward with `{previous}`.
- Keep step tasks explicit and concrete.
