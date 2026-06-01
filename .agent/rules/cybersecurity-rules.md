---
trigger: always_on
---

# Cybersecurity Rules

When doing cybersecurity-related work, always use the skills inside `.agent/skills/cybersecurity` as structured guidance.

Rules:
- Only perform defensive, educational, and authorized security testing.
- Never scan, attack, exploit, or enumerate third-party systems without explicit permission and defined scope.
- Before running any command, explain what it does and why it is needed.
- Do not run destructive commands such as delete, wipe, reset, drop database, remove files, or mass modifications unless explicitly approved.
- Do not commit, push, deploy, or change production configuration unless explicitly instructed.
- Do not expose secrets, API keys, tokens, private keys, cookies, or credentials.
- If a required tool is missing, say what needs to be installed. Do not pretend the task was completed.
- For codebase security review, inspect the actual files first before giving conclusions.
- For every finding, include:
  - title
  - affected file/path
  - evidence
  - impact
  - severity
  - recommended fix