import { RestateServer } from './RestateServer';

function Component() {
  return (
    <div className="flex-auto grid gap-6 [grid-template-columns:1fr] md:[grid-template-columns:1fr_150px_1fr] items-center">
      <div className=""></div>
      <RestateServer className="hidden md:block" />
      <div className=""></div>
    </div>
  );
}

export const overview = { Component };
