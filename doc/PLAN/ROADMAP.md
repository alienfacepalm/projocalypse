# Projocalypse roadmap (monorepo PM dogfood)

Use `pm:ID` prefixes so `pnpm pm:gap` and `pnpm pm:sync` can align the board with this plan.

## Sprint — host integration

- [x] pm:PM-001 Plan parser with stable ids <!-- pm:section=Done -->
- [x] pm:PM-002 Gap analysis CLI <!-- pm:section=Done -->
- [ ] pm:PM-003 Talemail embed route wired in host app <!-- pm:section=Sprint pm:priority=high -->
- [x] pm:PM-004 CI gate: pm:gap --fail-on MISSING_ON_BOARD <!-- pm:section=Done -->
- [x] pm:PM-005 Cursor plan-sync rules, skills, and plan-gap CI <!-- pm:section=Done -->

## Backlog

- [ ] pm:PM-010 GitHub Issues plan adapter <!-- pm:section=Backlog -->
- [ ] pm:PM-011 Host workflow: commit `.projocalypse/pending/` for team embed import <!-- pm:section=Backlog pm:priority=high -->
- [ ] pm:PM-012 Optional board snapshot export from embed to `.projocalypse/board/` <!-- pm:section=Backlog -->
- [ ] pm:PM-013 CRDT merge layer for browser sync file (conflict-free board state) <!-- pm:section=Backlog -->
- [ ] pm:PM-014 WebRTC P2P board sync (e.g. Yjs + data channel; signaling TBD) <!-- pm:section=Backlog -->
- [ ] pm:PM-015 Optional sync relay (WebSocket signaling + TURN for NAT) <!-- pm:section=Backlog -->
- [ ] pm:PM-016 GitHub Actions notifier for plan/pending drift (not IndexedDB writer) <!-- pm:section=Backlog -->
