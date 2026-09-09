---
name: Wouter search routing
description: Wouter's useLocation and useSearch hooks split pathname and query state.
---

Wouter's `useLocation()` returns only the pathname while `useSearch()` returns the query without its leading `?`. When a page's state is encoded in the query, reconstruct the URL as `pathname + (search ? "?" + search : "")`; do not concatenate them directly.

**Why:** Community tab state and profile return destinations silently fell back to defaults when the query was concatenated without the separator.

**How to apply:** Use `useSearch()` for query parsing and include the separator when passing the current route to helpers or encoding it into a return URL.