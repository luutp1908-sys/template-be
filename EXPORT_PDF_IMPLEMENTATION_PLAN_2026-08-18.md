## Plan: Async PDF Export From Editor

**Progress Checker**
- Current step: `Step 2 - Backend persistence + security`
- Last completed: `Step 1 - API contract and flow definition`
- Status legend: `[x] done`, `[>] in progress`, `[ ] pending`

**Checklist**
- [x] Step 1 - API contract and flow definition
- [x] Step 2 - Backend persistence + security
- [ ] Step 3 - Queue + PDF generation worker
- [ ] Step 4 - Frontend editor integration
- [ ] Step 5 - Verification and hardening

Implement an async export flow where the editor sends the current unsaved canvas to backend, backend generates PDF in a queue job, and frontend polls until ready then downloads template-name.pdf. This matches your chosen behavior: no forced save-first, and a Download button next to Save Draft.

**Steps**
1. Phase 1 - API contract and flow definition  
Define export contracts in the existing export module: create export job, check status, download file.  
Dependency: blocks FE and worker implementation.

2. Add create endpoint for unsaved canvas payload  
Use a request body including content.pages plus context fields (templateId, draftId, workspaceId, templateName).  
Return exportId + initial status pending.

3. Add status endpoint  
Expose status transitions pending, processing, completed, failed; include download path and resolved filename when completed.

4. Add authenticated file download endpoint  
Serve generated PDF only to the export owner (and workspace access constraints where applicable).

5. Phase 2 - Backend persistence + security  
Replace current in-memory export storage with durable Prisma-backed export jobs (keep mock-mode fallback).  
Apply JWT guard + CurrentUser scoping and ownership checks (mirror existing user-draft access pattern).

6. Phase 3 - Queue + PDF generation worker  
Register an export queue and processor.  
Processor loads stored payload, renders PDF, stores output reference, and updates status/error fields.

7. Phase 4 - Frontend editor integration  
Add Download PDF button beside Save Draft in the top header.  
On click: send unsaved canvas payload, start polling, show Exporting… disabled state, surface failures in existing header error pattern.

8. Complete download UX  
When status becomes completed, trigger browser download using backend endpoint and filename template-name.pdf.

9. Phase 5 - Verification and hardening  
Add BE tests for auth, ownership, status lifecycle, and download access.  
Add FE tests for button behavior, polling, success download, and error handling.

**Relevant files**
- [fe/apps/editor/src/App.tsx](fe/apps/editor/src/App.tsx#L439)
- [fe/apps/editor/src/shared/api/client.ts](fe/apps/editor/src/shared/api/client.ts)
- [be/src/export/export.controller.ts](be/src/export/export.controller.ts)
- [be/src/export/export.service.ts](be/src/export/export.service.ts)
- [be/src/export/export.module.ts](be/src/export/export.module.ts)
- [be/src/export/export.repository.ts](be/src/export/export.repository.ts)
- [be/src/user-draft/user-draft.repository.prisma.ts](be/src/user-draft/user-draft.repository.prisma.ts)
- [be/src/queue/queue.module.ts](be/src/queue/queue.module.ts)
- [be/prisma/schema.prisma](be/prisma/schema.prisma)

**Decisions captured**
1. Export mode: asynchronous job + polling.
2. Export source: include unsaved canvas from FE payload.
3. Download filename: template-name.pdf.
4. Scope included: FE button + BE export API + queue + secure download.
5. Scope excluded: homepage UI changes, non-PDF formats, batch export.

Important technical note: current export and asset modules are placeholder/in-memory, so this feature requires real persistence and a rendering worker as part of the implementation, not just a small endpoint addition.

If this plan looks good, I can hand off an implementation-ready version broken into PR-sized tasks (BE-first, FE-second, tests-third).
