# .specify/memory/constitution.md

# TagMe Constitution
**Project:** TagMe — NFC/IoT Guest Experience Platform  
**Domain:** Hospitality (restaurants, bars, hotels) — LATAM / Colombia  
**Stack:** Next.js (Vercel) + InsForge Backend  
**Version:** 1.1.0  
**Ratified:** 2026-06-08  
**Last Amended:** 2026-06-08

---

## 1. Core Principles

| # | Principle                        | Description                                                                 | Non-Negotiable? |
|---|----------------------------------|-----------------------------------------------------------------------------|-----------------|
| I | **Spec-Driven Development**     | We never implement without a clear, approved specification. All significant work starts from `/speckit.specify`. Scope changes require spec amendment. | Yes |
| II | **Business First, Then Technical** | The commercial proposal (PDF) and real user/hospitality needs are the source of truth. Technology serves the business outcome, not the other way around. | Yes |
| III | **High-Level + Visual Clarity** | We prioritize clear thinking and strong visual/system design before writing code. Ambiguity in UX or flow must be resolved before implementation. | Yes |
| IV | **Pragmatic Quality**           | We value working, maintainable software over theoretical perfection. We apply testing, typing, and architecture where they deliver real value. | — |
| V  | **Simplicity & Guest/Staff Empathy** | Every feature must be simple for guests and staff. We avoid over-engineering. Complexity must be justified. | Yes |
| VI | **Iterative & MVP-Oriented**    | We deliver value in small, testable increments. We prefer shipping useful slices over big-bang implementations. | — |

---

## 2. Project Context & Sources of Truth

- **Primary Business Source:** The commercial proposal PDF (`propuesta-comercial.pdf` or equivalent). All "what" and "why" questions should reference it.
- **Project Goal:** Build a seamless guest connection and experience layer using NFC/IoT for hospitality venues (initial focus: Hotel Caribe by Faranda Grand + AVEX AI assistant).
- **Key Stakeholders:** Venue staff, guests, and operations. Technical decisions must consider real-world hospitality constraints (speed, reliability, low friction).
- **Language:** Primary documentation and specs in **Spanish**. Code and technical comments can be in English when it improves clarity.

---

## 3. Technical Standards

- **Frontend:** Next.js (App Router) deployed on Vercel. Strong preference for clean component architecture and modern React patterns.
- **Backend:** InsForge (or equivalent platform). Clear separation between frontend and backend concerns.
- **Data & State:** Explicit contracts between frontend and backend. Avoid leaking implementation details.
- **Styling & UX:** Consistent visual language. "Geek formal + silent luxury" sensibility where appropriate. Accessibility and mobile experience are important.
- **Version Control:** Git with meaningful commits. Prefer conventional commits.
- **Dependencies:** Justify every new dependency. Prefer well-maintained, lightweight libraries.

---

## 4. Workflow Rules (How the Agent Must Behave)

When working on this project, the agent **must**:

1. **Always start from the Constitution** — Every response should be consistent with these principles.
2. **Follow the Spec Kit flow strictly**:
   - `/speckit.specify` → Understand the "what" and "why"
   - `/speckit.clarify` (when needed) → Remove ambiguity before planning
   - `/speckit.plan` → Define the "how"
   - `/speckit.tasks` → Break down into actionable, verifiable tasks
   - `/speckit.implement` → Only after the above are clear
3. **Flag NEEDS CLARIFICATION** explicitly instead of making assumptions (especially around business logic, user flow, or scope).
4. **Reference the commercial proposal** when discussing features or priorities.
5. **Respect scope boundaries** — If a request goes significantly beyond the current spec, propose amending the spec first.
6. **Communicate trade-offs** clearly when there are multiple valid approaches.
7. **Keep the human in the loop** for key decisions (especially visual, UX, and business logic).

---

## 5. Governance

- **Amending the Constitution:** Any change to this document must be explicit and justified. Use `/speckit.constitution` again when updating.
- **Versioning:** Use semantic versioning for the constitution (MAJOR for breaking philosophy changes, MINOR for additions/clarifications).
- **Clarification Process:** When something is unclear, the agent should ask targeted questions before proceeding (or use `/speckit.clarify`).
- **Spec Ownership:** The human owns the final decision on scope and priorities. The agent proposes and structures.

---

## 6. Anti-Patterns (What We Avoid)

- Vibe-coding or jumping straight into implementation.
- Over-engineering for hypothetical future needs (YAGNI).
- Assuming technical elegance is more important than guest/staff experience.
- Creating large specs without validation points.
- Ignoring the commercial proposal when defining features.

---

*This constitution is the single source of truth for how we build TagMe.*