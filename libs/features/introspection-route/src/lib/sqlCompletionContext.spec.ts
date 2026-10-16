import { describe, expect, it } from 'vitest';
import { getSqlCompletionContext } from './sqlCompletionContext';

const column = { type: 'column', isQualified: false };

describe('getSqlCompletionContext', () => {
  it.each([
    ['SELECT * FROM ', { type: 'table' }],
    ['SELECT * FROM sys_inv', { type: 'table' }],
    ['SELECT * FROM sys_invocation JOIN ', { type: 'table' }],
    ['SELECT * FROM sys_invocation, ', { type: 'table' }],
    ['select * from ', { type: 'table' }],
  ])('suggests tables for %j', (text, expected) => {
    expect(getSqlCompletionContext(text)).toEqual(expected);
  });

  it.each([
    'SELECT ',
    'SELECT DISTINCT ',
    'SELECT id, ',
    'SELECT * FROM sys_invocation WHERE ',
    'SELECT * FROM sys_invocation WHERE status = ',
    "SELECT * FROM sys_invocation WHERE status = 'x' AND ",
    'SELECT * FROM sys_invocation WHERE created_at >= ',
    'SELECT * FROM sys_invocation ORDER BY ',
    'SELECT * FROM sys_invocation GROUP BY id, ',
    'SELECT count(',
    'SELECT * FROM a JOIN b ON ',
    'SELECT * FROM sys_journal WHERE inv',
    'SELECT a * ',
  ])('suggests columns for %j', (text) => {
    expect(getSqlCompletionContext(text)).toEqual(column);
  });

  it('suggests the columns of a qualified table', () => {
    expect(getSqlCompletionContext('SELECT sys_invocation.')).toEqual({
      type: 'column',
      table: 'sys_invocation',
      isQualified: true,
    });
    expect(getSqlCompletionContext('SELECT sys_invocation.st')).toEqual({
      type: 'column',
      table: 'sys_invocation',
      isQualified: true,
    });
  });

  it('resolves table aliases anywhere in the query', () => {
    expect(
      getSqlCompletionContext('SELECT * FROM sys_invocation i WHERE i.'),
    ).toEqual({ type: 'column', table: 'sys_invocation', isQualified: true });
    expect(
      getSqlCompletionContext(
        'SELECT j.',
        'SELECT j. FROM sys_journal AS j JOIN sys_invocation i ON i.id = j.id',
      ),
    ).toEqual({ type: 'column', table: 'sys_journal', isQualified: true });
  });

  it('keeps an unknown qualifier as the table name', () => {
    expect(getSqlCompletionContext('SELECT x.')).toEqual({
      type: 'column',
      table: 'x',
      isQualified: true,
    });
  });

  it.each([
    'SELECT * ',
    'SELECT * FROM sys_invocation ',
    'SELECT * FROM sys_invocation WHERE id = 1 ',
    'SELECT * FROM sys_invocation ORDER BY created_at ',
    'SELECT * FROM sys_invocation LIMIT 10 ',
    'S',
  ])('suggests keywords for %j', (text) => {
    expect(getSqlCompletionContext(text)).toEqual({ type: 'keyword' });
  });

  it('suggests nothing for an empty query or an alias name', () => {
    expect(getSqlCompletionContext('')).toEqual({ type: 'none' });
    expect(getSqlCompletionContext('   ')).toEqual({ type: 'none' });
    expect(getSqlCompletionContext('SELECT id AS ')).toEqual({ type: 'none' });
  });

  it('ignores keywords inside strings and comments', () => {
    expect(
      getSqlCompletionContext("SELECT * FROM t WHERE name = 'from' AND "),
    ).toEqual(column);
    expect(
      getSqlCompletionContext("SELECT * FROM t WHERE name = 'from "),
    ).toEqual({ type: 'none' });
    expect(getSqlCompletionContext('SELECT -- from ')).toEqual({
      type: 'none',
    });
    expect(getSqlCompletionContext('SELECT /* from ')).toEqual({
      type: 'none',
    });
    expect(getSqlCompletionContext('SELECT * FROM "sys_')).toEqual({
      type: 'none',
    });
    expect(getSqlCompletionContext('SELECT -- from\n')).toEqual(column);
    expect(getSqlCompletionContext('SELECT /* x. */ ')).toEqual(column);
  });
});
