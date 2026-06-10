# Spec: Planning Poker (real-time collaborative estimation)

> **Status:** implemented
> **Author:** José Menezes (with the IADE agent)
> **Date:** 2026-06-09 (written) → 2026-06-10 (implementation complete)

## Context

Agile teams use Planning Poker to estimate stories collaboratively while avoiding anchoring bias (everyone reveals their vote at the same time). The team has no internal tool for this today and relies on third-party solutions (PlanningPokerOnline, Scrum Poker, etc.) that live outside the organization's control: external accounts, data on third-party servers, occasional outages.

This feature delivers a **web app** that lets multiple people, each from their own computer, join the same virtual room, vote on backlog items in real time, and see the consolidated result once the facilitator reveals the votes.

**For whom:** internal agile teams during refinement / sprint planning sessions. Typical room size: 3–12 people.

## Expected behavior

The app exposes two main operations:

1. **Create a room** — anyone opens the site, picks a card scale, becomes the facilitator of that room, and receives a shareable link.
2. **Join a room** — people open the link, type a nickname, and start seeing the room in real time.

Inside the room:

- The facilitator starts a **voting round** optionally associated with a title (e.g. "US-123: Google login").
- Each participant picks a card from the configured scale. The vote is visible to themselves but **hidden** from the others (only an "X has voted" indicator).
- The facilitator clicks **reveal**: every vote appears simultaneously, along with basic statistics (numeric average ignoring `?` and `☕`, minimum, maximum, count of identical cards).
- The facilitator can **start a new round**, discarding the previous votes.
- Joins and leaves are reflected in real time for everyone.

Everything is ephemeral: the room exists as long as at least one person is connected; after X minutes with no connections, the room is discarded.

### Use cases

1. **Main case — full voting round**
   - Given: a room exists with 4 connected participants and the Fibonacci scale selected.
   - When: the facilitator starts a round titled "US-42", every participant picks a card, and the facilitator clicks "reveal".
   - Then: all 4 votes appear simultaneously on every participant's screen, along with the numeric average, the minimum, and the maximum.

2. **Alternative case — participant joins mid-round**
   - Given: a round is in progress, with 3 out of 4 participants having voted but votes not yet revealed.
   - When: a new participant opens the room link and types a nickname.
   - Then: they join the room, see the round in progress with an indication of who has voted (without seeing the votes), and can vote before reveal.

3. **Alternative case — facilitator changes the scale between rounds**
   - Given: a room with Fibonacci active, no round in progress.
   - When: the facilitator switches to "T-shirt sizes" and starts a new round.
   - Then: from that round onward, the cards shown to every participant are XS, S, M, L, XL, XXL, ?, ☕.

4. **Error case — empty or duplicate nickname**
   - Given: the room entry screen.
   - When: the user tries to join with an empty nickname, or with a nickname identical to someone already in the room.
   - Then: the app rejects the entry with a specific error message ("nickname required" / "nickname already in use in this room") and the room does not receive that participant.

5. **Error case — non-existent or expired room**
   - Given: a link to a room whose identifier does not exist (never existed or has been discarded by inactivity).
   - When: the user opens the link.
   - Then: the app shows "room not found or expired" and offers a button to create a new room.

6. **Error case — facilitator disconnects**
   - Given: an active room with the facilitator and 2 participants.
   - When: the facilitator closes the browser / loses connection for more than 30s.
   - Then: the facilitator role is automatically transferred to the oldest remaining participant in the room; everyone sees the change reflected.

## Acceptance criteria

- [x] **AC1** — a person can create a room from the home page and receives a unique URL.
- [x] **AC2** — opening the room URL in a second browser allows joining as a participant after typing a nickname.
- [x] **AC3** — when a participant votes, the others see "X has voted" without seeing the value.
- [x] **AC4** — when the facilitator reveals, every client in the room receives and displays the votes simultaneously (delay < 1s on a local network).
- [x] **AC5** — after reveal, the UI shows the mean, minimum, and maximum of the numeric cards.
- [x] **AC6** — the facilitator can start a new round, discarding the previous state; every client reflects the reset.
- [x] **AC7** — the facilitator can pick the scale (Fibonacci, modified Fibonacci, T-shirt) when creating the room and can switch it between rounds (not during a round).
- [x] **AC8** — empty or duplicate nicknames are rejected with a clear message.
- [x] **AC9** — a room with no connections for more than 10 minutes is discarded from the server.
- [x] **AC10** — if the facilitator disconnects for > 30s, the role is transferred to the oldest participant in the room.
- [x] **AC11** — opening the URL of a non-existent room shows a message and offers to create a new room.
- [x] **AC12** — joins/leaves update the room list on every client in real time.

## Out of scope

To keep the MVP lean, this feature **does not include**:

- Authentication, persistent accounts, user profiles.
- Persisting rooms or round history in a database.
- Exporting results (CSV, JSON, Jira integration, etc.).
- Integration with external tools (Jira, Linear, GitHub Issues).
- Text or voice chat between participants.
- Importing a backlog list to estimate — each round has at most one title typed by the facilitator.
- User-customizable scales (only the 3 pre-defined scales).
- Spectator / non-voting mode.
- Round timer.
- Internationalization — UI language is **English only** in the MVP (the example open-source release is published in English).
- Dark theme / visual customization.
- Mobile-first — the layout should be usable on mobile, but optimized for desktop.
- Advanced post-reconnect state reconciliation — if a client loses connection and reconnects, it receives the current room state, but unconfirmed votes may be lost.

## Dependencies

- **Base spec:** no prior spec.
- **External systems:** none — fully self-contained.
- **MCPs:** none required at runtime.
- **New libraries:** to be defined in `plan.md` and justified in the stack ADR (likely: Next.js, socket.io or similar for WebSocket).
- **ADRs to create before implementation:**
  - **Stack choice** ADR (Next.js + WebSocket).
  - **Logging strategy** ADR (referenced by `CLAUDE.md` as still missing).

## Constitution adherence

- **Principle 1 (Spec before code):** this spec was written before any implementation. ✓
- **Principle 2 (Tests track behavior):** each AC above will be mapped to at least one automated test via the `test-generator` skill, before or alongside the implementation code.
- **Principle 3 (Human approval before commit / HIC):** no code will be written until this spec, the plan, and the tasks are approved; every subsequent commit requires explicit approval.
- **Principle 5 (ADR for architectural decisions):** the stack choice (Next.js + WebSocket) will be recorded as an ADR before implementation. The logging policy will also be defined in an ADR.
- **Principle 6 (No secrets in the repo):** the app will not use secrets in the MVP. If sensitive config is introduced (port, allowed CORS origin), it will live in `.env.example` with placeholders.
- **Principle 7 (Atomic changes):** the tasks generated in `tasks.md` will be designed as separate commits (setup → room model → WebSocket → UI → error handling), never bundling refactor + feature + fix.
- **Principle 8 (Fail visibly):** operational errors (non-existent room, invalid nickname, facilitator disconnect) are handled explicitly in the use cases above and in the ACs; server errors will be logged per the logging ADR.

## Identified risks

- **Risk:** in-memory-only persistence means restarting the server discards every active room. **Mitigation:** the MVP accepts this trade-off (rooms are ephemeral by design); a production deployment with >1 replica would require sticky sessions or Redis, which is out of scope.
- **Risk:** with no authentication, anyone with the link joins under any nickname — including impersonating the facilitator. **Mitigation:** the facilitator handoff is deterministic (oldest participant), and the binding "this client is the facilitator" is maintained by a session token issued at room creation (not by nickname).
- **Risk:** duplicate nicknames may cause social confusion even when rejected — people change their nicknames during the session. **Mitigation:** validate nickname uniqueness *per room*, not globally; accept as a known limitation.
- **Risk:** WebSocket may not work on some corporate networks with restrictive proxies. **Mitigation:** document the fallback (long-polling) as a future option; test on the office network before declaring it ready.
- **Risk:** race condition between "everyone voted" and "new participant joins before reveal". **Mitigation:** the server is the single source of truth for the round state; "reveal" is an explicit facilitator action, not automatic when "everyone voted", avoiding the race.
