import { useEffect, useMemo, useRef, useState } from 'react';
import type { editor } from 'monaco-editor';
import { Editor } from '@restate/ui/editor';
import { useQuery } from '@tanstack/react-query';

import { Ellipsis } from '@restate/ui/loading';
import { Badge } from '@restate/ui/badge';
import { Icon, IconName } from '@restate/ui/icons';

const encoder = new TextEncoder();
const decoder = new TextDecoder('utf-8');
const MAGIC = encoder.encode('RTv1\0');

function getBinary(value: string) {
  try {
    if (value.startsWith('RTv1\0')) {
      return encoder.encode(value);
    }
    return new Uint8Array(Object.values(JSON.parse(value)));
  } catch (error) {
    return new Uint8Array();
  }
}

function isBinaryEncrypted(u8: Uint8Array) {
  if (u8.length < MAGIC.length) return false;
  for (let i = 0; i < MAGIC.length; i++) {
    if (u8[i] !== MAGIC[i]) return false;
  }
  return true;
}

export function Value({
  value,
  className,
}: {
  value?: string;
  className?: string;
}) {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const { binary, isEncrypted } = useMemo(() => {
    if (value) {
      const binary = getBinary(value);
      return {
        binary,
        isEncrypted: isBinaryEncrypted(binary),
      };
    } else {
      return {};
    }
  }, [value]);
  const decryptEndpoint = localStorage.getItem('baseUrlEncryption')
    ? localStorage.getItem('baseUrlEncryption')?.replace(/\/$/, '') + '/decrypt'
    : undefined;

  const { data: decryptedValue, isPending } = useQuery({
    queryKey: [binary, 'decrypt'],
    queryFn: ({ queryKey }) => {
      const [] = queryKey;
      return fetch(String(decryptEndpoint), {
        method: 'POST',
        body: binary,
        headers: {
          'Content-Type': 'application/octet-stream',
          Accept: 'application/octet-stream',
        },
      })
        .then((res) => res.arrayBuffer())
        .then((buffer) => {
          const receivedBinary = new Uint8Array(buffer);
          return decoder.decode(receivedBinary);
        });
    },
    enabled: Boolean(isEncrypted && decryptEndpoint),
    staleTime: Infinity,
    refetchOnMount: false,
    placeholderData: value,
  });

  useEffect(() => {
    if (editorRef.current && decryptedValue) {
      editorRef.current.setValue(decryptedValue);
    }
  }, [decryptedValue]);

  if (typeof value === 'undefined') {
    return null;
  }

  if (isEncrypted) {
    return (
      <div>
        {isEncrypted && (
          <Badge
            className="absolute top-2 right-1.5 flex items-center gap-1 rounded-sm p-1 py-0 text-2xs"
            variant="info"
            size="sm"
          >
            <Icon name={IconName.Security} className="h-3 w-3" /> Encrypted
          </Badge>
        )}
        {isPending && isEncrypted && <Ellipsis>Decrypting</Ellipsis>}
        <Editor
          value={decryptedValue}
          editorRef={editorRef}
          readonly
          className={className}
        />
      </div>
    );
  }
  return (
    <Editor
      value={value}
      editorRef={editorRef}
      readonly
      className={className}
    />
  );
}
