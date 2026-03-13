import type { ReactNode } from 'react';

export interface InvocationsSummaryData {
  totalCount: number;
  isEstimate: boolean;
  byStatus: { name: string; count: number; isIncluded: boolean }[];
  byService: { name: string; count: number; isIncluded: boolean }[];
  byServiceAndStatus: {
    service: string;
    status: string;
    count: number;
    isIncluded: boolean;
  }[];
  duration?: {
    p50: number;
    p90: number;
    p99: number;
  };
}

export interface InvocationsSummaryProps {
  data?: InvocationsSummaryData;
  isPending?: boolean;
  error?: Error | null;
  onClick?: (params: { status?: string; service?: string }) => void;
  toolbar?: ReactNode;
}

export interface StatusColumn {
  key: string;
  label: string;
  statuses: string[];
  count: number;
  isIncluded: boolean;
}

export interface ServiceRow {
  name: string;
  count: number;
  isIncluded: boolean;
  isOthers?: boolean;
  isAllServices?: boolean;
}

export interface CellData {
  service: string;
  columnKey: string;
  count: number;
  serviceTotal: number;
  columnTotal: number;
}
