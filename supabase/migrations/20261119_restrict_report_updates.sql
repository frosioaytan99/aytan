-- Staff can process reports, but must not rewrite their evidence or reporter.
REVOKE UPDATE ON TABLE public.reports FROM authenticated;
GRANT UPDATE (status) ON TABLE public.reports TO authenticated;
