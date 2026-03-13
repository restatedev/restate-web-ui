export const STATUS_COLUMNS = [
  { key: 'ready', label: 'Ready', statuses: ['ready'] },
  { key: 'scheduled', label: 'Scheduled', statuses: ['scheduled'] },
  { key: 'pending', label: 'Pending', statuses: ['pending'] },
  { key: 'running', label: 'Running', statuses: ['running'] },
  { key: 'backing-off', label: 'Backing-off', statuses: ['backing-off'] },
  { key: 'suspended', label: 'Suspended', statuses: ['suspended'] },
  { key: 'paused', label: 'Paused', statuses: ['paused'] },
  { key: 'succeeded', label: 'Succeeded', statuses: ['succeeded'] },
  {
    key: 'failed',
    label: 'Failed / Cancelled / Killed',
    statuses: ['failed', 'cancelled', 'killed'],
  },
] as const;

export const MAX_VISIBLE_SERVICES = 10;
