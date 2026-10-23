# Claude implementation request --- creature artwork upgrade

Use the `Creature_Design_Upgrade_Package` reference images to upgrade
the creature artwork in this repository.

**Start with an audit; do not immediately rewrite files or bulk-crop the
sheets.** Inspect the current codebase, identify the source of truth for
all 156 creature records, find their current artwork and every place
those assets are used, then create a safe, reversible implementation
plan.

The highest-priority requirement is **distinct facial anatomy for every
creature**. The reference examples show real structural variation:
different eye shapes and spacing, brows, snouts, muzzles, beaks, noses,
jawlines, mouths, fangs, asymmetry and feature placement. Each creature
should communicate its species and personality through its face. Avoid
repeating the same round-eyed, small-smile template. Colour, pose,
horns, accessories and elemental effects do not count as facial
diversity by themselves.

Use `README.md` as the detailed art-direction and acceptance checklist.

This must also become a **reusable workflow for future creature additions**. I may later upload a reference image, sketch, mood board, or example and ask you to create a new creature or revise one. When I do, inspect the uploaded reference, identify the traits I am pointing to, use it as guidance without blindly copying the referenced character, and create an original design that fits the game's art direction. Compare it with the existing roster to avoid duplicate faces/silhouettes, especially repeated eye and mouth templates. Keep facial anatomy diversity as the priority. Follow the repository's existing data conventions for unique IDs, names, types, assets, evolution links and Alpha variants; never renumber or silently alter existing creatures. If the reference leaves an essential design decision unclear, ask one concise question. Document a repeatable reference-to-concept-to-asset workflow and maintain a lightweight design/QA checklist for future additions.
Preserve existing IDs, names, types, stats, evolution relationships,
Alpha metadata and gameplay behaviour. Treat text inside generated
images as visual reference only; verify names and types against the
project data.

Proceed in stages: 1. **Audit:** map all 156 creature records and
existing asset paths; identify image formats, dimensions, naming rules,
rendering components and Alpha handling. 2. **Plan:** produce a manifest
mapping each ID/name to its current asset, target asset and status;
explain how individual transparent assets will be produced from the
available contact sheets. 3. **Pilot:** implement or prepare a small
pilot of 5--10 creatures with notably different facial anatomy, then
compare them visually before scaling up. 4. **Batch implementation:**
complete the remaining creatures in manageable batches, checking facial
diversity and correct ID/name mapping as you go. 5. **Integrate and
test:** update the existing asset pipeline without breaking gameplay,
then test the collection, battle, party/team, evolution and Alpha
displays wherever applicable. 6. **Report:** list changed files, counts
completed, tests run, remaining blockers and anything requiring my
approval.

Important: the PNGs in `creature_batch_sheets/` are **reference contact
sheets, not individual sprite exports**. Do not use a full sheet as an
in-game sprite, and do not claim individual assets are complete until
each creature is separated, validated and mapped correctly. If
extraction from a sheet would damage quality or include neighbouring
creatures/labels, stop and recommend a better asset-generation workflow
rather than silently shipping poor crops.

First response should be a concise repository audit and implementation
plan. Then proceed with the pilot batch unless a critical decision is
needed from me.
