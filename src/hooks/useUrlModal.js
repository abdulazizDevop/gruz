import { useCallback, useRef } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';

// Marker attached to every history entry WE push for a modal or a
// cross-section drill-down (Оптовики → заказ, Срочные → заказ, ...).
// close() only calls navigate(-1) when the current entry carries it.
// Without it (cold start on a deep link, PWA relaunch, hard reset after
// an update) there is nothing of ours underneath, so we rewrite the URL
// in place instead of popping the user out of the app.
export const PUSHED = { pushed: true };

const liveParam = (param) =>
  new URLSearchParams(window.location.search).get(param);

// Cross-page drill-down (e.g. Оптовики card → /orders?open=<id>).
// pushState is synchronous even though React commits the new location
// later, so a fast double-tap sees the target URL already in place and
// is dropped instead of pushing a duplicate entry — which would have
// made the first Назад / hardware back look like it did nothing.
export const drillTo = (navigate, to) => {
  const target = new URL(to, window.location.origin);
  if (
    window.location.pathname === target.pathname &&
    window.location.search === target.search
  ) {
    return;
  }
  navigate(to, { state: PUSHED });
};

// Keeps a modal's open/closed state in the URL query string so that:
//   - the modal is a real history entry → Android/browser back closes
//     it instead of jumping to whatever section was open before;
//   - Назад inside the modal is navigate(-1) → the user lands exactly
//     where they came from (Оптовики card, Срочные, Заказной склад),
//     not on a hard-coded section;
//   - a page reload keeps the modal open.
//
// Previously the open state lived in React state and the "return to
// section" hint in location.state. The deep-link effect stripped the
// ?open= param with a replace navigation, which react-router treats as
// a fresh location with state=null — so the hint was silently lost and
// every Назад dumped the user onto /orders. Client reported it as
// "обязательно скидывает на оптовики либо заказы".
export function useUrlModal(param) {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const value = searchParams.get(param);

  // Both open() and close() are single-shot per history entry. After a
  // tap the URL changes synchronously but React commits the new location
  // later, and framer-motion keeps the exiting overlay mounted (still
  // clickable, with the OLD onClick closure) for its ~300ms fade. A
  // hasty second tap on Назад / the backdrop in that window used to run
  // navigate(-1) again and throw the user out of the section entirely.
  // The ref is shared by every closure, stale or fresh, so the second
  // tap is swallowed until the navigation actually lands.
  const closedKeyRef = useRef(null);

  const open = useCallback(
    (id) => {
      const cur = liveParam(param);
      if (cur === String(id)) return; // double-tap on the same card
      const next = new URLSearchParams(window.location.search);
      next.set(param, id);
      // Already showing one? Swap in place so back doesn't have to step
      // through every card the user opened. Keep the entry's pushed-ness
      // as it was — a cold-started deep link stays "not ours".
      const replace = Boolean(cur);
      const state = replace && !location.state?.pushed ? null : PUSHED;
      navigate(
        { pathname: location.pathname, search: `?${next.toString()}` },
        { replace, state },
      );
    },
    [location.pathname, location.state, navigate, param],
  );

  const close = useCallback(() => {
    if (closedKeyRef.current === location.key) return;
    if (liveParam(param) === null) return; // pop already landed
    closedKeyRef.current = location.key;
    // If the navigation somehow never lands (nothing to pop to), don't
    // leave the modal stuck un-closable — let a later tap try again.
    setTimeout(() => {
      if (closedKeyRef.current === location.key) closedKeyRef.current = null;
    }, 1000);

    if (location.state?.pushed) {
      navigate(-1);
      return;
    }
    const next = new URLSearchParams(window.location.search);
    next.delete(param);
    const search = next.toString();
    navigate(
      { pathname: location.pathname, search: search ? `?${search}` : '' },
      { replace: true },
    );
  }, [location.key, location.pathname, location.state, navigate, param]);

  return { value, open, close };
}
