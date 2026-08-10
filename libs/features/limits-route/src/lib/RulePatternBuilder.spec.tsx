import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { RulePatternBuilder } from './RulePatternBuilder';
import type { PatternFields } from './pattern';

function PatternBuilderHarness({
  initialFields = { scope: '', level1: '', level2: '' },
}: {
  initialFields?: PatternFields;
}) {
  const [fields, setFields] = useState(initialFields);
  return <RulePatternBuilder fields={fields} onChange={setFields} />;
}

function getInput(name: string) {
  return screen.getByRole('combobox', { name }) as HTMLInputElement;
}

describe('RulePatternBuilder', () => {
  it('enables hierarchy levels from left to right', () => {
    render(<PatternBuilderHarness />);

    const scope = getInput('Scope');
    const level1 = getInput('Limit key level 1');
    const level2 = getInput('Limit key level 2');

    expect(scope.disabled).toBe(false);
    expect(level1.disabled).toBe(true);
    expect(level2.disabled).toBe(true);

    fireEvent.change(scope, { target: { value: 'acme' } });

    expect(level1.disabled).toBe(false);
    expect(level2.disabled).toBe(true);

    fireEvent.change(level1, { target: { value: 'team' } });

    expect(level2.disabled).toBe(false);
  });

  it('clears descendant values when a parent is cleared', () => {
    render(
      <PatternBuilderHarness
        initialFields={{ scope: 'acme', level1: 'team', level2: 'member' }}
      />,
    );

    const scope = getInput('Scope');
    const level1 = getInput('Limit key level 1');
    const level2 = getInput('Limit key level 2');

    fireEvent.change(level1, { target: { value: '' } });

    expect(level1.value).toBe('');
    expect(level2.value).toBe('');
    expect(level2.disabled).toBe(true);

    fireEvent.change(scope, { target: { value: '' } });

    expect(scope.value).toBe('');
    expect(level1.value).toBe('');
    expect(level1.disabled).toBe(true);
  });
});
