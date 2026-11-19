-- Members may only accept or decline requests addressed to them.
-- Restrict column privileges so a recipient cannot rewrite the sender,
-- recipient, or creation timestamp of an existing request.
REVOKE UPDATE ON TABLE public.friend_requests FROM authenticated;
GRANT UPDATE (status, updated_at) ON TABLE public.friend_requests TO authenticated;

DROP POLICY IF EXISTS friend_requests_recipient_update ON public.friend_requests;

CREATE POLICY friend_requests_recipient_update
ON public.friend_requests
FOR UPDATE
TO authenticated
USING (
  recipient_id = (SELECT auth.uid())
  AND status = 'pending'
)
WITH CHECK (
  recipient_id = (SELECT auth.uid())
  AND status IN ('accepted', 'declined')
  AND (
    status <> 'accepted'
    OR NOT public.is_blocked_between(sender_id, recipient_id)
  )
);
