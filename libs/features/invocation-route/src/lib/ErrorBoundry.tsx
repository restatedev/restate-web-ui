import { JournalEntryV2 } from '@restate/data-access/admin-api';
import { Button } from '@restate/ui/button';
import { DropdownSection } from '@restate/ui/dropdown';
import { Icon, IconName } from '@restate/ui/icons';
import { Popover, PopoverContent, PopoverTrigger } from '@restate/ui/popover';
import { Component, PropsWithChildren, ErrorInfo } from 'react';
import { tv } from 'tailwind-variants';

const errorStyles = tv({ base: 'h-full flex items-center pl-2' });
export class ErrorBoundary extends Component<
  PropsWithChildren<{ entry?: JournalEntryV2; className?: string }>,
  {
    hasError: boolean;
  }
> {
  constructor(props: PropsWithChildren<{ entry?: JournalEntryV2 }>) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(_: Error): {
    hasError: boolean;
  } {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error caught by ErrorBoundary: ', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className={errorStyles({ className: this.props.className })}>
          <Popover>
            <PopoverTrigger>
              <Button variant="icon" className="text-red-500 text-xs font-sans">
                <Icon name={IconName.CircleX} className="w-3 h-3 mr-1" />{' '}
                {this.props.entry?.type}
              </Button>
            </PopoverTrigger>
            <PopoverContent>
              <DropdownSection title="Error">
                <div className="py-2 px-4 text-red-500 text-sm">
                  Failed to display {this.props.entry?.category}:
                  {this.props.entry?.type} entry
                </div>
              </DropdownSection>
            </PopoverContent>
          </Popover>
        </div>
      );
    }

    return this.props.children;
  }
}
