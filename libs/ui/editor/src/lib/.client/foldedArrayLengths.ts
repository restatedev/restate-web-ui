import type * as monaco from 'monaco-editor';

interface Fold {
  startLineNumber: number;
  endLineNumber: number;
}

export function countArrayItems(
  model: Pick<
    monaco.editor.ITextModel,
    | 'getLineContent'
    | 'getLineFirstNonWhitespaceColumn'
    | 'getLineLastNonWhitespaceColumn'
    | 'getValueInRange'
  >,
  { startLineNumber, endLineNumber }: Fold,
) {
  const startColumn = model.getLineLastNonWhitespaceColumn(startLineNumber) - 1;
  if (model.getLineContent(startLineNumber)[startColumn - 1] !== '[') {
    return undefined;
  }

  try {
    const value = JSON.parse(
      model.getValueInRange({
        startLineNumber,
        startColumn,
        endLineNumber,
        endColumn: model.getLineFirstNonWhitespaceColumn(endLineNumber) + 1,
      }),
    );
    return Array.isArray(value) ? value.length : undefined;
  } catch {
    return undefined;
  }
}

// Monaco splits visible ranges around hidden lines, so each gap is a fold.
// JSON folds keep the closing bracket visible as the first character of the
// next visible line, which gives countArrayItems both ends of the array.
export function getFolds(
  editor: Pick<monaco.editor.ICodeEditor, 'getVisibleRanges'>,
): Fold[] {
  const ranges = editor.getVisibleRanges();
  return ranges.flatMap((range, i) => {
    const next = ranges[i + 1];
    return next && next.startLineNumber > range.endLineNumber + 1
      ? [
          {
            startLineNumber: range.endLineNumber,
            endLineNumber: next.startLineNumber,
          },
        ]
      : [];
  });
}

export function showFoldedArrayLengths(
  editor: monaco.editor.IStandaloneCodeEditor,
): monaco.IDisposable {
  const labelDecorations = editor.createDecorationsCollection();
  const cache = new Map<number, number>();

  const update = () => {
    const model = editor.getModel();
    if (!model) {
      return;
    }

    const labels = getFolds(editor).flatMap((fold) => {
      const length =
        cache.get(fold.startLineNumber) ?? countArrayItems(model, fold);
      if (typeof length === 'undefined') {
        return [];
      }
      cache.set(fold.startLineNumber, length);
      const column = model.getLineMaxColumn(fold.startLineNumber);

      return [
        {
          range: {
            startLineNumber: fold.startLineNumber,
            startColumn: column,
            endLineNumber: fold.startLineNumber,
            endColumn: column,
          },
          options: {
            // Monaco drops injected text on an empty range without this; it
            // refers to the zero-width range, not to the fold.
            showIfCollapsed: true,
            after: {
              content: ` ${length} ${length === 1 ? 'item' : 'items'}`,
              inlineClassName: 'text-zinc-400! italic',
            },
          },
        },
      ];
    });

    labelDecorations.set(labels);
  };

  const disposables = [
    editor.onDidChangeModelContent(() => cache.clear()),
    editor.onDidChangeHiddenAreas(update),
    editor.onDidScrollChange(update),
    // Folding resizes the editor after onDidChangeHiddenAreas fires, so folds
    // near the bottom only become visible ranges once the layout updates.
    editor.onDidLayoutChange(update),
  ];

  return {
    dispose() {
      disposables.forEach((d) => d.dispose());
      labelDecorations.clear();
    },
  };
}
