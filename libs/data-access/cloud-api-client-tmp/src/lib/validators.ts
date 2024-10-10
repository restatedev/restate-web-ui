import { Role } from './types';

export function isRole(param: any): param is Role {
  return [
    'rst:role::FullAccess',
    'rst:role::IngressAccess',
    'rst:role::AdminAccess',
    'rst:role::CompleteAwakeableAccess',
  ].includes(param);
}
