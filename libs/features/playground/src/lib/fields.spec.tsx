import { fireEvent, render, screen } from '@testing-library/react';
import { InputField } from './fields';
import type { OperationRun } from './useHandlerRun';

vi.mock('./BodyEditor', () => ({
  BodyEditor: ({ ariaLabel, value }: { ariaLabel: string; value: string }) => (
    <textarea aria-label={ariaLabel} value={value} readOnly />
  ),
}));

function run({
  required = false,
  schema,
  hasInput = true,
}: {
  required?: boolean;
  schema?: unknown;
  hasInput?: boolean;
}) {
  return {
    service: 'Greeter',
    draftName: 'greet',
    schemas: [],
    hasInput,
    isInputOptional: hasInput && schema === undefined && !required,
    operation: {
      body: hasInput
        ? { contentType: 'application/json', required, schema }
        : undefined,
    },
    runner: {
      draft: { rawBody: '', bodyMode: 'text' },
      exampleBody: '',
      setDraft: vi.fn(),
      issueFor: () => undefined,
    },
  } as unknown as OperationRun;
}

describe('InputField', () => {
  it('shows an empty editor and a note for an optional input without a schema', () => {
    render(<InputField run={run({})} />);

    const editor = screen.getByRole<HTMLTextAreaElement>('textbox', {
      name: 'Input',
    });
    expect(editor.value).toBe('');
    expect(screen.queryByRole('button', { name: /Add input/ })).toBeNull();

    const note = screen.getByRole('button', { name: 'About Input' });
    fireEvent.click(note);
    expect(note.getAttribute('aria-expanded')).toBe('true');
  });

  it('names the editor after its label', () => {
    render(<InputField run={run({ required: true })} label="Target" />);

    expect(screen.getByRole('textbox', { name: 'Target' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'About Target' })).toBeNull();
  });

  it('renders nothing for a handler without input', () => {
    const { container } = render(<InputField run={run({ hasInput: false })} />);

    expect(container.innerHTML).toBe('');
  });
});
