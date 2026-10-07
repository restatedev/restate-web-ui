import { useState } from 'react';

export function useDialogDraft<T extends object>(dialogKey: string | null) {
  const [draft, setDraft] = useState<Partial<T>>({});
  const [draftKey, setDraftKey] = useState(dialogKey);
  if (draftKey !== dialogKey) {
    setDraftKey(dialogKey);
    setDraft({});
  }
  return [draft, setDraft] as const;
}
