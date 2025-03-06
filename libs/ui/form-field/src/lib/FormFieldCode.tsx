import { focusRing } from '@restate/ui/focus';
import { useRef, useState } from 'react';
import { tv } from 'tailwind-variants';

const inputStyles = tv({
  extend: focusRing,
  base: 'flex-1 block invalid:border-red-600 invalid:bg-red-100/70 focus:outline focus:border-gray-200 disabled:text-gray-500/80 disabled:placeholder:text-gray-300 disabled:bg-gray-100 disabled:border-gray-100 disabled:shadow-none focus:shadow-none focus:outline-blue-600 focus:[box-shadow:inset_0_1px_0px_0px_rgba(0,0,0,0.03)] shadow-[inset_0_1px_0px_0px_rgba(0,0,0,0.03)] mt-0 bg-gray-100 rounded-lg border border-gray-200 py-1.5 placeholder:text-gray-500/70 px-2 w-full min-w-0 text-sm text-gray-900',
});

export function FormFieldCode({
  name,
  value,
  autoFocus,
  className,
  onInput,
}: {
  name: string;
  value?: string;
  autoFocus?: boolean;
  className?: string;
  onInput?: (value: string) => void;
}) {
  const [content] = useState(() => parseValue(value));
  const textareaRef = useRef<HTMLInputElement | null>(null);

  return (
    <>
      <pre>
        <code
          tabIndex={0}
          autoFocus={autoFocus}
          className={inputStyles({ className })}
          contentEditable
          onInput={(e) => {
            if (textareaRef.current) {
              textareaRef.current.value = stringifyValue(
                e.currentTarget.innerText
              );
              onInput?.(textareaRef.current.value);
            }
          }}
          ref={(el) => {
            if (el && !el.innerText) {
              el.innerText = content ?? '';
            }
          }}
          spellCheck="false"
        />
      </pre>
      <input
        type="hidden"
        className="hidden"
        name={name}
        ref={textareaRef}
        aria-label="hidden"
      />
    </>
  );
}

function parseValue(value?: string) {
  if (!value) {
    return value;
  }
  try {
    return JSON.stringify(JSON.parse(value), null, 2);
  } catch (error) {
    return value;
  }
}

function stringifyValue(value: string) {
  try {
    return JSON.stringify(JSON.parse(value));
  } catch (error) {
    return value;
  }
}
