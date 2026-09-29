# Open Decision — Student Lifecycle Status Display

Recorded: Tuesday, September 29, 2026 — 10:02:17 +08:00

## Issue

The frontend status-system revision separates student lifecycle status from billing status. The canonical specification defines a student record status as `enrolled` or `inactive` and includes set inactive/reactivate operations, but it does not define how the active mock frontend should calculate, transition, or display Active/Inactive beyond static sample data.

## Current Interpretation

The active frontend mock displays all sample students as Active and keeps billing urgency in a separate Billing status field. No automatic lifecycle calculation or transition rule was introduced.

## Clarification Needed

Confirm whether the UI should display the documented data-model labels Enrolled/Inactive, the staff-friendly labels Active/Inactive, or another approved wording, and define when the mock or future API should transition the value.
