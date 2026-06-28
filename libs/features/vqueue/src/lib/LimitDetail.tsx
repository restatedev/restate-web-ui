// TODO: render the biting limit-counter detail here — the counter actually
// holding the head (usage / cap / available / waiters / rule). It should be
// backed by sys_user_limits (+ sys_rules) keyed off blocked_on_json (scope +
// blocked_level + blocked_rule) in getVqueue, and addressed by that biting
// counter (NOT the vqueue's own scope/limit_key). Placeholder for now.
export function LimitDetail() {
  return (
    <div className="rounded-lg border border-dashed border-black/10 bg-white/50 px-2.5 py-2 text-2xs text-gray-400 italic">
      Limit usage — coming soon
    </div>
  );
}
