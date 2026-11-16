type Visibility = { public?: boolean | null };

export function isPublicHandler(
  service: Visibility | undefined,
  handler: Visibility,
) {
  return service?.public !== false && handler.public !== false;
}

export function isPublicService(
  service: (Visibility & { handlers?: Visibility[] | null }) | undefined,
) {
  if (!service) {
    return true;
  }
  if (service.public === false) {
    return false;
  }
  return (
    !service.handlers?.length ||
    service.handlers.some((handler) => isPublicHandler(service, handler))
  );
}
