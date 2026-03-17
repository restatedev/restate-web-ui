import type { InvocationsSummaryData } from './types';

function crossProduct(
  services: string[],
  statuses: string[],
  generator: (service: string, status: string) => number,
): InvocationsSummaryData['byServiceAndStatus'] {
  const result: InvocationsSummaryData['byServiceAndStatus'] = [];
  for (const service of services) {
    for (const status of statuses) {
      const count = generator(service, status);
      result.push({ service, status, count, isIncluded: true });
    }
  }
  return result;
}

function summarize(
  cross: InvocationsSummaryData['byServiceAndStatus'],
  serviceIncluded?: Record<string, boolean>,
  statusIncluded?: Record<string, boolean>,
): Pick<
  InvocationsSummaryData,
  'totalCount' | 'byStatus' | 'byService' | 'byServiceAndStatus'
> {
  const byStatusMap = new Map<string, number>();
  const byServiceMap = new Map<string, number>();

  for (const entry of cross) {
    byStatusMap.set(
      entry.status,
      (byStatusMap.get(entry.status) ?? 0) + entry.count,
    );
    byServiceMap.set(
      entry.service,
      (byServiceMap.get(entry.service) ?? 0) + entry.count,
    );
  }

  const byStatus = Array.from(byStatusMap.entries()).map(([name, count]) => ({
    name,
    count,
    isIncluded: statusIncluded?.[name] ?? true,
  }));

  const byService = Array.from(byServiceMap.entries()).map(([name, count]) => ({
    name,
    count,
    isIncluded: serviceIncluded?.[name] ?? true,
  }));

  const totalCount = byStatus.reduce((sum, s) => sum + s.count, 0);

  const byServiceAndStatus = cross.map((entry) => ({
    ...entry,
    isIncluded:
      (statusIncluded?.[entry.status] ?? true) &&
      (serviceIncluded?.[entry.service] ?? true),
  }));

  return { totalCount, byStatus, byService, byServiceAndStatus };
}

const ALL_STATUSES = [
  'ready',
  'scheduled',
  'pending',
  'running',
  'backing-off',
  'paused',
  'suspended',
  'succeeded',
  'failed',
  'cancelled',
  'killed',
];

const SERVICES_5 = [
  'cart-service',
  'checkout-service',
  'inventory-service',
  'payment-service',
  'notification-service',
];

const SERVICES_12 = [
  ...SERVICES_5,
  'user-service',
  'order-service',
  'shipping-service',
  'analytics-service',
  'search-service',
  'recommendation-service',
  'auth-service',
];

const SERVICES_20 = [
  ...SERVICES_12,
  'billing-service',
  'catalog-service',
  'review-service',
  'coupon-service',
  'email-service',
  'webhook-service',
  'scheduler-service',
  'audit-service',
];

export const MOCK_SCENARIOS: {
  name: string;
  description: string;
  data: InvocationsSummaryData;
}[] = [
  {
    name: 'Healthy (full scan)',
    description:
      'Full scan — most invocations succeeded, few failures across 5 services',
    data: {
      ...summarize(
        crossProduct(SERVICES_5, ALL_STATUSES, (svc, status) => {
          const base =
            svc === 'cart-service' ? 3 : svc === 'checkout-service' ? 2 : 1;
          switch (status) {
            case 'succeeded':
              return base * 5000;
            case 'running':
              return base * 200;
            case 'pending':
              return base * 50;
            case 'scheduled':
              return base * 30;
            case 'failed':
              return base * 15;
            case 'ready':
              return base * 10;
            default:
              return base * 2;
          }
        }),
      ),
      isEstimate: false,
    },
  },
  {
    name: 'Healthy (sampled)',
    description: 'Sampled — same healthy system, shows percentages',
    data: {
      ...summarize(
        crossProduct(SERVICES_5, ALL_STATUSES, (svc, status) => {
          const base =
            svc === 'cart-service' ? 3 : svc === 'checkout-service' ? 2 : 1;
          switch (status) {
            case 'succeeded':
              return base * 5000;
            case 'running':
              return base * 200;
            case 'pending':
              return base * 50;
            case 'scheduled':
              return base * 30;
            case 'failed':
              return base * 15;
            case 'ready':
              return base * 10;
            default:
              return base * 2;
          }
        }),
      ),
      isEstimate: true,
    },
  },
  {
    name: 'High failure (full scan)',
    description:
      'Full scan — significant failures in payment and checkout services',
    data: {
      ...summarize(
        crossProduct(SERVICES_5, ALL_STATUSES, (svc, status) => {
          const isProblematic =
            svc === 'payment-service' || svc === 'checkout-service';
          switch (status) {
            case 'succeeded':
              return isProblematic ? 800 : 4000;
            case 'failed':
              return isProblematic ? 3200 : 50;
            case 'backing-off':
              return isProblematic ? 500 : 10;
            case 'running':
              return isProblematic ? 100 : 300;
            case 'cancelled':
              return isProblematic ? 200 : 5;
            case 'killed':
              return isProblematic ? 50 : 0;
            default:
              return 20;
          }
        }),
      ),
      isEstimate: false,
    },
  },
  {
    name: 'Many services (sampled)',
    description: 'Sampled — 20 services, shows Others row and percentages',
    data: {
      ...summarize(
        crossProduct(SERVICES_20, ALL_STATUSES, (svc, status) => {
          const idx = SERVICES_20.indexOf(svc);
          const scale = Math.max(1, 20 - idx);
          switch (status) {
            case 'succeeded':
              return scale * 300;
            case 'running':
              return scale * 20;
            case 'failed':
              return scale * 5;
            case 'pending':
              return scale * 8;
            default:
              return scale;
          }
        }),
      ),
      isEstimate: true,
    },
  },
  {
    name: 'Status filter (full scan)',
    description:
      'Full scan — only running + failed statuses are selected in filters',
    data: {
      ...summarize(
        crossProduct(SERVICES_5, ALL_STATUSES, (svc, status) => {
          const base = svc === 'cart-service' ? 3 : 1;
          switch (status) {
            case 'succeeded':
              return base * 5000;
            case 'running':
              return base * 400;
            case 'failed':
              return base * 100;
            case 'pending':
              return base * 50;
            default:
              return base * 10;
          }
        }),
        undefined,
        {
          ready: false,
          scheduled: false,
          pending: false,
          running: true,
          'backing-off': false,
          paused: false,
          suspended: false,
          succeeded: false,
          failed: true,
          cancelled: true,
          killed: true,
        },
      ),
      isEstimate: false,
    },
  },
  {
    name: 'Service filter (full scan)',
    description:
      'Full scan — two services explicitly selected, others still visible',
    data: {
      ...summarize(
        crossProduct(SERVICES_12, ALL_STATUSES, (svc, status) => {
          const idx = SERVICES_12.indexOf(svc);
          const scale = Math.max(1, 12 - idx);
          switch (status) {
            case 'succeeded':
              return scale * 800;
            case 'running':
              return scale * 40;
            case 'failed':
              return scale * 12;
            default:
              return scale * 3;
          }
        }),
        {
          'cart-service': true,
          'checkout-service': false,
          'inventory-service': false,
          'payment-service': true,
          'notification-service': false,
          'user-service': false,
          'order-service': false,
          'shipping-service': false,
          'analytics-service': false,
          'search-service': false,
          'recommendation-service': false,
          'auth-service': false,
        },
      ),
      isEstimate: false,
    },
  },
  {
    name: 'Mostly suspended (full scan)',
    description: 'Full scan — many long-running suspended workflows',
    data: {
      ...summarize(
        crossProduct(SERVICES_5, ALL_STATUSES, (svc, status) => {
          const base = svc === 'order-service' ? 4 : 1;
          switch (status) {
            case 'suspended':
              return base * 8000;
            case 'succeeded':
              return base * 2000;
            case 'running':
              return base * 100;
            case 'paused':
              return base * 500;
            default:
              return base * 10;
          }
        }),
      ),
      isEstimate: false,
    },
  },
  {
    name: 'Dominant service (sampled)',
    description:
      'Sampled — one service has 95% of all traffic, shows percentages',
    data: {
      ...summarize(
        crossProduct(SERVICES_5, ALL_STATUSES, (svc, status) => {
          const isDominant = svc === 'cart-service';
          switch (status) {
            case 'succeeded':
              return isDominant ? 50000 : 200;
            case 'running':
              return isDominant ? 2000 : 10;
            case 'failed':
              return isDominant ? 500 : 5;
            case 'pending':
              return isDominant ? 300 : 3;
            default:
              return isDominant ? 50 : 1;
          }
        }),
      ),
      isEstimate: true,
    },
  },
  {
    name: 'Even distribution (full scan)',
    description: 'Full scan — all services and statuses have similar counts',
    data: {
      ...summarize(
        crossProduct(SERVICES_5, ALL_STATUSES, () => {
          return 500 + Math.floor(Math.random() * 100);
        }),
      ),
      isEstimate: false,
    },
  },
  {
    name: 'Backing-off storm (full scan)',
    description: 'Full scan — widespread retry storms across services',
    data: {
      ...summarize(
        crossProduct(SERVICES_12, ALL_STATUSES, (svc, status) => {
          const idx = SERVICES_12.indexOf(svc);
          const affected = idx < 6;
          switch (status) {
            case 'backing-off':
              return affected ? 3000 + idx * 200 : 10;
            case 'failed':
              return affected ? 1000 + idx * 100 : 5;
            case 'succeeded':
              return 500;
            case 'running':
              return affected ? 200 : 50;
            default:
              return 5;
          }
        }),
      ),
      isEstimate: false,
    },
  },
  {
    name: '1 invocation (full scan)',
    description: 'Full scan — one service with a single running invocation',
    data: {
      ...summarize(
        crossProduct(['cart-service'], ALL_STATUSES, (_svc, status) => {
          return status === 'running' ? 1 : 0;
        }),
      ),
      isEstimate: false,
    },
  },
  {
    name: 'Single service (full scan)',
    description:
      'Full scan — one service with a realistic distribution of statuses',
    data: {
      ...summarize(
        crossProduct(['cart-service'], ALL_STATUSES, (_svc, status) => {
          switch (status) {
            case 'succeeded':
              return 12000;
            case 'running':
              return 800;
            case 'pending':
              return 200;
            case 'scheduled':
              return 150;
            case 'failed':
              return 95;
            case 'backing-off':
              return 40;
            case 'suspended':
              return 300;
            case 'ready':
              return 60;
            case 'paused':
              return 15;
            default:
              return 5;
          }
        }),
      ),
      isEstimate: false,
    },
  },
  {
    name: 'Ready backlog (full scan)',
    description: 'Full scan — massive ready queue dwarfing all other statuses',
    data: {
      ...summarize(
        crossProduct(SERVICES_5, ALL_STATUSES, (svc, status) => {
          const base = svc === 'cart-service' ? 3 : 1;
          switch (status) {
            case 'ready':
              return base * 200;
            case 'succeeded':
              return base * 2000;
            case 'running':
              return base * 100;
            case 'pending':
              return base * 50;
            case 'failed':
              return base * 10;
            default:
              return base * 5;
          }
        }),
      ),
      isEstimate: false,
    },
  },
  {
    name: 'No invocations svc (full scan)',
    description:
      'Full scan — two services registered but only one has invocations',
    data: {
      ...summarize(
        crossProduct(
          ['cart-service', 'payment-service'],
          ALL_STATUSES,
          (svc, status) => {
            if (svc === 'payment-service') return 0;
            switch (status) {
              case 'succeeded':
                return 5000;
              case 'running':
                return 300;
              case 'pending':
                return 100;
              case 'failed':
                return 50;
              default:
                return 10;
            }
          },
        ),
      ),
      isEstimate: false,
    },
  },
  {
    name: 'Huge running (full scan)',
    description:
      'Full scan — massive number of running invocations across services',
    data: {
      ...summarize(
        crossProduct(SERVICES_5, ALL_STATUSES, (svc, status) => {
          const base =
            svc === 'cart-service' ? 5 : svc === 'checkout-service' ? 3 : 1;
          switch (status) {
            case 'running':
              return base * 10000;
            case 'pending':
              return base * 2000;
            case 'succeeded':
              return base * 500;
            case 'scheduled':
              return base * 300;
            case 'ready':
              return base * 50;
            case 'failed':
              return base * 20;
            case 'backing-off':
              return base * 100;
            default:
              return base * 5;
          }
        }),
      ),
      isEstimate: false,
    },
  },
  {
    name: 'One svc failing (sampled)',
    description:
      'Sampled — payment service causing almost all failures and backing-off',
    data: {
      ...summarize(
        crossProduct(SERVICES_5, ALL_STATUSES, (svc, status) => {
          const isProblematic = svc === 'payment-service';
          switch (status) {
            case 'succeeded':
              return isProblematic ? 200 : 3000;
            case 'failed':
              return isProblematic ? 4500 : 15;
            case 'backing-off':
              return isProblematic ? 2800 : 5;
            case 'running':
              return isProblematic ? 50 : 300;
            case 'pending':
              return isProblematic ? 800 : 20;
            case 'cancelled':
              return isProblematic ? 300 : 2;
            case 'killed':
              return isProblematic ? 100 : 0;
            default:
              return 10;
          }
        }),
      ),
      isEstimate: true,
    },
  },
  {
    name: 'Small incident (sampled)',
    description:
      'Sampled — tiny payment-service failing hard while large services cruise at high throughput',
    data: {
      ...summarize(
        crossProduct(
          [
            'order-service',
            'catalog-service',
            'search-service',
            'user-service',
            'payment-service',
          ],
          ALL_STATUSES,
          (svc, status) => {
            if (svc === 'payment-service') {
              switch (status) {
                case 'succeeded':
                  return 120;
                case 'failed':
                  return 85;
                case 'backing-off':
                  return 60;
                case 'running':
                  return 8;
                case 'pending':
                  return 15;
                case 'cancelled':
                  return 12;
                case 'killed':
                  return 3;
                default:
                  return 0;
              }
            }
            const scale =
              svc === 'order-service'
                ? 5
                : svc === 'catalog-service'
                  ? 4
                  : svc === 'search-service'
                    ? 3
                    : 2;
            switch (status) {
              case 'succeeded':
                return scale * 12000;
              case 'running':
                return scale * 400;
              case 'pending':
                return scale * 30;
              case 'scheduled':
                return scale * 20;
              case 'ready':
                return scale * 5;
              case 'failed':
                return scale * 3;
              default:
                return 0;
            }
          },
        ),
      ),
      isEstimate: true,
    },
  },
  {
    name: 'System-wide degradation (sampled)',
    description:
      'Sampled — all services experiencing elevated failures, backing-off, and pending queues',
    data: {
      ...summarize(
        crossProduct(SERVICES_12, ALL_STATUSES, (svc, status) => {
          const idx = SERVICES_12.indexOf(svc);
          const scale = Math.max(1, 12 - idx);
          switch (status) {
            case 'succeeded':
              return scale * 600;
            case 'failed':
              return scale * 350;
            case 'backing-off':
              return scale * 280;
            case 'pending':
              return scale * 400;
            case 'running':
              return scale * 150;
            case 'cancelled':
              return scale * 60;
            case 'killed':
              return scale * 15;
            case 'paused':
              return scale * 40;
            case 'ready':
              return scale * 90;
            case 'scheduled':
              return scale * 20;
            case 'suspended':
              return scale * 10;
            default:
              return scale * 5;
          }
        }),
      ),
      isEstimate: true,
    },
  },
  {
    name: 'Paused hotspots (full scan)',
    description:
      'Full scan — order and payment services have disproportionately many paused invocations',
    data: {
      ...summarize(
        crossProduct(SERVICES_12, ALL_STATUSES, (svc, status) => {
          const idx = SERVICES_12.indexOf(svc);
          const scale = Math.max(1, 12 - idx);
          const isPausedHotspot =
            svc === 'order-service' || svc === 'payment-service';
          switch (status) {
            case 'succeeded':
              return scale * 800;
            case 'running':
              return scale * 30;
            case 'pending':
              return scale * 10;
            case 'paused':
              return isPausedHotspot ? 2500 + idx * 300 : scale * 3;
            case 'failed':
              return isPausedHotspot ? 120 : scale * 5;
            case 'backing-off':
              return isPausedHotspot ? 80 : scale * 2;
            case 'suspended':
              return scale * 15;
            default:
              return scale;
          }
        }),
      ),
      isEstimate: false,
    },
  },
  {
    name: 'Empty',
    description: 'No invocations at all',
    data: {
      totalCount: 0,
      isEstimate: false,
      byStatus: [],
      byService: [],
      byServiceAndStatus: [],
    },
  },
];
