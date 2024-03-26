import { type components } from './api';

type Role = components['schemas']['Role'];
export function isRole(param: any): param is Role {
  return ['rst:role::FullAccess'].includes(param);
}
