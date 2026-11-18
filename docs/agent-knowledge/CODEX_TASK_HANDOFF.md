# Starting a Codex task from a plan

Use this workflow only when the user explicitly asks to start a new task. A
request to implement a plan in the current task, or a plan that merely mentions
a new task, is not such a request. Respect any more restrictive instructions
from the active client or tool.

1. Read the complete approved plan and its `Model Routing` recommendation. Use
   the model named in that plan; do not rerun the router and silently replace it.
   If the recommendation or the plan is missing or ambiguous, explain what is
   missing and provide the available plan for manual handoff.
2. Check the active Codex client's current available-model catalog. A repository
   default, an API model list, or a different agent tool's model list does not
   prove that this task client offers the model. If the catalog is unavailable
   or does not contain the exact recommendation, do not create a task. Report
   the reason and provide the complete plan and recommendation for a manual
   handoff. Do not silently choose another model.
3. Check the current checkout, branch, HEAD and working-tree status. The task
   tool inherits the current working directory; use that checkout and include
   its absolute path and relevant uncommitted-change context in the prompt.
   Do not create a separate worktree: uncommitted changes are not copied there.
   Tell the new task to inspect existing changes and preserve unrelated work.
4. Construct a prompt that contains the **complete plan verbatim**, an explicit
   instruction to implement and verify it, the checkout context, and the
   recommended reasoning effort as advisory. The tool has no reasoning-effort
   argument; do not claim the effort was configured. Count the entire prompt in
   UTF-8 bytes, not characters. If it exceeds the tool's 1,000-byte limit, do
   not truncate or silently substitute a file reference for the plan. Report
   the limit and provide the full plan and context for a manual handoff.
5. If all checks pass and the task creation tool is available, call
   `mcp__codex_tui__create_thread` with the exact recommended `model`, the
   complete prompt, and an appropriate title. Only an explicit request to start
   a new task authorizes this call. Inspect its result: report success and the
   task identifier if returned, or report the error and provide the complete
   plan and context for manual handoff. Do not claim that the task started or
   that its model was applied when the result does not establish this.

The model recommendation remains advisory for the current conversation and
does not alter ParkPal application runtime routing. Tool availability, schemas,
prompt limits, and client model catalogs can change; check the active tool
description before each handoff.
