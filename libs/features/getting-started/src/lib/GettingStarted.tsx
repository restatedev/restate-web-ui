import {
  GettingStartedCard,
  GettingStartedCardProps,
} from './GettingStartedCard';

export function GettingStarted({
  left,
  right,
  middle,
  className,
}: {
  left: GettingStartedCardProps;
  right: GettingStartedCardProps;
  middle: GettingStartedCardProps;
  className?: string;
}) {
  return (
    <div className={className}>
      <GettingStartedCard
        {...left}
        className="absolute -bottom-1.5 left-1/2 translate-x-[-150%] translate-y-5 -rotate-12 has-hover:-bottom-1 has-hover:z-[2] has-hover:scale-110 has-hover:pb-8 has-focus:-bottom-1 has-focus:z-[2] has-focus:scale-110 has-focus:pb-8"
      />
      <GettingStartedCard
        {...right}
        className="absolute -bottom-1.5 left-1/2 translate-x-[50%] translate-y-5 rotate-12 has-hover:-bottom-1 has-hover:z-[2] has-hover:scale-110 has-hover:pb-8 has-focus:-bottom-1 has-focus:z-[2] has-focus:scale-110 has-focus:pb-8"
      />
      <GettingStartedCard
        {...middle}
        className="absolute -bottom-0 left-1/2 -translate-x-1/2 translate-y-0.5 rounded-b-none has-hover:bottom-1 has-hover:z-[2] has-hover:scale-110 has-hover:pb-6 has-focus:bottom-1 has-focus:z-[2] has-focus:scale-110 has-focus:pb-6"
      />
    </div>
  );
}
