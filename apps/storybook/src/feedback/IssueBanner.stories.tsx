import type { Meta, StoryObj } from '@storybook/react-vite';
import { useEffect, type PropsWithChildren } from 'react';
import { userEvent, within } from 'storybook/test';
import {
  IssueBadge,
  IssueBannerPill,
  IssuesBannerStack,
} from '@restate/ui-issue-banner';
import {
  issueQueue,
  type IssueContent,
  type ServiceIssue,
} from '@restate/features-system-health';

const lowIssues: ServiceIssue[] = [
  {
    kind: 'sla',
    severity: 'low',
    label: 'More than 1% of unfinished invocations are paused',
    status: 'paused',
  },
];

const highIssues: ServiceIssue[] = [
  {
    kind: 'sla',
    severity: 'high',
    label: 'More than 10% of unfinished invocations are backing off',
    status: 'backing-off',
  },
  {
    kind: 'sla',
    severity: 'low',
    label: 'More than 1% of unfinished invocations are paused',
    status: 'paused',
  },
  {
    kind: 'deprecated-sdk',
    severity: 'low',
    label: 'Deployment uses an outdated SDK version that may lose support',
  },
];

const meta = {
  title: 'Feedback/IssueBanner',
  component: IssueBadge,
  args: { issues: lowIssues, serviceName: 'Checkout', baseUrl: '' },
  parameters: {
    layout: 'padded',
    docs: { story: { inline: false, height: '320px' } },
  },
} satisfies Meta<typeof IssueBadge>;

export default meta;
type Story = StoryObj<typeof meta>;

const openBadge: Story['play'] = async ({ canvasElement }) => {
  await userEvent.click(within(canvasElement).getByRole('button'));
};

export const Low: Story = {};

export const High: Story = {
  args: { issues: highIssues },
  play: openBadge,
};

export const Pill: Story = {
  render: () => (
    <div className="flex flex-col items-start gap-2">
      <IssueBannerPill severity="high">
        More than 10% of unfinished invocations are backing off
      </IssueBannerPill>
      <IssueBannerPill severity="low">
        More than 1% of unfinished invocations are paused
      </IssueBannerPill>
    </div>
  ),
};

export const PillWithDetails: Story = {
  render: () => (
    <IssueBannerPill
      severity="high"
      details={
        new Error(
          'Failed to fetch http://localhost:9070/query/v2/invocations/summary',
        )
      }
    >
      Cannot retrieve invocation data — some dashboard features may not work as
      expected
    </IssueBannerPill>
  ),
  play: openBadge,
};

function IssueFeed({
  issues,
  children,
}: PropsWithChildren<{ issues: IssueContent[] }>) {
  useEffect(() => {
    const keys = issues.map((issue) => issueQueue.add(issue));
    return () => keys.forEach((key) => issueQueue.close(key));
  }, [issues]);
  return children;
}

const singleIssue: IssueContent[] = [
  {
    severity: 'low',
    label: 'More than 1% of unfinished invocations are paused',
  },
];

const severalIssues: IssueContent[] = [
  {
    severity: 'high',
    label: 'More than 10% of unfinished invocations are backing off',
  },
  {
    severity: 'low',
    label: 'More than 1% of unfinished invocations are paused',
  },
  {
    severity: 'low',
    label: "More than 1% of unfinished invocations haven't started yet",
  },
];

export const StackSingle: Story = {
  render: () => (
    <IssueFeed issues={singleIssue}>
      <div className="flex flex-col items-center">
        <IssuesBannerStack />
      </div>
    </IssueFeed>
  ),
};

export const StackSeveral: Story = {
  render: () => (
    <IssueFeed issues={severalIssues}>
      <div className="flex flex-col items-center">
        <IssuesBannerStack />
      </div>
    </IssueFeed>
  ),
  play: openBadge,
};
