import { type ClientLoaderFunction, redirect } from 'react-router';

export const clientLoader: ClientLoaderFunction = ({ request }) => {
  const url = new URL(request.url);
  return redirect(`/overview${url.search}`);
};
export default () => null;
