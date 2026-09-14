import { type ClientLoaderFunction, redirect } from 'react-router';

export const clientLoader: ClientLoaderFunction = ({ params, request }) => {
  const search = new URL(request.url).search;
  return redirect(
    `/tenants/${encodeURIComponent(params.scope ?? '')}/invocations${search}`,
  );
};

export default function TenantIndexRoute() {
  return null;
}
