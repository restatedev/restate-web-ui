import { render, screen } from '@testing-library/react';
import { MarkdownDescription } from './MarkdownDescription';

describe('MarkdownDescription', () => {
  it('renders GitHub-flavored tables and bare links', () => {
    render(
      <MarkdownDescription>
        {
          '| Code | Meaning |\n| --- | --- |\n| 470 | Not ready |\n\nSee https://docs.restate.dev'
        }
      </MarkdownDescription>,
    );
    expect(screen.getByRole('table')).toBeTruthy();
    expect(screen.getByRole('cell', { name: 'Not ready' })).toBeTruthy();
    expect(
      screen.getByRole('link', { name: 'https://docs.restate.dev' }),
    ).toBeTruthy();
  });

  it('keeps the text of HTML blocks and drops the tags', () => {
    const { container } = render(
      <MarkdownDescription>
        {
          '<p>Creates an order &amp; reserves stock.\nIt runs once per key.</p>\n\nPlain text.'
        }
      </MarkdownDescription>,
    );
    expect(container.textContent).toContain(
      'Creates an order & reserves stock. It runs once per key.',
    );
    expect(container.textContent).toContain('Plain text.');
    expect(container.innerHTML).not.toContain('&lt;p');
  });
});
