import { describe, it, expect } from 'vitest';
import { toTags, sanitizeHtml } from './helpers.js';

describe('toTags', () => {
  it('should return array as-is', () => {
    expect(toTags(['a', 'b'])).toEqual(['a', 'b']);
  });

  it('should return empty array for null', () => {
    expect(toTags(null)).toEqual([]);
  });

  it('should return empty array for undefined', () => {
    expect(toTags(undefined)).toEqual([]);
  });

  it('should return empty array for empty string', () => {
    expect(toTags('')).toEqual([]);
  });

  it('should parse PostgreSQL array format', () => {
    expect(toTags('{tag1,tag2,tag3}')).toEqual(['tag1', 'tag2', 'tag3']);
  });

  it('should parse PostgreSQL array with quoted values', () => {
    expect(toTags('{"tag 1","tag 2"}')).toEqual(['tag 1', 'tag 2']);
  });

  it('should parse PostgreSQL array with single quoted values', () => {
    expect(toTags("{\'tag 1\',\'tag 2\'}")).toEqual(['tag 1', 'tag 2']);
  });

  it('should parse comma-separated strings', () => {
    expect(toTags('a, b, c')).toEqual(['a', 'b', 'c']);
  });

  it('should filter empty values', () => {
    expect(toTags('a,,b, ,c')).toEqual(['a', 'b', 'c']);
  });

  it('should trim whitespace', () => {
    expect(toTags('  a  ,  b  ')).toEqual(['a', 'b']);
  });

  it('should handle single value', () => {
    expect(toTags('single')).toEqual(['single']);
  });
});

describe('sanitizeHtml', () => {
  it('should return empty string for null', () => {
    expect(sanitizeHtml(null)).toBe('');
  });

  it('should return empty string for undefined', () => {
    expect(sanitizeHtml(undefined)).toBe('');
  });

  it('should return empty string for empty input', () => {
    expect(sanitizeHtml('')).toBe('');
  });

  it('should allow safe paragraph tags', () => {
    const input = '<p>Hello world</p>';
    expect(sanitizeHtml(input)).toBe('<p>Hello world</p>');
  });

  it('should allow safe formatting tags', () => {
    const input = '<p>Hello <strong>world</strong></p>';
    expect(sanitizeHtml(input)).toBe('<p>Hello <strong>world</strong></p>');
  });

  it('should allow bold and italic', () => {
    const input = '<b>bold</b> and <i>italic</i> and <em>emphasis</em>';
    expect(sanitizeHtml(input)).toContain('<b>bold</b>');
    expect(sanitizeHtml(input)).toContain('<i>italic</i>');
    expect(sanitizeHtml(input)).toContain('<em>emphasis</em>');
  });

  it('should allow lists', () => {
    const input = '<ul><li>item 1</li><li>item 2</li></ul>';
    expect(sanitizeHtml(input)).toBe('<ul><li>item 1</li><li>item 2</li></ul>');
  });

  it('should allow headings', () => {
    const input = '<h1>Title</h1><h2>Subtitle</h2>';
    expect(sanitizeHtml(input)).toContain('<h1>Title</h1>');
    expect(sanitizeHtml(input)).toContain('<h2>Subtitle</h2>');
  });

  it('should strip script tags but keep text', () => {
    const input = '<p>Hello</p><script>alert("xss")</script>';
    const result = sanitizeHtml(input);
    expect(result).not.toContain('<script');
    expect(result).not.toContain('</script>');
    expect(result).toContain('<p>Hello</p>');
  });

  it('should remove onclick attributes', () => {
    const input = '<p onclick="evil()">Click me</p>';
    const result = sanitizeHtml(input);
    expect(result).not.toContain('onclick');
    expect(result).toContain('Click me');
  });

  it('should remove onerror attributes', () => {
    const input = '<img onerror="evil()" src="x">';
    const result = sanitizeHtml(input);
    expect(result).not.toContain('onerror');
  });

  it('should sanitize javascript in style attributes', () => {
    const input = '<p style="background:url(javascript:alert(1))">Text</p>';
    const result = sanitizeHtml(input);
    expect(result).not.toContain('javascript:');
  });

  it('should sanitize expression() in style attributes', () => {
    const input = '<p style="width:expression(alert(1))">Text</p>';
    const result = sanitizeHtml(input);
    expect(result).not.toContain('expression(');
  });

  it('should allow safe style attributes', () => {
    const input = '<p style="color: red; font-weight: bold;">Text</p>';
    const result = sanitizeHtml(input);
    expect(result).toContain('style=');
    expect(result).toContain('color: red');
  });

  it('should strip anchor tags but keep text', () => {
    const input = '<a href="http://evil.com" onclick="steal()">Click here</a>';
    const result = sanitizeHtml(input);
    expect(result).not.toContain('<a');
    expect(result).toContain('Click here');
  });

  it('should handle nested dangerous content', () => {
    const input = '<div><script>alert(1)</script><p>Safe</p></div>';
    const result = sanitizeHtml(input);
    expect(result).not.toContain('<script');
    expect(result).toContain('Safe');
  });
});
