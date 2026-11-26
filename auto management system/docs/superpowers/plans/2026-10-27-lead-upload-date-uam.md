# Lead Uploaded Date Edit with UAM Permission Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow administrators to control lead uploaded date (`createdAt`) editing through UAM permissions, enabling authorized roles to update lead upload dates while preventing unauthorized changes.

**Architecture:** Add `lead-edit-upload-date` to the UAM permissions system (`Permission` model, migration script, `permissions.js`, and `PermissionsPage.jsx`). Enforce field-level edit permission in `backend/routes/leads.js` (`PUT /:id` and `POST /`). Expose an editable date picker in `LeadModal` when permitted (locked when not permitted), and display the uploaded date in `ViewLeadModal` and the leads table.

**Tech Stack:** Node.js, Express, Sequelize, PostgreSQL, React, React Router, Axios.

**Spec:** [docs/superpowers/specs/2026-10-27-lead-upload-date-uam-design.md](file:///d:/projects/Aravindhan/Aravindhan/crm/docs/superpowers/specs/2026-10-27-lead-upload-date-uam-design.md)

## Global Constraints
- Database column is `createdAt` in `crm_leads`.
- Safe PostgreSQL enum migration using `DO $$ BEGIN ... END $$` to avoid duplicate value errors.
- Do not break existing date range filters or sorting in `LeadsPage`.
- Maintain audit logging for lead updates including date changes.

## Review Focus
1. User without permission tries to update `createdAt` via direct API call -> backend strips `createdAt` and does not alter the date.
2. User with permission updates `createdAt` to a past date -> backend updates `createdAt` and lead is returned with updated timestamp.
3. Date range filter (`startDate` & `endDate`) immediately includes/excludes the lead based on its new `createdAt`.
4. Invalid date string sent in payload -> backend gracefully handles or ignores rather than throwing 500 error.
5. In UI, users without permission see the field disabled with a locked indicator (`🔒 Read-only`).

---

### Task 1: Database Migration and UAM Permission Registration

**Files:**
- Modify: `backend/models/Permission.js:18-44`
- Modify: `backend/routes/permissions.js:39`
- Create: `backend/migrations/addLeadUploadDatePerm.js`

**Interfaces:**
- Consumes: `Role`, `Permission`, `sequelize`
- Produces: `lead-edit-upload-date` screen enum in Postgres and `Permission` records for existing roles

- [ ] **Step 1: Update `Permission.js` model enum**
  Add `'lead-edit-upload-date'` to the `screen` ENUM array in `backend/models/Permission.js`.

- [ ] **Step 2: Update `MODULE_SCREENS.leads` in `backend/routes/permissions.js`**
  Add `'lead-edit-upload-date'` to `MODULE_SCREENS.leads` array.

- [ ] **Step 3: Create migration script `backend/migrations/addLeadUploadDatePerm.js`**
  Implement migration script that:
  - Adds `'lead-edit-upload-date'` to `enum_crm_permissions_screen` in PostgreSQL.
  - Seeds `Permission` records for all existing roles (`canEdit: true` for super_admin, `canEdit: false` for other roles).

- [ ] **Step 4: Run migration script**
  Run: `node backend/migrations/addLeadUploadDatePerm.js`
  Expected: Successful addition of ENUM and permissions seeded for all roles.

---

### Task 2: Backend Permission Enforcement on Lead Date Edit

**Files:**
- Modify: `backend/routes/leads.js:324-448`
- Create: `scratch/test_lead_upload_date_perm.js`

**Interfaces:**
- Consumes: `Permission` model, `req.user.roleId`, `req.body.createdAt`
- Produces: `lead.createdAt` updated when authorized, ignored when unauthorized

- [ ] **Step 1: Write integration test `scratch/test_lead_upload_date_perm.js`**
  Write test script verifying:
  - Non-permitted role cannot edit `createdAt`.
  - Permitted role or super admin can edit `createdAt`.
  - Lead date updates properly and is persisted.

- [ ] **Step 2: Update `PUT /api/leads/:id` in `backend/routes/leads.js`**
  - Accept `createdAt` from `req.body`.
  - If `createdAt` is supplied and different from `lead.createdAt`:
    - Check if requester is super_admin OR has `canEdit: true` for `module: 'leads', screen: 'lead-edit-upload-date'`.
    - If unauthorized, remove `createdAt` from `updates`.
    - If authorized, validate date string and assign `updates.createdAt = new Date(createdAt)`.

- [ ] **Step 3: Run test script to verify backend enforcement**
  Run: `node scratch/test_lead_upload_date_perm.js`
  Expected: All checks pass (unauthorized blocked, authorized allowed).

---

### Task 3: Frontend UAM Permissions Page Configuration

**Files:**
- Modify: `frontend/src/pages/uam/PermissionsPage.jsx:27-66`

**Interfaces:**
- Consumes: `lead-edit-upload-date` from backend `matrix`
- Produces: Friendly label and description in UAM table

- [ ] **Step 1: Add label and description in `PermissionsPage.jsx`**
  - In `SCREEN_LABELS`: add `'lead-edit-upload-date': 'Lead Uploaded Date (Edit)'`.
  - In `SCREEN_DESCRIPTIONS`: add `'lead-edit-upload-date': 'Allow role to edit the uploaded/created date of leads'`.

---

### Task 4: Frontend Leads Page UI (Edit Modal, View Modal, Table)

**Files:**
- Modify: `frontend/src/pages/leads/LeadsPage.jsx`

**Interfaces:**
- Consumes: `hasPermission('leads', 'lead-edit-upload-date', 'canEdit')`
- Produces: Editable or locked "Uploaded Date" in `LeadModal`, display in `ViewLeadModal`, and display in leads table

- [ ] **Step 1: Check permission in `LeadsPage` component**
  Add `const canEditUploadDate = hasPermission('leads', 'lead-edit-upload-date', 'canEdit');`.

- [ ] **Step 2: Update `LeadModal`**
  - Pass `canEditUploadDate` prop to `LeadModal`.
  - In `form` state, initialize `createdAt: lead?.createdAt ? new Date(lead.createdAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]`.
  - In form grid, add "Uploaded Date" input:
    - If `canEditUploadDate`: standard active `<input type="date" />`.
    - If not `canEditUploadDate`: disabled input with locked badge / styling (`🔒 Read-only (requires UAM permission)`).
  - In `handleSubmit`: include `createdAt` in payload if provided.

- [ ] **Step 3: Update `ViewLeadModal`**
  Add a section displaying `Uploaded Date` formatted as `YYYY-MM-DD` or readable date.

- [ ] **Step 4: Update Table Display in `LeadsPage.jsx`**
  In the Company Name column or Contact column, render a small subtitle:
  `Uploaded: {new Date(lead.createdAt).toLocaleDateString()}`.

---

### Task 5: End-to-End Verification

**Files:**
- Verification only

- [ ] **Step 1: Verify frontend build / syntax check**
  Run build or check for any lint/syntax errors.

- [ ] **Step 2: Run end-to-end permission check test**
  Run: `node scratch/test_lead_upload_date_perm.js`
  Confirm all scenarios pass smoothly.
