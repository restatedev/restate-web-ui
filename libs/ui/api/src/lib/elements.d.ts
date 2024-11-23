// elements.d.ts
import * as React from 'react';

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      'elements-api': React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement>,
        HTMLElement
      > & {
        router?: string;
        layout?: string;
        hideExport?: string;
        apiDescriptionDocument?: string;
      };
    }
  }
}
