# Design: Lead Uploaded Date Edit with UAM Permission

## Intent & Why
Allow administrators to grant specific roles the permission to edit the "Uploaded Date" (`createdAt`) of a lead via UAM (User Access Management). This gives administrators flexibility to correct or backdate leads while strictly controlling who has permission to make this modification.

## Goals & Non-Goals
- **Goals**:
  - Add `lead-edit-upload-date` screen permission to the `leads` module in UAM.
  - Enforce backend validation in `PUT /api/leads/:id` and `POST /api/leads` to ensure only authorized roles can change `createdAt`.
  - Expose "Uploaded Date" in `LeadModal` (editable if permitted, locked/read-only if not) and in `ViewLeadModal` / Leads table.
  - Automatically reflect the edited date in existing date-range filters, dashboard trends, and staff performance metrics.
- **Non-Goals**:
  - Creating a separate redundant database column (the system already uses `createdAt` across all metrics and filters).

## Constraints
- Safe Postgres ENUM migration for `enum_crm_permissions_screen`.
- Preserves audit logging for date edits.

## Approaches Considered
1. **Approach 1 (Selected)**: Add `lead-edit-upload-date` to UAM, enforce permission on `PUT /api/leads/:id` updating `createdAt`, and add editable/read-only date picker in `LeadModal` and `ViewLeadModal`. Clean, safe, matches existing CRM architecture.
2. **Approach 2 (Rejected)**: Inline table date picker. Rejected due to visual clutter and risk of accidental changes.
3. **Approach 3 (Rejected)**: Separate `uploadedDate` column synced with `createdAt`. Rejected due to schema redundancy.

## Implementation Details
1. **Database & UAM Migration**:
   - Update `backend/models/Permission.js` screen ENUM to include `lead-edit-upload-date`.
   - Update `backend/routes/permissions.js` `MODULE_SCREENS.leads` with `lead-edit-upload-date`.
   - Create and run migration script `backend/migrations/addLeadUploadDatePerm.js` to add enum value to PostgreSQL and seed default permissions (super_admin = true, others = false).
2. **Backend Route (`backend/routes/leads.js`)**:
   - In `PUT /api/leads/:id`, check if `createdAt` is supplied. If modified, verify `canEdit` permission on `lead-edit-upload-date` (or Super Admin). If unauthorized, ignore change or reject. Update `lead.createdAt`.
3. **Frontend UAM (`frontend/src/pages/uam/PermissionsPage.jsx`)**:
   - Add label `Edit Uploaded Date` and description to `SCREEN_LABELS` and `SCREEN_DESCRIPTIONS`.
4. **Frontend Leads (`frontend/src/pages/leads/LeadsPage.jsx`)**:
   - Read `canEditUploadDate = hasPermission('leads', 'lead-edit-upload-date', 'canEdit')`.
   - In `LeadModal`: Add "Uploaded Date" field with input date. Active if `canEditUploadDate`, disabled/locked if not.
   - In `ViewLeadModal`: Display "Uploaded Date".
   - In Table rows: Display uploaded date alongside company or contact details.
