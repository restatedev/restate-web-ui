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
              <Button variant="icon" className="font-sans text-xs text-red-500">
                <Icon name={IconName.CircleX} className="mr-1 h-3 w-3" />{' '}
                {this.props.entry?.type}
              </Button>
            </PopoverTrigger>
            <PopoverContent>
              <DropdownSection title="Error">
                <div className="px-4 py-2 text-sm text-red-500">
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
