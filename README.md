# Creature Design Upgrade Package

## What's included

-   `creature_batch_sheets/`: 12 illustrated reference sheets covering
    creatures #1--156 in batches of 13.
-   `reference_examples/`: examples supplied to demonstrate the intended
    range of facial anatomy and expression.
-   `FULL_ROSTER_OVERVIEW_REFERENCE_ONLY.png`: an overview reference for
    the overall roster; do not crop this overview into final sprites.

## Important asset limitation

The batch sheets are **contact sheets**, not 156 individually exported
transparent sprites. They are for visual direction and matching each
creature's design. Do not treat a whole sheet as one in-game asset, and
do not silently crop low-quality/incorrect labels into final assets.
Inspect the current repository and asset pipeline first, then propose
and execute a safe plan for creating or integrating individual assets.

## Core visual requirement: unique facial anatomy

Every creature must have its own facial identity, not just a different
palette, accessory, pose, or elemental effect. Vary: - eye shape, size,
spacing, angle, pupil and iris design, eyelids and brow structure; -
muzzle length and width, beaks, snouts, noses, jawlines, cheeks, teeth,
fangs and mouth shape; - head silhouette, skull proportions, asymmetry
and facial feature placement; - expression and personality: curious,
stern, sleepy, mischievous, noble, shy, feral, serene, goofy, eerie,
etc. - species-specific anatomy: birds should read through beaks and eye
placement; reptiles through snouts/scales/jaws; mammals through muzzles
and cheek shapes; insects through compound eyes/mandibles; ghosts can
use single-eye, hollow-eye, mask-like or mouthless designs; plant
creatures can use leaf/petal structures integrated into their faces.

Avoid a repeated template of two round eyes plus a small smiling mouth.
Do not solve diversity with colour changes alone. Keep the overall art
direction cohesive, but make facial structure recognisably different
even in monochrome silhouettes.


## Reusable system for future creatures

This package is not only for upgrading the current 156-creature roster. Build the workflow so it can also create and integrate **new creatures added in the future** while maintaining the same quality bar and a cohesive game art direction. Treat the visual rules here as a reusable creature-design standard, not a one-off task.

The player/developer may upload a new reference image, sketch, mood board, creature example, or a small set of images in a later request. When that happens:

1. Inspect the uploaded reference carefully and identify the specific traits being requested (for example, face structure, eye design, silhouette, materials, proportions, mood, or level of detail).
2. Use it as visual guidance for the new creature or requested revision; do not assume it replaces the whole art direction unless explicitly asked. Preserve the game's established style and make the result an original creature design rather than a near-identical copy of a reference character.
3. Explicitly prioritise facial anatomy: choose a distinctive eye arrangement, brow/eyelid treatment, muzzle/beak/snout/jaw, nose and mouth/teeth design as appropriate. Explain what makes the new face different from existing creatures.
4. Compare the proposed design against the existing roster and avoid reusing an existing creature's face, silhouette, or overall combination of features. Reuse of a visual motif is acceptable only when intentional (for example, a related evolution line) and should still show meaningful anatomy changes where appropriate.
5. Add the new creature through the project's existing data and asset conventions. Give it a unique stable ID and map its name, types, asset path, evolution links and any Alpha/variant metadata only according to the project's established rules. Never renumber or silently change existing creatures.
6. If the uploaded reference is ambiguous, ask one concise question about the essential design choice rather than guessing. Otherwise, proceed and show a concept/pilot for approval when the change is substantial.
7. Keep a reusable design log or creature-design brief/template describing the visual decisions and QA checks, so future uploads can be handled consistently.

**Future-reference workflow:** uploaded reference(s) → extract requested traits → check roster for overlap → create an original concept with species-specific facial anatomy → review/approve if needed → create the production asset → add data and integrate → run visual and gameplay checks.

## Implementation rules

1.  Inspect the repository and identify the current creature data model,
    asset folders, naming conventions, render components,
    evolution/species relationships, and Alpha variants.
2.  Do not delete or overwrite existing art or data before making a
    backup or describing a reversible change plan.
3.  Build a creature asset inventory mapping `id`, current name,
    type(s), existing asset path, proposed new asset path, and status.
4.  Preserve existing creature IDs, names, types, evolution
    relationships, Alpha metadata, gameplay stats, and references unless
    the repository explicitly proves an update is required.
5.  Use the batch sheets as art direction. Match each reference creature
    to the correct existing ID/name; do not trust text rendered inside
    AI-generated sheets as authoritative because labels may be
    imperfect.
6.  Prefer individual transparent-background assets, consistently framed
    and sized for the game. If only contact sheets are available,
    determine whether clean extraction is viable; report the trade-offs
    before mass-cropping. Do not claim the 156 sprites are individually
    delivered until they really are.
7.  Create a visual QA checklist and a comparison/contact sheet of the
    resulting individual assets. Flag repeated faces, incorrect species
    anatomy, mismatched IDs, clipping, inconsistent scale,
    halos/background remnants, and broken Alpha variants.
8.  Work in small stages: audit → mapping/plan → pilot batch of 5--10
    creatures → visual review → remaining batches → integration →
    regression test.
9.  Keep the game build runnable. Test any changed asset paths, loading
    states, responsive layouts, and existing battle/team/collection
    screens that display creatures.
10. At the end, report files changed, asset counts completed, unresolved
    issues, tests run, and the next action needed from me.

## Acceptance criteria

-   156 creature IDs are accounted for in the inventory.
-   Each creature has a clear individual asset or an explicitly
    documented blocker.
-   Faces are visibly diverse in anatomy, not merely expression or
    colour.
-   Existing gameplay data and creature identity are preserved.
-   No broken/missing images or UI regressions.
-   Alpha variants are handled consistently with the existing project
    conventions.
