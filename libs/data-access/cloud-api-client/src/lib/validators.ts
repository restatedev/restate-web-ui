import { type components } from './api';

type Role = components['schemas']['Role'];
export function isRole(param: any): param is Role {
  return [
    'rst:role::FullAccess',
    'rst:role::IngressAccess',
    'rst:role::AdminAccess',
    'rst:role::ResolveAwakeableAccess',
  ].includes(param);
}
