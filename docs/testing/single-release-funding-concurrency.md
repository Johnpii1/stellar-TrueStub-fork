# Single-release escrow funding concurrency

## Investigation for issue #595

The current frontend funding path is not a server-side funding operation. In `apps/frontend/src/components/tw-blocks/tanstack/useEscrowsMutations.ts`, `fundEscrowMutation`:

1. Requests an unsigned funding transaction from the Trustless Work SDK.
2. Signs it with the connected user's wallet.
3. Submits it through the SDK's `sendTransaction` method.
4. Treats a response with status `SUCCESS` as a successful submission.

The backend currently has no corresponding single-release funding endpoint or shared atomic lock in this flow. A browser-side mutex would not protect against two different users, browsers, or application instances.

## Required guarantee

The acceptance criterion in issue #595 requires the state transition to be enforced at the authoritative shared state boundary (the escrow contract or a server-side atomic operation). A meaningful concurrency test must submit two funding attempts against the same escrow to that boundary and assert that exactly one is accepted and the other receives a deterministic rejection.

## Why this is not represented by a mocked unit test

A unit test that mocks one transaction as successful and the other as rejected only proves that the frontend handles a rejection. It does not prove that the real contract or backend prevents both buyers from funding the escrow. Likewise, a process-local lock would not cover separate server instances and would give a false sense of safety.

## Next step to complete the issue

Add or expose a testable authoritative funding boundary, then write an integration test that races two distinct buyer identities against the same single-release escrow on a deterministic test ledger. The test should assert one successful transaction, one rejected transaction, and an unambiguous recorded counterparty.

This investigation is intentionally not presented as satisfying the concurrency acceptance criterion. It records the current architectural blocker rather than adding a test that would pass without verifying the required guarantee.
