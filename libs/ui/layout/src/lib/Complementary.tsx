import { ReactNode, type PropsWithChildren } from 'react';
import { LayoutOutlet } from './Layout';
import { LayoutZone } from './LayoutZone';

interface ComplementaryProps {
  footer?: ReactNode;
  onClose?: VoidFunction;
}

export function Complementary({
  children,
  footer,
  onClose,
}: PropsWithChildren<ComplementaryProps>) {
  return (
    <LayoutOutlet zone={LayoutZone.Complementary}>
      <div className="bg-white p-6 border rounded-xl max-h-[inherit] overflow-auto relative">
        {children}
      </div>
      {footer && (
        <div className="flex gap-2 has-[*]:py-1 has-[*]:pb-0 has-[*]:mt-1">
          {footer}
        </div>
      )}
    </LayoutOutlet>
  );
}
