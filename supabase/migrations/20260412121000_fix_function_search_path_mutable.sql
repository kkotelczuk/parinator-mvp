-- migration: fix_function_search_path_mutable
-- purpose:
--   resolve supabase linter warning 0011 by pinning function search_path to public.

alter function public.prevent_team_size_change_after_setup_lock() set search_path = public;
alter function public.assert_round_is_mutable_direct() set search_path = public;
alter function public.assert_round_is_mutable_via_pairing_run() set search_path = public;
alter function public.assert_round_is_mutable_via_estimator_session() set search_path = public;
alter function public.hard_reset_round_on_opponent_change() set search_path = public;
alter function public.set_updated_at() set search_path = public;
alter function public.current_membership_id() set search_path = public;
alter function public.current_team_id() set search_path = public;
alter function public.join_codes_apply_ttl() set search_path = public;
alter function public.rounds_enforce_max_200_per_tournament() set search_path = public;
