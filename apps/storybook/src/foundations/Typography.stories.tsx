import type { Meta, StoryObj } from '@storybook/react-vite';

const meta = {
  title: 'Foundations/Typography',
  parameters: { layout: 'padded' },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

const SCALE = [
  ['text-3xs', '10 px', 'Tiny chart and chip labels'],
  ['text-2xs', '11 px', 'Counters, small badges, row metadata'],
  ['text-xs', '12 px', 'Table cells, card rows, captions, editors'],
  ['text-0.5xs', '13 px', 'Dense body text: callouts, snippets, field help'],
  ['text-sm', '14 px', 'Default body: forms, buttons, dialogs, tabs'],
  ['text-base', '16 px', 'Empty-state titles'],
  ['text-lg', '18 px', 'Dialog titles'],
] as const;

const SIZE_CLASS: Record<(typeof SCALE)[number][0], string> = {
  'text-3xs': 'text-3xs',
  'text-2xs': 'text-2xs',
  'text-xs': 'text-xs',
  'text-0.5xs': 'text-0.5xs',
  'text-sm': 'text-sm',
  'text-base': 'text-base',
  'text-lg': 'text-lg',
};

export const Scale: Story = {
  render: () => (
    <div className="flex max-w-3xl flex-col divide-y divide-default rounded-xl border border-default bg-surface">
      {SCALE.map(([name, size, use]) => (
        <div
          key={name}
          className="grid grid-cols-[7rem_4rem_1fr] items-baseline gap-4 px-4 py-3"
        >
          <code className="font-mono text-xs text-secondary">{name}</code>
          <span className="text-xs text-muted tabular-nums">{size}</span>
          <span className="text-primary">
            <span className={SIZE_CLASS[name]}>{use}</span>
          </span>
        </div>
      ))}
    </div>
  ),
};

export const Roles: Story = {
  render: () => (
    <div className="flex max-w-xl flex-col gap-6 rounded-xl border border-default bg-surface p-6">
      <div>
        <span className="rounded-lg bg-accent-subtle px-2 py-1 text-sm font-semibold text-accent">
          List page title
        </span>
        <p className="mt-2 text-sm text-muted">
          Description under a list page title.
        </p>
      </div>
      <h3 className="text-lg leading-6 font-medium text-primary">
        Dialog title
      </h3>
      <span className="text-sm font-medium text-secondary">Field label</span>
      <span className="text-xs font-semibold text-subtle uppercase">
        Section title
      </span>
      <span className="text-xs font-semibold text-primary">Card title</span>
      <div>
        <p className="text-base font-semibold text-primary">
          Empty-state title
        </p>
        <p className="text-sm text-muted">Empty-state description.</p>
      </div>
      <span className="text-xs text-muted">Caption</span>
      <code className="font-mono text-sm text-primary">
        inv_1gQNFQQ1HLWM7jo57gxCUiOlQ5nBYztfXV
      </code>
      <span className="text-sm text-primary tabular-nums">
        1,204 invocations in 3.25 s
      </span>
    </div>
  ),
};
