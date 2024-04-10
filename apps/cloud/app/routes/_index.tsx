import { Component, loader } from '@restate/routes/cloud-index';
import { withAuth } from '@restate/util/auth';

export const clientLoader = withAuth(loader);
export default Component;
