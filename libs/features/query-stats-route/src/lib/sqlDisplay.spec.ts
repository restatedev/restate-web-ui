import { describe, expect, it } from 'vitest';
import { formatSql } from './sqlDisplay';

describe('formatSql', () => {
  it('breaks a long single-line statement at clauses and predicates', () => {
    const formatted = formatSql(
      "SELECT id from sys_invocation WHERE (((status = 'backing-off') OR (status = 'ready' AND id IN (SELECT entry_id FROM sys_vqueues WHERE stage = 'inbox')))) LIMIT 250",
    );
    const lines = formatted.split('\n');
    expect(lines[0]).toBe('SELECT id');
    expect(lines[1]).toBe('from sys_invocation');
    expect(lines).toContain("WHERE (((status = 'backing-off')");
    expect(formatted).toContain("\n      OR (status = 'ready'");
    expect(formatted).toContain('(SELECT entry_id');
    expect(lines.at(-1)).toBe('LIMIT 250');
  });

  it('never splits string literals', () => {
    const formatted = formatSql(
      "SELECT id FROM sys_journal_events WHERE event_type = 'a AND b OR c'",
    );
    expect(formatted).toContain("'a AND b OR c'");
  });

  it('keeps pseudo-SQL shapes readable, one optional group per line', () => {
    const formatted = formatSql(
      'SELECT <rule columns> FROM sys_rules [WHERE pattern = ?] ORDER BY pattern ASC|DESC LIMIT ≤1001',
    );
    expect(formatted.split('\n')).toEqual([
      'SELECT <rule columns>',
      'FROM sys_rules',
      '[WHERE pattern = ?]',
      'ORDER BY pattern ASC|DESC',
      'LIMIT ≤1001',
    ]);
  });
});
