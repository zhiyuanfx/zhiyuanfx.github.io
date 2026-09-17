interface ReturnPosition { url: string; y: number; linkIndex: number }
const storagePrefix = 'zhiyuan-note-return:';
function readPosition(key: string | null): ReturnPosition | null {
  if (!key) return null;
  try {
    const value = JSON.parse(sessionStorage.getItem(storagePrefix + key) || 'null');
    if (!value || !Number.isFinite(value.y) || value.y < 0) return null;
    const url = new URL(value.url, location.origin);
    if (url.origin !== location.origin || url.pathname !== '/') return null;
    return value;
  } catch { return null; }
}
export function setupNoteNavigation() {
  const isHome = location.pathname === '/';
  if (isHome) {
    history.scrollRestoration = 'manual';
    // Retain incoming links from the original version.
    if (location.hash === '#blogs') location.replace(location.pathname + location.search + '#notes');
    document.addEventListener('click', (event) => {
      const link = (event.target as Element).closest<HTMLAnchorElement>('a[data-note-link]');
      if (!link || event.button !== 0) return;
      const section = link.closest<HTMLElement>('section[data-section]');
      const returnUrl = new URL(location.href);
      returnUrl.searchParams.delete('restore');
      if (section) returnUrl.hash = section.id;
      const position = { url: returnUrl.pathname + returnUrl.search + returnUrl.hash, y: scrollY, linkIndex: [...document.querySelectorAll('a[data-note-link]')].indexOf(link) };
      const key = crypto.randomUUID();
      const target = new URL(link.href);
      try {
        sessionStorage.setItem(storagePrefix + key, JSON.stringify(position));
        target.searchParams.set('return', key);
      } catch {
        // Still return to the right section if storage is disabled.
        target.searchParams.set('from', section?.id || 'notes');
      }
      history.replaceState({ ...history.state, notePosition: position }, '', location.href);
      link.href = target.pathname + target.search;
    });
    const restorePosition = async () => {
      const url = new URL(location.href);
      const position = readPosition(url.searchParams.get('restore')) || history.state?.notePosition;
      if (!position) { document.documentElement.classList.remove('restoring-position'); return; }
      if (url.searchParams.has('restore')) {
        url.searchParams.delete('restore');
        history.replaceState({ ...history.state, notePosition: position }, '', url);
      }
      await document.fonts.ready;
      requestAnimationFrame(() => requestAnimationFrame(() => {
        // NotesList has now restored the same filter/order and therefore the same layout.
        window.scrollTo({ top: position.y, behavior: 'instant' });
        document.querySelectorAll<HTMLAnchorElement>('a[data-note-link]')[position.linkIndex]?.focus({ preventScroll: true });
        document.documentElement.classList.remove('restoring-position');
      }));
    };
    window.addEventListener('pageshow', restorePosition);
    if (document.readyState === 'complete') void restorePosition();
  } else {
    const params = new URLSearchParams(location.search);
    const key = params.get('return');
    const position = readPosition(key);
    const back = new URL(position?.url || '/#notes', location.origin);
    if (position && key) back.searchParams.set('restore', key);
    else {
      if (params.get('q')) back.searchParams.set('q', params.get('q')!);
      if (params.get('sort') === 'asc') back.searchParams.set('sort', 'asc');
      const section = params.get('from');
      if (section && ['research', 'projects', 'experience', 'publications', 'notes'].includes(section)) back.hash = section;
    }
    document.querySelectorAll<HTMLAnchorElement>('.back-link').forEach(link => {
      link.href = back.pathname + back.search + back.hash;
    });
  }
}
