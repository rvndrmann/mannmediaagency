# Plan: Conditional Image Aspect Ratios in Scene Detail Panel

**Objective:** Modify the image display in `src/components/canvas/SceneDetailPanel.tsx` so that specific image types ("Product Image", "Scene Image V1", "Scene Image V2") are displayed within a container forced to a 9:16 aspect ratio, fitting the image inside (`object-contain`). Other image types should resize dynamically based on their original aspect ratio.

**Target File:** `src/components/canvas/SceneDetailPanel.tsx`

**Target Component:** `FileUploadItem` (defined around line 174)

**Implementation Steps:**

1.  **Conditional Styling:** Apply different CSS classes to the image container `div` (around line 196) and the `img` tag (around line 197) based on the `uploadType` prop passed to `FileUploadItem`.

2.  **Styles for 9:16 Types (`productImage`, `sceneImageV1`, `sceneImageV2`):**
    *   **Container `div` (L196):** Add Tailwind classes `aspect-[9/16]` and `overflow-hidden`. Retain existing `rounded-md bg-muted`.
    *   **Image `img` (L197):** Apply Tailwind classes `w-full h-full object-contain`.

3.  **Styles for Other Image Types (e.g., `image`):**
    *   **Container `div` (L196):** Apply Tailwind class `w-full`. Retain existing `rounded-md bg-muted`.
    *   **Image `img` (L197):** Apply Tailwind classes `max-w-full h-auto block`.

4.  **Method:** Use JavaScript logic (e.g., ternary operators or helper functions) within the `className` attributes to apply the styles conditionally based on whether `uploadType` is one of the specified 9:16 types.

**Mermaid Diagram:**

```mermaid
graph TD
    A[Start: User wants conditional 9:16 ratio] --> B[Target: FileUploadItem in SceneDetailPanel.tsx];
    B --> C{Check uploadType prop};
    C -- 'productImage', 'sceneImageV1', 'sceneImageV2' --> D[Apply 9:16 Styles];
    C -- Other image types --> E[Apply Dynamic Styles];
    D --> F[Container (L196): aspect-[9/16], overflow-hidden, rounded-md, bg-muted];
    D --> G[Image (L197): w-full, h-full, object-contain];
    E --> H[Container (L196): w-full, rounded-md, bg-muted];
    E --> I[Image (L197): max-w-full, h-auto, block];
    F & G & H & I --> J[Plan Confirmed];
```

**Next Step:** Switch to Code mode for implementation.