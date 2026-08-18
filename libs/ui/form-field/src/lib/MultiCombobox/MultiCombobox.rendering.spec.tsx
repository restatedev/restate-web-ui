import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { useListData } from 'react-stately';
import { FormFieldMultiCombobox } from './MultiCombobox';

interface Item {
  id: string;
  textValue: string;
}

function Tag({ item, onRemove }: { item: Item; onRemove?: VoidFunction }) {
  useState(item.id);

  return <button onClick={onRemove}>{item.textValue}</button>;
}

function Harness() {
  const selectedList = useListData<Item>({
    initialItems: [
      { id: 'alpha', textValue: 'Alpha' },
      { id: 'beta', textValue: 'Beta' },
    ],
  });

  return (
    <FormFieldMultiCombobox
      label="Items"
      items={[]}
      selectedList={selectedList}
    >
      {Tag}
    </FormFieldMultiCombobox>
  );
}

describe('FormFieldMultiCombobox tag rendering', () => {
  it('keeps tag hooks isolated when a tag is removed', () => {
    render(<Harness />);

    fireEvent.click(screen.getByRole('button', { name: 'Alpha' }));

    expect(screen.queryByText('Alpha')).toBeNull();
    expect(screen.getByRole('button', { name: 'Beta' })).toBeTruthy();
  });
});
