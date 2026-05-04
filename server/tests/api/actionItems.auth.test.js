'use strict';
/**
 * AIT-04: Authorization tests for action item mutation
 * Verifies canMutateActionItem() guard behavior.
 * Skeleton only — bodies implemented after Wave 2 runs.
 *
 * Design decision (AIT-04):
 * "members of the agent's account team" is interpreted as admin/hod users
 * who have the visit's submittedBy user in their assignedEmployees array.
 * The `accounts` role is excluded — it is read-only across the app per PROJECT.md.
 * This matches the canAccessPlan() pattern in visitPlans.controller.js.
 */

describe('canMutateActionItem — authorized roles', () => {
    it.todo('superadmin receives 200 on POST');
    it.todo('admin receives 200 on POST');
    it.todo('hod with visit submitter in assignedEmployees receives 200 on POST');
    it.todo('visit submitter (own visit) receives 200 on POST');
});

describe('canMutateActionItem — unauthorized roles', () => {
    it.todo('accounts role receives 403 on POST');
    it.todo('user role (not submitter) receives 403 on POST');
    it.todo('hod WITHOUT visit submitter in assignedEmployees receives 403 on POST');
    it.todo('unauthenticated request receives 401 (protect middleware)');
});

describe('GET /api/visits/:id/action-items — open to any authenticated user', () => {
    it.todo('accounts role receives 200 on GET (reads are unrestricted)');
    it.todo('user role receives 200 on GET');
});
