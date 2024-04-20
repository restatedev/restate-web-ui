import { redirect } from '@remix-run/react';

export const clientLoader = () => redirect('./settings');
export default () => null;
