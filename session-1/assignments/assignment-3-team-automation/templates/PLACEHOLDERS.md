# Available template placeholders

Your template at `templates/report.md` (which you'll create) can use any
of these `{{...}}` markers — `scripts/render.ts` will substitute them.

| Placeholder | What it expands to |
|-------------|--------------------|
| `{{date}}` | The date string from the log (`YYYY-MM-DD`). |
| `{{total}}` | Total event count after filtering (WARN + ERROR). |
| `{{by_category_list}}` | Markdown bullet list of category counts, sorted high→low. |
| `{{top_services_list}}` | Markdown bullet list of the top 5 services by ERROR count. |
| `{{hourly_histogram}}` | Markdown bullet list with bar-chart blocks per hour. |
| `{{generated_at}}` | ISO timestamp of when the report was rendered. |

## Constraints worth remembering

- Keep this **short**. One screen of text. Glanceable in Slack.
- Same input must yield identical output every time — so don't reach
  for anything dynamic in the template body beyond these placeholders.

`templates/report.md` does not exist yet. You'll create it.
