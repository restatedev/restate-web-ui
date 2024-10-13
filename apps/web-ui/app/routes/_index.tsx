import { redirect } from '@remix-run/react';

export const clientLoader = () => redirect('/overview');
export default () => null;
