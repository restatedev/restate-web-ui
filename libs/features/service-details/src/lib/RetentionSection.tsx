import { useServiceDetails } from '@restate/data-access/admin-api-hooks';
import {
  FormFieldCombobox,
  ComboBoxSection,
  ComboBoxItem,
} from '@restate/ui/form-field';
import { Link } from '@restate/ui/link';
import { SectionTitle, SectionContent, Section } from '@restate/ui/section';
import { InlineTooltip } from '@restate/ui/tooltip';
import { RestateMinimumVersion } from '@restate/util/feature-flag';
import { HUMANTIME_PATTERN_INPUT } from '@restate/util/humantime';

export function RetentionSection({
  serviceDetails: data,
  className,
  isPending: isPendingOrSubmitting,
}: {
  className?: string;
  isPending?: boolean;
  serviceDetails?: ReturnType<typeof useServiceDetails>['data'];
}) {
  return (
    <Section>
      <SectionTitle>Retention</SectionTitle>
      <SectionContent
        className="flex flex-col gap-4"
        // footer={
        //   <span className="mt-2 block px-4 pb-2 text-xs font-normal text-gray-500 normal-case">
        //     Configured using the{' '}
        //     <Link
        //       href="https://docs.rs/jiff/latest/jiff/fmt/friendly/index.html"
        //       target="_blank"
        //       rel="noopener noreferrer"
        //     >
        //       jiff friendly
        //     </Link>{' '}
        //     format.
        //   </span>
        // }
      >
        <RestateMinimumVersion minVersion="1.5.0">
          <FormFieldCombobox
            pattern={HUMANTIME_PATTERN_INPUT}
            allowsCustomValue
            defaultValue={data?.journal_retention ?? ''}
            disabled={isPendingOrSubmitting}
            label={
              <InlineTooltip
                variant="indicator-button"
                title="Journal retention"
                description="How long journal entries are kept after invocation completion"
              >
                <span slot="title" className="text-0.5xs">
                  Journal retention
                </span>
              </InlineTooltip>
            }
            name="journal_retention"
            className="[&_label]:text-zinc-500"
            placeholder="1day"
          >
            <ComboBoxSection
              title="Examples"
              description={
                <>
                  Choose from the example options above, or enter a custom value
                  in the{' '}
                  <Link
                    href="https://docs.rs/jiff/latest/jiff/fmt/friendly/index.html"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    jiff friendly
                  </Link>{' '}
                  format.
                </>
              }
            >
              <ComboBoxItem value="1h 30m">1h 30m</ComboBoxItem>
              <ComboBoxItem value="12h">12h</ComboBoxItem>
              <ComboBoxItem value="1day">1day</ComboBoxItem>
              <ComboBoxItem value="7days">7days</ComboBoxItem>
            </ComboBoxSection>
          </FormFieldCombobox>
        </RestateMinimumVersion>
        <FormFieldCombobox
          pattern={HUMANTIME_PATTERN_INPUT}
          allowsCustomValue
          defaultValue={data?.idempotency_retention ?? ''}
          disabled={isPendingOrSubmitting}
          label={
            <InlineTooltip
              variant="indicator-button"
              title="Idempotency completion"
              description="How long the completion result of idempotent invocations is stored"
            >
              <span slot="title" className="text-0.5xs">
                Idempotency completion
              </span>
            </InlineTooltip>
          }
          name="idempotency_retention"
          className="[&_label]:text-zinc-500"
          placeholder="1day"
        >
          <ComboBoxSection
            title="Examples"
            description={
              <>
                Choose from the example options above, or enter a custom value
                in the{' '}
                <Link
                  href="https://docs.rs/jiff/latest/jiff/fmt/friendly/index.html"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  jiff friendly
                </Link>{' '}
                format.
              </>
            }
          >
            <ComboBoxItem value="1h 30m">1h 30m</ComboBoxItem>
            <ComboBoxItem value="12h">12h</ComboBoxItem>
            <ComboBoxItem value="1day">1day</ComboBoxItem>
            <ComboBoxItem value="7days">7days</ComboBoxItem>
          </ComboBoxSection>
        </FormFieldCombobox>
        {data?.ty === 'Workflow' && (
          <FormFieldCombobox
            pattern={HUMANTIME_PATTERN_INPUT}
            allowsCustomValue
            disabled={isPendingOrSubmitting}
            className="[&_label]:text-zinc-500"
            defaultValue={data?.workflow_completion_retention ?? ''}
            label={
              <InlineTooltip
                variant="indicator-button"
                title="Workflow completion"
                description="How long the completion result of workflows is retained (available only for workflow services)"
              >
                <span slot="title" className="text-0.5xs">
                  Workflow completion
                </span>
              </InlineTooltip>
            }
            name="workflow_completion_retention"
            placeholder="1day"
          >
            <ComboBoxSection
              title="Examples"
              description={
                <>
                  Choose from the example options above, or enter a custom value
                  in the{' '}
                  <Link
                    href="https://docs.rs/jiff/latest/jiff/fmt/friendly/index.html"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    jiff friendly
                  </Link>{' '}
                  format.
                </>
              }
            >
              <ComboBoxItem value="1h 30m">1h 30m</ComboBoxItem>
              <ComboBoxItem value="12h">12h</ComboBoxItem>
              <ComboBoxItem value="1day">1day</ComboBoxItem>
              <ComboBoxItem value="7days">7days</ComboBoxItem>
            </ComboBoxSection>
          </FormFieldCombobox>
        )}
      </SectionContent>
    </Section>
  );
}
