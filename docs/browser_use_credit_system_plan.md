# Browser AI Task Credit System Implementation Plan

## Goal

*   Charge 1 credit per Browser AI task initiated.
*   Prevent task initiation if the user has insufficient credits.
*   Ensure the credit check and deduction are reliable.

## Affected Files

1.  `src/hooks/use-user-credits.tsx`: (No changes needed, used for reading credits).
2.  `src/components/browser-use/TaskControls.tsx`: (No changes needed, already displays credits and has a basic UI disable).
3.  `src/hooks/use-task-operations.ts`: (Frontend logic: pre-check, pass user ID, refresh credits).
4.  `supabase/functions/browser-use-api/index.ts`: (Backend logic: authoritative credit check, deduction, potential refund).
5.  `supabase/database`: (Required: Add RPC functions for atomic credit deduction and increment/refund).

## Revised Plan Summary

1.  **Frontend:** Perform a preliminary credit check in the UI. Send the `userId` with the task request. Refresh the credit display after the backend confirms success or failure (including potential refunds).
2.  **Backend (Supabase Function):**
    *   Receive the request with `userId`.
    *   Attempt to deduct 1 credit using an atomic database function (RPC, e.g., `decrement_user_credits`).
    *   If deduction fails (insufficient credits), return an error.
    *   If deduction succeeds, call the external `browser-use.com` API.
    *   If the external API call fails, refund the deducted credit using another atomic database function (RPC, e.g., `increment_user_credits`) and return an error.
    *   If the external API call succeeds, record the task in the database and return success.

## Revised Workflow Diagram (Mermaid)

```mermaid
sequenceDiagram
    participant FE as Frontend (TaskControls/useTaskOperations)
    participant SB_Func as Supabase Edge Function (browser-use-api)
    participant Ext_API as External API (browser-use.com)
    participant DB as Supabase DB

    FE->>FE: User clicks "Start Task"
    FE->>FE: Get userCredits (useUserCredits hook)
    alt Credits < 1 (Frontend Check)
        FE->>FE: Show "Insufficient Credits" toast
        FE-->>FE: Abort startTask function
    else Credits >= 1
        FE->>SB_Func: Invoke function (task, config, userId)
        SB_Func->>DB: Call RPC: decrement_user_credits(userId, 1)
        alt RPC returns error (e.g., insufficient funds)
            DB-->>SB_Func: Return error
            SB_Func-->>FE: Return Error (e.g., 402 Insufficient Credits)
            FE->>FE: Show error toast
        else RPC successful (credit deducted)
            DB-->>SB_Func: Return success
            SB_Func->>Ext_API: Call run-task API
            alt External API fails
                 Ext_API-->>SB_Func: Return error
                 SB_Func->>DB: Call RPC: increment_user_credits(userId, 1) # Refund credit
                 DB-->>SB_Func: Confirm refund (or log error if refund fails)
                 SB_Func-->>FE: Return Error (External API failed)
                 FE->>FE: Show error toast
                 FE->>FE: Invalidate userCredits query cache # Refresh after potential refund
            else External API succeeds
                Ext_API-->>SB_Func: Return task_id/success
                SB_Func->>DB: Insert task record into browser_automation_tasks
                DB-->>SB_Func: Confirm task insert
                SB_Func-->>FE: Return Success (taskId, liveUrl)
                FE->>FE: Show "Task Started" toast
                FE->>FE: Update UI state
                FE->>FE: Invalidate userCredits query cache # Refresh after successful deduction
            end
        end
    end