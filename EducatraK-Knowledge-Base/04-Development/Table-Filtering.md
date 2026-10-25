# Table filtering

The API-backed table pages use `frontend/src/components/ui/TableFilters.tsx` for a consistent search and Filter toolbar. The Filter button opens a compact dropdown containing page-specific fields, active-filter chips, Apply, Reset, and Clear all controls; it does not expand the page layout. Applying a filter closes the dropdown. Escape or clicking outside dismisses it without applying draft changes. `useTableFilters` gives each mounted table its own draft values, applied values, page number, and page size. Applying, clearing, removing a chip, or changing search resets that table to page one. Changing page size does the same. Filters remain applied while moving between pages.

Each page defines its own supported fields and maps the applied values to its existing API query. The shared component does not grant data access or add a field to an API. Laravel continues to validate filters, enforce role access, and perform filtering/pagination on the database query.

| Live page | Scoped fields |
|---|---|
| User administration | Search, role, account status, name/creation sort, creation dates; archived accounts stay in their own view. The Administrator role selector excludes protected Super Admin accounts. |
| Students | Search, grade, section, enrollment status. No financial amount control is exposed. |
| Billing accounts | Search, school year, grade, billing status, balance range. |
| Transaction history | Search, status, paid date range, method, amount range; Cashier does not receive a cashier selector, and the backend retains own-record scope. |
| Due follow-ups | Student search, grade, section, due status, sort and direction; changing filters clears the current reminder selection. |
| Notification log | Student search, delivery status, date range; applied filters synchronize with the workspace URL. |
| Security and audit logs | User search, action, date range, and approved audit entity fields on the Auditor page only. |
| Daily and outstanding reports | Report date or grade, section, balance range, and overdue state as supported by the report endpoint. |

Search applies as typed on pages with `onSearch`; other fields apply together when the user selects **Apply filters**. The notification log keeps URL-linked search in its draft until Apply. Invalid date and money ranges show a panel error before an API request. The production filters use only fields that their current endpoints support; planned clearance and monthly-report rules remain outside this implementation.

The development-only sample table pages in `OperationalPages.tsx` use the same toolbar and independent state. Their student, billing, payment, user, follow-up, notification, report, and audit views filter their fixture rows using fields present in those fixtures. The sample report aggregates do not have transaction dates, so their older date controls were removed; sample report filtering uses row category/search and supported outstanding-balance fields. Production routes continue to use the live API pages listed above.
