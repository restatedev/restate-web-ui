import { createContext, PropsWithChildren, RefObject, use } from 'react';
import { Placement } from 'react-aria';
import {
  Popover as AriaPopover,
  composeRenderProps,
} from 'react-aria-components';
import { tv } from '@restate/util-styles';

export type PopoverAnimation = 'slide' | 'fade' | 'zoom' | 'none';
export type PopoverSlideFrom = 'trigger' | 'top' | 'bottom' | 'left' | 'right';

const styles = tv({
  base: 'max-w-[90%] overflow-auto rounded-xl border border-(--overlay-edge) bg-overlay/80 bg-clip-padding text-secondary shadow-(--overlay-shadow) backdrop-blur-xl backdrop-saturate-200 transition-none',
  variants: {
    isEntering: { true: '' },
    isExiting: { true: '' },
    animation: {
      slide: '',
      fade: '',
      zoom: 'origin-(--trigger-anchor-point)',
      none: '',
    },
    slideFrom: { trigger: '', top: '', bottom: '', left: '', right: '' },
  },
  compoundVariants: [
    {
      isEntering: true,
      animation: ['slide', 'fade', 'zoom'],
      className: 'duration-200 ease-out animate-in fade-in',
    },
    {
      isExiting: true,
      animation: ['slide', 'fade', 'zoom'],
      className: 'duration-150 ease-in animate-out fade-out',
    },
    { isEntering: true, animation: 'zoom', className: 'zoom-in-95' },
    { isExiting: true, animation: 'zoom', className: 'zoom-out-95' },
    {
      isEntering: true,
      animation: 'slide',
      slideFrom: 'trigger',
      className:
        'placement-left:slide-in-from-right-1 placement-right:slide-in-from-left-1 placement-top:slide-in-from-bottom-1 placement-bottom:slide-in-from-top-1',
    },
    {
      isExiting: true,
      animation: 'slide',
      slideFrom: 'trigger',
      className:
        'placement-left:slide-out-to-right-1 placement-right:slide-out-to-left-1 placement-top:slide-out-to-bottom-1 placement-bottom:slide-out-to-top-1',
    },
    {
      isEntering: true,
      animation: 'slide',
      slideFrom: 'top',
      className: 'slide-in-from-top-1',
    },
    {
      isExiting: true,
      animation: 'slide',
      slideFrom: 'top',
      className: 'slide-out-to-top-1',
    },
    {
      isEntering: true,
      animation: 'slide',
      slideFrom: 'bottom',
      className: 'slide-in-from-bottom-1',
    },
    {
      isExiting: true,
      animation: 'slide',
      slideFrom: 'bottom',
      className: 'slide-out-to-bottom-1',
    },
    {
      isEntering: true,
      animation: 'slide',
      slideFrom: 'left',
      className: 'slide-in-from-left-1',
    },
    {
      isExiting: true,
      animation: 'slide',
      slideFrom: 'left',
      className: 'slide-out-to-left-1',
    },
    {
      isEntering: true,
      animation: 'slide',
      slideFrom: 'right',
      className: 'slide-in-from-right-1',
    },
    {
      isExiting: true,
      animation: 'slide',
      slideFrom: 'right',
      className: 'slide-out-to-right-1',
    },
  ],
  defaultVariants: { animation: 'slide', slideFrom: 'trigger' },
});

const PrefersTopPlacementContext = createContext(false);

export function PreferTopPopovers({ children }: PropsWithChildren) {
  return (
    <PrefersTopPlacementContext value={true}>
      {children}
    </PrefersTopPlacementContext>
  );
}

function topPlacement(placement: Placement = 'bottom'): Placement {
  return placement.startsWith('bottom')
    ? (placement.replace('bottom', 'top') as Placement)
    : placement;
}

export function PopoverOverlay({
  children,
  className,
  placement,
  animation,
  slideFrom,
  ...props
}: PropsWithChildren<{
  className?: string;
  triggerRef?: RefObject<Element | null>;
  placement?: Placement;
  isNonModal?: boolean;
  animation?: PopoverAnimation;
  slideFrom?: PopoverSlideFrom;
}>) {
  const prefersTop = use(PrefersTopPlacementContext);
  return (
    <AriaPopover
      offset={12}
      {...props}
      placement={prefersTop ? topPlacement(placement) : placement}
      className={composeRenderProps(className, (className, renderProps) =>
        styles({ ...renderProps, className, animation, slideFrom }),
      )}
    >
      {children}
    </AriaPopover>
  );
}
