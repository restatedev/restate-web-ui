import { render, screen } from '@testing-library/react';
import { SnippetCopy } from './Snippet';

describe('SnippetCopy', () => {
  it('names an icon-only copy button', () => {
    render(<SnippetCopy copyText="restate deployments register" />);
    expect(screen.getByRole('button', { name: 'Copy' })).toBeTruthy();
  });

  it('keeps the visible text as the name', () => {
    render(<SnippetCopy copyText="curl localhost:8080">Copy curl</SnippetCopy>);
    expect(screen.getByRole('button', { name: 'Copy curl' })).toBeTruthy();
  });
});
