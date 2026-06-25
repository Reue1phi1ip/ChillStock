# ChilledStock Workspace

This workspace currently has three frontend apps:

- `chillstock-guest`
- `chillstock-management`
- `chillstock-restocker`

## Backend Source Of Truth

`chillstock-guest/convex` is the only authoritative Convex backend.

Team rule:

- Make all backend edits in `chillstock-guest/convex`.
- Treat `chillstock-management/convex` and `chillstock-restocker/convex` as read-only mirrors for build/runtime compatibility.
- Run `npx convex dev` from `chillstock-guest` only.
- After backend changes, run `scripts/sync-convex.sh` before rebuilding the management or restocker apps.
- All three apps intentionally share the same `NEXT_PUBLIC_CONVEX_URL`, so backend drift between app-local `convex/` folders is not allowed.
