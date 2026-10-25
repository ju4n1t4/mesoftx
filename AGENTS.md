# Project instructions

Read `.ai/AGENT.md` and `.ai/documents_Agents/Current_Architecture_Baseline.md` before changing this project. Follow the approved plan in `.ai/plans/Refactorizacion_y_persistencia.md` and update `.ai/reports/Informe_Provisional_Refactorizacion.md` as each level advances.

- Reusable Atomic Design UI belongs only under `frontend/src/app/shared/ui/`.
- Preserve all existing database tables, columns and records. Schema migrations must be additive and compatible; never drop or rename existing tables/columns.
- Application/domain layers must not import concrete infrastructure or HTTP adapters.
- External API calls, credentials and synchronization persistence belong to the backend.
- Acceptance requires passing tests and >=90% function coverage separately for frontend, User_MS and Assesment_MS.
