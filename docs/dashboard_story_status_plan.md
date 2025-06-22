# Dashboard Story Status Update Plan

**Requirement:** Update the dashboard story card to show the "Ready" status only when the `final_video_with_music` field in the `stories` table has a value (is not null or empty).

**Analysis:**

*   The relevant component is `src/components/dashboard/StoryCard.tsx`.
*   Currently, the status badge relies on the `ready_to_go` boolean flag.
*   The `story` object within the component already contains the `final_video_with_music` field.

**Proposed Plan:**

1.  **Identify Target File:** `src/components/dashboard/StoryCard.tsx`.
2.  **Locate Status Logic:** Find the `<Badge>` component responsible for displaying the status (lines 42-43).
3.  **Modify Conditional Check:** Change the condition from `story.ready_to_go` to `!!story.final_video_with_music` (checking for truthiness).
4.  **Update Badge Logic:**
    *   Modify line 42: `variant={!!story.final_video_with_music ? "default" : "secondary"}`
    *   Modify line 43: `{!!story.final_video_with_music ? "Ready" : "Processing"}`

**Visual Representation (Conceptual):**

```mermaid
graph TD
    A[Story Data] --> B{StoryCard Component};
    B --> C{Check Status Logic};
    C -- Currently --> D[Uses `ready_to_go` flag];
    C -- Proposed --> E[Checks if `final_video_with_music` exists];
    D --> F[Display "Ready" / "Processing"];
    E --> F;
```

**Next Step:** Implement the changes in `src/components/dashboard/StoryCard.tsx` using Code mode.