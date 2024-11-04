import type { components } from './index'; // generated by openapi-typescript

export type Deployment =
  components['schemas']['ListDeploymentsResponse']['deployments'][number];
export type DetailedDeployment =
  components['schemas']['DetailedDeploymentResponse'];
export type Revision = components['schemas']['ServiceMetadata']['revision'];
export type Service = components['schemas']['ServiceMetadata'];
export type ServiceName = Service['name'];
export type DeploymentId = Deployment['id'];
