# Knowledge Listing Create Hot Path Handover

Date: 2026-05-26

## Current Branch and Worktree Warning

- Branch: `feat/knowledge-token-savings-hot-paths`
- HEAD at handover start: `e0017d0 docs: add PR 166 cleanup handover (#167)`
- The worktree was already dirty before this handover work. Preserve the
 existing unrelated knowledge-tooling and listing-create edits unless the user
 explicitly asks to revert or split them.
- Existing modified knowledge files included `.agents/knowledge/README.md`,
 `.agents/knowledge/compact/status.jsonl`,
 `.agents/knowledge/compact/workflow.jsonl`,
 `.agents/knowledge/source-map.json`,
 `docs/agent-knowledge/SESSION_LEARNINGS.md`, `package.json`, and
 `scripts/knowledge/*`.
- Existing listing-create fix files included
 `frontend/mobile/src/screens/ListYourSpot.tsx`,
 `frontend/mobile/src/services/api.ts`,
 `frontend/mobile/src/store/slices/marketplaceSlice.ts`, and the untracked
 helper/test files under `frontend/mobile/src/utils/listingForm.ts`,
 `frontend/mobile/src/__tests__/screens/ListYourSpot.helpers.test.ts`, and
 `frontend/mobile/src/__tests__/store/`.

## Add Listing 400 Fix Summary

The implemented runtime fix prevents local image-picker photo URIs from being
sent in the initial listing-create payload. `buildListingCreateData` now splits
remote URLs from local `file://` photos. Create listing sends only remote photo
URLs, then uploads local files after the backend returns a listing id and updates
the listing with the final uploaded URLs. Submit errors now surface Joi
validation details when the backend returns them.

This matters because `backend/validators/marketplace.js` validates `photos` as
URL strings. A mobile create payload containing local `file://` image picker
URIs can trigger a backend 400 before a listing id exists for photo upload.

## Observed Knowledge Routing Before Improvement

Before the hot-path source-map entry, this query routed to generic workflow
material instead of the implementation path:

```bash
rtk npm run knowledge:context -- "My Listings add listing 400 knowledge hot path" --limit 3
```

Observed top result:

```text
1. .agents/knowledge/README.md:110-131 ... Knowledge validation
2. AGENTS.md:1-28 ... Plain startup
3. .agents/knowledge/source-map.json:382-434 ... Startup token budget and knowledge tooling
```

That means future agents investigating `My Listings add listing 400 error` would
not be routed directly to `ListYourSpot`, `listingForm`, `marketplaceSlice`,
`api.ts`, and the backend marketplace validator/controller.

## Implementation Steps

1. Add a curated source-map entry named `host-listing-create-media-upload` in
 `.agents/knowledge/source-map.json`.
2. Add a short session learning in
 `docs/agent-knowledge/SESSION_LEARNINGS.md` covering the symptom, cause,
 fix, and future routing hint.
3. Add knowledge validation coverage for:
   - `my listings add listing 400 error`
   - `ListYourSpot createListing photos file URI validation 400`
   - `host listing create photo upload 400`
4. Rebuild the knowledge DB if stale, then verify the new source-map/session
 learning result ranks before generic status or workflow docs.
5. Tune ranking only if the curated source-map entry is still behind
 `.agents/knowledge/compact/workflow.jsonl` for implementation-heavy queries.
 Do not change plain startup/status routing behavior.

## Validation Commands

```bash
rtk npm run knowledge:validate
rtk npm run knowledge:rebuild-if-stale
rtk npm run knowledge:context -- "my listings add listing 400 error" --limit 3
rtk npm run knowledge:query -- "ListYourSpot createListing photos file URI validation 400"
rtk git status --short --branch --untracked-files=normal
rtk git diff --check
```

Expected routing result: the new source-map/session-learning path appears in
the top results, with suggested reads pointing to `ListYourSpot.tsx`,
`listingForm.ts`, `marketplaceSlice.ts`, `api.ts`,
`backend/validators/marketplace.js`, and
`backend/controllers/marketplaceController.js` before broad status docs.
