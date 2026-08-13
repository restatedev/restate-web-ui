import { ReactNode, Ref } from 'react';
import { LabelContext, GroupContext } from 'react-aria-components';
import { tv } from '@restate/util/styles';

const styles = tv({
  base: '',
});
// https://react-spectrum.adobe.com/react-aria/Group.html#advanced-customization
export function LabeledGroup({
  className,
  children,
  id,
  ref,
}: {
  className?: string;
  children: ReactNode;
  id: string;
  ref?: Ref<HTMLDivElement>;
}) {
  return (
    <LabelContext.Provider value={{ id, elementType: 'span' }}>
      <GroupContext.Provider value={{ 'aria-labelledby': id }}>
        <div ref={ref} className={styles({ className })}>
          {children}
        </div>
      </GroupContext.Provider>
    </LabelContext.Provider>
  );
}
