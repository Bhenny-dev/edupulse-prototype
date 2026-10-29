# EduPulse System Prototype
What type of app are you building: <task-notification>
<task-id>b72yzbxxb</task-id>
<tool-use-id>toolu_01KpLEAGa3TfrXcCFenFGmhU</tool-use-id>
<output-file>C:\Users\Benny\AppData\Local\Temp\claude\c--Users-Benny-OneDrive-Documents-EduPulse-EduPulse-System-Prototype\1159d3e6-0e0d-4bae-ae19-2fbac3753d93\tasks\b72yzbxxb.output</output-file>
<status>failed</status>
<summary>Background command "Serve repo images read-only on localhost" failed with exit code 127</summary>
</task-notification>
Language and tech stack: <task-notification>
<task-id>bx9rgoc5o</task-id>
<tool-use-id>toolu_01Hrx6uAu9Q4HiQ6EZfcNYHZ</tool-use-id>
<output-file>C:\Users\Benny\AppData\Local\Temp\claude\c--Users-Benny-OneDrive-Documents-EduPulse-EduPulse-System-Prototype\1159d3e6-0e0d-4bae-ae19-2fbac3753d93\tasks\bx9rgoc5o.output</output-file>
<status>completed</status>
<summary>Background command "Run npm run verify in the worktree" completed (exit code 0)</summary>
</task-notification>
Who are the target users: <task-notification>
<task-id>b9yrdw8g8</task-id>
<tool-use-id>toolu_01WpKKZxJaGyJZsPZTTJxFdV</tool-use-id>
<output-file>C:\Users\Benny\AppData\Local\Temp\claude\c--Users-Benny-OneDrive-Documents-EduPulse-EduPulse-System-Prototype\1159d3e6-0e0d-4bae-ae19-2fbac3753d93\tasks\b9yrdw8g8.output</output-file>
<status>completed</status>
<summary>Background command "Run the full browser suite in the worktree" completed (exit code 0)</summary>
</task-notification>
Data storage: <task-notification>
<task-id>b6tkea6ey</task-id>
<tool-use-id>toolu_01H1o2yjFRkmD4PUwumUJYLd</tool-use-id>
<output-file>C:\Users\Benny\AppData\Local\Temp\claude\c--Users-Benny-OneDrive-Documents-EduPulse-EduPulse-System-Prototype\1159d3e6-0e0d-4bae-ae19-2fbac3753d93\tasks\b6tkea6ey.output</output-file>
<status>failed</status>
<summary>Background command "Serve repo images with contact sheets" failed with exit code 127</summary>
</task-notification>
Any constraints: <browser_instruction># Claude in Chrome browser automation

You have access to browser automation tools (mcp__claude-in-chrome__*) for interacting with web pages in Chrome. Follow these guidelines for effective browser automation.

## Loading deferred tools

If the mcp__claude-in-chrome__* tools are deferred (must be loaded via ToolSearch before use), load every tool you expect to need in ONE ToolSearch call — the select query accepts a comma-separated list — never one call per tool. Start with the core set:

ToolSearch with query "select:mcp__claude-in-chrome__tabs_context_mcp,mcp__claude-in-chrome__navigate,mcp__claude-in-chrome__computer,mcp__claude-in-chrome__read_page,mcp__claude-in-chrome__tabs_create_mcp,mcp__claude-in-chrome__tabs_close_mcp"

Add task-specific tools to the same call when the task obviously needs them: read_console_messages / read_network_requests for debugging, form_input for forms, gif_creator for recordings, javascript_tool for page scripting.

## GIF recording

When performing multi-step browser interactions that the user may want to review or share, use mcp__claude-in-chrome__gif_creator to record them.

You must ALWAYS:
* Capture extra frames before and after taking actions to ensure smooth playback
* Name the file meaningfully to help the user identify it later (e.g., "login_process.gif")

## Console log debugging

You can use mcp__claude-in-chrome__read_console_messages to read console output. Console output may be verbose. If you are looking for specific log entries, use the 'pattern' parameter with a regex-compatible pattern. This filters results efficiently and avoids overwhelming output. For example, use pattern: "[MyApp]" to filter for application-specific logs rather than reading all console output.

## Alerts and dialogs

IMPORTANT: Do not trigger JavaScript alerts, confirms, prompts, or browser modal dialogs through your actions. These browser dialogs block all further browser events and will prevent the extension from receiving any subsequent commands. Instead, when possible, use console.log for debugging and then use the mcp__claude-in-chrome__read_console_messages tool to read those log messages. If a page has dialog-triggering elements:
1. Avoid clicking buttons or links that may trigger alerts (e.g., "Delete" buttons with confirmation dialogs)
2. If you must interact with such elements, warn the user first that this may interrupt the session
3. Use mcp__claude-in-chrome__javascript_tool to check for and dismiss any existing dialogs before proceeding

If you accidentally trigger a dialog and lose responsiveness, inform the user they need to manually dismiss it in the browser.

## Avoid rabbit holes and loops

When using browser automation tools, stay focused on the specific task. If you encounter any of the following, stop and ask the user for guidance:
- Unexpected complexity or tangential browser exploration
- Browser tool calls failing or returning errors after 2-3 attempts
- No response from the browser extension
- Page elements not responding to clicks or input
- Pages not loading or timing out
- Unable to complete the browser task despite multiple approaches

Explain what you attempted, what went wrong, and ask how the user would like to proceed. Do not keep retrying the same failing browser action or explore unrelated pages without checking in first.

## Tab context and session startup

IMPORTANT: At the start of each browser automation session, call mcp__claude-in-chrome__tabs_context_mcp first to get information about the user's current browser tabs. Use this context to understand what the user might want to work with before creating new tabs.

Never reuse tab IDs from a previous/other session. Follow these guidelines:
1. Only reuse an existing tab if the user explicitly asks to work with it
2. Otherwise, create a new tab with mcp__claude-in-chrome__tabs_create_mcp
3. If a tool returns an error indicating the tab doesn't exist or is invalid, call tabs_context_mcp to get fresh tab IDs
4. When a tab is closed by the user or a navigation error occurs, call tabs_context_mcp to see what tabs are available</browser_instruction>
push

# AI strategy
Use Haiku for simple tasks; Sonnet for main dev; Opus for complex arch or if Sonnet fails 2x.
Keep context low: Grep before Read, targeted reads only.

# Rules
Concise responses. No overengineering. No unrequested extras.