# Inherited IndexNow findings

These three exact Gitleaks fingerprints identify a publicly hosted upstream
IndexNow ownership token, inherited by fork. The token is served in an ownership
text file by mcpfind.org and was committed by upstream MCPFind/mcp-find.
This fork does not publish mcpfind.org. Upstream production deployment metadata
points to gus-marquezs-projects, not the fork owner's Vercel accounts.

This is a scoped accepted finding, not a claim that the token was rotated,
revoked, harmless, or belongs to MACD. IndexNow requires a hosted ownership file,
but recommends keeping its key and location known only to the owner and engines.
Changing upstream ownership proof is outside this fork's authority.

Only the three commit/path/rule/line fingerprints in .gitleaksignore are accepted.
No path, rule, token value, or whole repository is allowlisted. The workflow still
scans all fetched history including merge diffs, ignores inline allow comments,
and redacts results. New occurrences have different fingerprints and fail.
The regression check creates an isolated synthetic token commit and asserts it
is rejected even with this baseline present. It never contacts production.

Evidence checked 2026-10-27:
- https://www.indexnow.org/documentation
- https://api.github.com/repos/macd-adaptive/mcp-find (fork/parent)
- https://api.github.com/repos/MCPFind/mcp-find/deployments?per_page=3
- https://mcpfind.org and https://mcp-find-web.vercel.app (matching visible page)

The ownership file was checked for HTTP 200 and exact token content without
copying its value into this report. No key rotation or deployment was performed.
