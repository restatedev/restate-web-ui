import type { Deployment } from '@restate/data-access/admin-api';

export type HTTPDeployment = Exclude<Deployment, { arn: string }>;
export type LambdaDeployment = Exclude<Deployment, { uri: string }>;
export type DeploymentType = 'uri' | 'arn';
export function isHttpDeployment(
  deployment: Deployment
): deployment is HTTPDeployment {
  return 'uri' in deployment;
}
export function isLambdaDeployment(
  deployment: Deployment
): deployment is LambdaDeployment {
  return 'arn' in deployment;
}
export function getEndpoint(deployment?: Deployment) {
  if (!deployment) {
    return undefined;
  }
  if (isHttpDeployment(deployment)) {
    return deployment.uri;
  } else {
    return deployment.arn;
  }
}
