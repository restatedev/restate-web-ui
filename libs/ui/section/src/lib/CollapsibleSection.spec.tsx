import { render, screen } from '@testing-library/react';
import {
  CollapsibleSection,
  CollapsibleSectionContent,
  CollapsibleSectionTitle,
} from './CollapsibleSection';

describe('CollapsibleSection', () => {
  it('names the toggle after the title', () => {
    render(
      <CollapsibleSection>
        <CollapsibleSectionTitle>Advanced</CollapsibleSectionTitle>
        <CollapsibleSectionContent>Retry policy</CollapsibleSectionContent>
      </CollapsibleSection>,
    );
    expect(screen.getByRole('button', { name: 'Advanced' })).toBeTruthy();
  });
});
