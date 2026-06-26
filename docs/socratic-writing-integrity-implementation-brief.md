# Socratic Writing Integrity Implementation Brief

This brief summarizes the requested Socratic Writing Studio upgrades from `developer-spec.md` and `telemetry-sample.js`.

## Recommended Build Order

| Order | Work | Why First |
| --- | --- | --- |
| 1 | DB foundation: telemetry events, platform signals, profile notes, reflection config, final quiz tables/placeholders, RLS, indexes | Every feature depends on safe storage, review access, and deletion cleanup. |
| 2 | Paste provenance + platform AI signals | Biggest integrity gain with low UX friction; current prompts already expect platform signals. |
| 3 | Student profile note | Improves cross-stage tutoring quality and continuity. |
| 4 | Final reflection panel + course/assignment toggles | Required before final quiz because quiz should use reflection. |
| 5 | Ledger-aware final quiz generator | Strong verification layer, but depends on ledger/reflection data. |
| 6 | Composition telemetry | Highest privacy and false-positive risk; ship after disclosure and review UX are stable. |

## Feature Matrix

| Feature | Perks | Risks | Required Changes |
| --- | --- | --- | --- |
| Paste provenance | Detects external text without blocking students; separates own notes, assigned readings, and outside text; gives Claude better context; adds visible ledger evidence. | False external flags if copied text is normalized badly; privacy concern if raw pasted text is stored; client hash is not enough for security; partial paste matching can be expensive. | DB: add `assignment_socratic_integrity_events` or similar with workspace, stage, field, chars, words, hash, classification, source, custody, metadata JSON. Backend: `POST /api/socratic/student/workspace/{id}/integrity-event`, server-side SHA-256, corpus matching against assignment PDFs, reading PDFs, student uploads, quiz source docs, lecture scripts. Frontend: copy/cut/paste listeners on chat, notes, Write editor, reflection; ledger tags for internal, external, reading match. |
| Internal copy custody | Preserves trust chain when students move text from notes/research/build into Write. | If source was already external, copied text must inherit that status; stale browser memory can misclassify. | DB: store source ledger entry id/source location when possible. Backend: resolve copied hashes to prior ledger events. Frontend: rolling clipboard fingerprint map, sentence-level hashes for partial copies. |
| Reading corpus matching | Turns assigned-reading quotes into positive provenance instead of suspicious paste. | Needs extracted text cache; scanned PDFs may need OCR fallback; quote spans must not be over-trusted. | DB: cache normalized corpus chunks per assignment/resource/upload. Backend: reuse existing Socratic PDF extraction, add normalized chunk/sentence matching. Frontend: display "matches assigned reading" tags, not warning UI. |
| Platform -> AI injection | Claude can ask better ownership/process questions based on real platform events; hidden signals avoid embarrassing students. | If overused, Claude may sound accusatory; signals must never be echoed to student; prompt-injection confusion if treated as user text. | DB: store short-lived `assignment_socratic_platform_signals` or attach pending signals to integrity events. Backend: inject rare factual annotations into `build_socratic_chat_messages`, then mark consumed. Frontend: send paste/stage-return events before next chat call. |
| Student profile note | Gives Claude memory across Clarify, Research, Build, Write; supports adaptive coaching. | Bias or stale judgments if notes are careless; must be written as if student might read it; needs size limits. | DB: add `profile_note` to workspace or new `assignment_socratic_profile_notes` with optional history. Backend: inject at session start; ask model to return a replacement note after sessions; cap about 600 chars. Frontend: show in educator review only at first, with clear label. |
| Final reflection panel | Adds metacognition, makes process visible, feeds final quiz, improves submission quality. | Extra friction at submit time; students may paste AI-written reflection; prompts must be conditional if reflection disabled. | DB: add reflection table or workspace fields, plus config toggles `reflection_enabled`, `reflection_required`, `final_quiz_enabled`, `final_quiz_required`. Backend: save reflection, ledger it, include in review and quiz generator; block final submit only when enabled/required. Frontend: reflection panel after Write with scaffold questions and same telemetry hooks. |
| Ledger-aware final quiz | Verifies the student's own writing journey, not just essay content; distractors can be based on paths the ledger rules out. | Thin ledger can make weak questions; bad distractors can feel unfair; higher model cost; needs modest stakes. | DB: either reuse quiz tables with `source_type='socratic_final'` or add Socratic final quiz tables for questions, attempts, answers, provenance notes. Backend: generator reads essay + all stage chats + notes + build artifacts + draft highlights + reflection; one JSON model call; quality gates for thin ledger. Frontend: embedded locked quiz shell after reflection; educator sees provenance note, student does not. |
| Composition telemetry | Detects unusually linear writing patterns without storing raw keystrokes; helps instructor follow-up. | Highest privacy risk; false positives for fluent writers; legal/disclosure requirement; performance risk if raw events are retained. | DB: aggregate-only `assignment_socratic_composition_metrics`; never persist raw key stream. Backend: receive compressed metrics, exclude reading-matched quote spans, show only soft flags. Frontend: batch edit deltas every 10s in Write/notes/reflection, derive metrics, discard raw events after flush. |
| Student disclosure | Builds trust, deters misuse, makes telemetry ethically defensible. | Too much detail can help gaming; harsh wording can make the product feel punitive. | DB: optional disclosure version and accepted timestamp. Backend: expose disclosure text/version. Frontend: onboarding notice plus editor link, framed as process evidence and student protection. |
| Deletion and cleanup | Keeps UI and DB consistent when assignments/resources are deleted; reduces storage cost. | Missing one table leaves ghost data or broken UI. | DB/Storage: cascade or explicit cleanup for telemetry, signals, notes, reflections, final quizzes, attempts, resources, uploads. Backend: extend existing assignment delete service. Frontend: reload from server after delete and never render orphaned resources. |

## Backend/API Work

| Area | Required Work |
| --- | --- |
| Socratic chat | Extend `build_socratic_chat_messages` with assignment corpus, consumed platform signals, current student profile note, and reflection/quiz policy flags. |
| Telemetry routes | Add endpoints for paste/integrity events, composition metrics, reflection save/submit, and final quiz generation/attempt. |
| Review routes | Educator review must include provenance tags, profile note, reflection, final quiz score, instructor-only quiz provenance notes, and soft composition flags. |
| Submit flow | Sequence should be Write done -> reflection if enabled -> final quiz if enabled -> final submission. |
| Prompt safety | Platform annotations must be hidden system/context messages and explicitly banned from being quoted back to students. |
| Existing services | Reuse existing PDF extraction, Socratic source context, embedded quiz shell, and assignment delete service instead of rebuilding. |

## Database Work

| Table/Column | Purpose |
| --- | --- |
| `assignment_socratic_integrity_events` | Paste/copy/provenance events with hashes, counts, source, custody, stage, field, metadata. |
| `assignment_socratic_platform_signals` | Short hidden AI annotations queued for the next coach call. |
| `assignment_socratic_profile_notes` or workspace `profile_note` | Cross-stage student coaching memory. |
| `assignment_socratic_reflections` | Final reflection text, scaffold answers, timestamps, telemetry linkage. |
| `assignment_socratic_composition_metrics` | Aggregate-only writing behavior metrics. |
| `assignment_socratic_final_quizzes` and children, or quiz table extension | Ledger-aware final quiz questions, attempts, answers, instructor provenance. |
| Config columns | Reflection and final quiz toggles; possibly disclosure/version flags. |
| RLS policies | Students can create/read only their own workspace data; educators can review only assignments they own. |

## Frontend Work

| Surface | Required Work |
| --- | --- |
| Student studio | Add telemetry listeners to chat, notes, Write editor, reflection; show provenance tags in ledger; add reflection step; embed final quiz. |
| Educator config | Add toggles for reflection/final quiz, disclosure wording if needed, and review visibility settings. |
| Educator review | Show process evidence calmly: source tags, reflection, final quiz result, profile note, soft flags. Avoid red accusation UI. |
| UX copy | Keep all integrity language neutral: evidence, provenance, process, review. Do not call students suspicious. |

## Main Implementation Risks

| Risk | Mitigation |
| --- | --- |
| Privacy overreach | Store hashes and aggregates, not raw pasted text or raw keystrokes. Add disclosure before telemetry ships. |
| False positives | Treat all signals as review context only. Never auto-penalize. Match assigned readings before flagging external text. |
| Prompt leakage | Platform signals must be hidden and explicitly non-quotable in system prompts. |
| Broken old assignments | Use nullable columns, default toggles, and migration backfills. Old assignments should still open with features disabled/defaulted. |
| Storage ghosts | Extend assignment deletion to every new telemetry/reflection/quiz table and related storage paths. |

