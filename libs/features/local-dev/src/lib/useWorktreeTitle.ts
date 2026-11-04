import { useEffect } from 'react';

export function useWorktreeTitle(branch?: string) {
  useEffect(() => {
    if (!branch) return;
    const prefix = `${branch} · `;
    const addPrefix = () => {
      if (!document.title.startsWith(prefix)) {
        document.title = prefix + document.title;
      }
    };
    addPrefix();
    const observer = new MutationObserver(addPrefix);
    observer.observe(document.head, {
      childList: true,
      subtree: true,
      characterData: true,
    });
    return () => observer.disconnect();
  }, [branch]);
}
