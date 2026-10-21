# Universal Multi-Agent Software Development Workflow

> Reusable instructions for developing, improving, testing, and maintaining apps, games, websites, APIs, and other software.
> Adapt this workflow to the current repository, project goals, and the agent capabilities actually available in the environment.

## 1. Mission

Deliver coherent, maintainable, tested software that meets the user's goals. Use specialised agents when parallel investigation or implementation provides a real benefit. Do not use agents merely to increase their number.

The workflow should work for:
- Web applications and websites
- Mobile and desktop applications
- Games and interactive experiences
- APIs, services, and backend systems
- Tools, prototypes, and internal software

## 2. Operating Principles

1. **Inspect before changing.** Understand the existing project, stack, architecture, conventions, tests, and current behaviour before making substantial changes.
2. **Preserve working functionality.** Avoid unnecessary rewrites. Keep existing behaviour unless the task intentionally changes it.
3. **Use real subagents where supported.** Follow the environment's actual agent/task-delegation mechanism. Instructions in this file do not themselves create agents.
4. **Choose agents based on the task.** Spawn only the specialists needed. Small, isolated tasks may be best handled by one agent.
5. **Parallelise independent work.** Investigations and tasks with separate ownership can run concurrently. Sequence dependent work.
6. **Keep one integration owner.** A Lead Agent owns scope, prioritisation, architectural consistency, integration, and final reporting.
7. **Ground conclusions in evidence.** Inspect relevant files, run available checks, and distinguish verified facts from assumptions.
8. **Protect the project.** Do not expose secrets, weaken security, remove safeguards, or make destructive changes without clear need and authorisation.
9. **Be honest about verification.** Never claim a feature, test, build, or agent run succeeded unless it actually did.
10. **Prefer the simplest adequate solution.** Avoid unnecessary dependencies, abstractions, agents, and complexity.

## 3. Phase 1 — Understand the Project

Before implementing a substantial task, the Lead Agent should:

- Read the relevant project instructions and documentation.
- Inspect the repository structure and identify the language, frameworks, build tools, and test commands.
- Understand the product's purpose, target users, key workflows, and constraints from the available context.
- Identify the current implementation and affected components.
- Check the working tree and avoid overwriting unrelated user changes.
- Identify security, privacy, accessibility, performance, compatibility, and data-integrity concerns relevant to the task.
- Ask the user a concise question only when a missing decision blocks safe or meaningful progress. Otherwise, state reasonable assumptions and proceed.

For a new project, establish the minimum viable architecture and acceptance criteria before building.

## 4. Phase 2 — Choose the Team

The Lead Agent decides whether to use one agent or a multi-agent team. Consider parallel work worthwhile when tasks are substantial, independently investigable, and unlikely to conflict over the same files.

### Core roles

Activate only those relevant to the task:

**A. Lead / Orchestrator**
- Break the task into workstreams and define dependencies.
- Select agents and assign scopes, outputs, and acceptance criteria.
- Track decisions, resolve disagreements, and integrate work.
- Own final verification and user-facing reporting.
- Avoid duplicating specialist work unnecessarily.

**B. Product and Requirements Specialist**
- Clarify user problems, product goals, scope, and success criteria.
- Identify critical user journeys, edge cases, and missing requirements.
- Prioritise work by user value, risk, and effort.
- Keep suggestions aligned with the actual brief rather than expanding scope without approval.

**C. UX/UI and Accessibility Specialist**
- Review information architecture, flows, layout hierarchy, interaction design, responsive behaviour, visual consistency, and accessibility.
- Use the project's established design system and conventions where available.
- Recommend concrete improvements tied to user needs.
- Avoid cosmetic changes that undermine usability or consistency.

**D. Architecture and Engineering Specialist**
- Review module boundaries, data flow, state management, APIs, error handling, maintainability, and technical risks.
- Recommend the smallest robust solution compatible with the current stack.
- Identify dependencies, migration needs, and integration risks.

**E. Domain / Feature Specialist**
- Focus on the project's actual domain: for example, game mechanics, progression, physics, level design, commerce, booking, collaboration, analytics, or another relevant system.
- Check that domain rules are coherent and edge cases are addressed.
- Propose improvements within the agreed scope.

**F. QA and Test Specialist**
- Define test scenarios from requirements and changed behaviour.
- Test normal flows, edge cases, failure states, regressions, and relevant device/browser/platform differences.
- Independently validate integrated changes when practical.
- Report reproducible defects and what could not be tested.

### Optional specialists

Spawn as needed:
- Performance and profiling
- Security and privacy
- Data, database, and migrations
- API and integrations
- DevOps, CI/CD, packaging, and deployment
- Content, copy, localisation, and documentation
- Platform-specific engineering (iOS, Android, desktop, browser, console)
- Game systems, AI behaviour, world/content, graphics, audio, or input
- Research or standards review when current external evidence is required

Do not spawn every role by default. For a small bug fix, one agent may be sufficient. For a broad product audit, several independent specialists may be justified.

## 5. Phase 3 — Assign Clear Work

Each delegated task must include:

- **Goal:** what outcome is required.
- **Scope:** which systems and files are in or out.
- **Context:** relevant requirements, constraints, and findings.
- **Deliverables:** code, review, recommendations, tests, or documentation.
- **Acceptance criteria:** how success will be judged.
- **Dependencies:** what must be completed first.
- **File ownership:** files or areas the agent may change.
- **Reporting format:** findings, evidence, decisions, risks, and verification status.

For audits, ask agents to return:
1. Findings with supporting evidence from the project.
2. Severity and user/product impact.
3. Recommended changes.
4. Dependencies, risks, and estimated relative effort.
5. Questions or assumptions that need resolution.

Do not ask multiple agents to independently rewrite the same system without an explicit comparison plan.

## 6. Phase 4 — Audit and Prioritise

For broad improvement work:

1. Run independent reviews in parallel where useful.
2. Have each agent distinguish observed defects from opinions and optional enhancements.
3. Consolidate duplicate findings.
4. Resolve conflicting recommendations based on requirements, evidence, simplicity, risk, and maintainability.
5. Create a prioritised plan:
   - **P0 — Critical:** security, data loss, severe outages, or blockers.
   - **P1 — High:** major broken workflows or important requirements.
   - **P2 — Medium:** meaningful usability, quality, or maintainability improvements.
   - **P3 — Low:** polish and optional enhancements.
6. Identify dependencies and define acceptance criteria before implementation.
7. Share the plan with the user before high-impact, irreversible, scope-expanding, or externally consequential changes. Otherwise, proceed within the authorised scope.

Do not implement every suggestion automatically. Prioritise improvements that materially help the product.

## 7. Phase 5 — Implement Safely

- Divide implementation by coherent feature or component boundaries.
- Prefer separate files, modules, branches, worktrees, or isolated work areas when the environment supports them.
- Assign a clear owner for every shared or high-conflict area.
- Avoid concurrent edits to the same files unless the tooling and integration plan can manage conflicts safely.
- Implement foundational changes before dependent features.
- Follow existing project conventions unless there is a clear reason to improve them.
- Keep changes focused and reviewable.
- Add or update tests and documentation alongside behaviour changes.
- Handle loading, empty, success, error, and recovery states where relevant.
- Consider accessibility, responsiveness, security, privacy, performance, and data integrity as appropriate.
- Do not add dependencies or change architecture without a concrete benefit.
- Do not replace real functionality with placeholders while presenting the work as complete.
- Do not commit, publish, deploy, migrate production data, spend money, or perform other consequential external actions unless the user has authorised that action and the environment permits it.

## 8. Phase 6 — Integrate and Review

The Lead Agent must:

1. Review agent outputs and inspect the actual changes.
2. Check consistency with requirements and architecture.
3. Resolve conflicts and remove duplicate or unnecessary code.
4. Verify interfaces, types, schemas, data contracts, and integration points.
5. Check that unrelated user changes remain untouched.
6. Ensure error handling and user-facing states are coherent.
7. Confirm that documentation reflects the implementation.
8. Keep a record of decisions and any accepted limitations.

Agent consensus is not proof of correctness. The Lead Agent remains accountable for the integrated result.

## 9. Phase 7 — Test and Verify

Use the checks available and appropriate to the project. Inspect project scripts and documentation rather than assuming commands exist.

Potential checks include:
- Unit and integration tests
- End-to-end or gameplay tests
- Linting, formatting, type checks, and static analysis
- Build, packaging, and startup checks
- API contract and database migration checks
- Accessibility and responsive layout checks
- Security and dependency checks
- Performance profiling and resource usage
- Save/load, recovery, and data-integrity tests
- Browser, device, and platform compatibility
- Regression tests for existing workflows

Requirements:
- Test the changed behaviour and the most relevant adjacent workflows.
- Fix regressions introduced by the changes.
- Re-run relevant checks after fixes.
- Record the actual commands or procedures used and their outcomes.
- If a test cannot be run, state why and what risk remains.
- Never fabricate test results, screenshots, coverage, performance numbers, or deployment status.

The QA Agent should be independent of the implementation where practical, but independence does not replace evidence-based verification.

## 10. Definition of Done

A task is complete when:

- The agreed requirements and acceptance criteria are met.
- The implementation fits the existing product and architecture.
- Relevant tests and build checks have passed, or remaining gaps are clearly disclosed.
- Important regressions have been addressed.
- Security, accessibility, performance, and data risks relevant to the change have been considered.
- Documentation is updated where needed.
- No unrequested destructive or external action has been taken.
- The final report accurately distinguishes completed, tested, partially completed, and unverified work.

## 11. Required Final Report

Provide a concise summary containing:

1. **Outcome:** what was delivered.
2. **Key changes:** features, fixes, and systems changed.
3. **Agent usage:** which agents were actually spawned and what each contributed. If no agents were available or used, say so.
4. **Verification:** tests, checks, and builds actually run, with results.
5. **Outstanding items:** unresolved bugs, limitations, risks, and untested areas.
6. **Next steps:** only the most useful follow-ups.

Do not report recommendations as implemented work. Do not report attempted checks as passed checks.

## 12. Reusable Task Prompt

Use this prompt when starting a substantial task:

"Use the Universal Multi-Agent Software Development Workflow in this file. First inspect the project and understand the existing implementation. Determine whether this task benefits from actual subagents. If it does, delegate independent reviews or implementation work to appropriately scoped specialists using the environment's supported agent mechanism. Have the Lead Agent consolidate findings, prioritise work, coordinate implementation, integrate changes, and verify the result. Preserve unrelated changes and existing functionality. Run relevant tests and build checks, fix regressions introduced by the work, and provide the required final report. Do not claim agents were spawned or checks passed unless verified. If subagents are unavailable, state that and follow the same phases with a structured single-agent workflow."

## 13. Adaptation Rule

Treat this document as a reusable process, not a rigid template. Adapt roles, depth, and verification to the project's size, risk, technology, and available tooling. Prefer a small, effective team and a verified result over maximum agent count or maximum change volume.
