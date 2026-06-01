import { describe, it, expect } from 'vitest';
import { parseSSEChunk } from './useSSE';

describe('parseSSEChunk', () => {
  it('parses a single complete event', () => {
    const { events, rest } = parseSSEChunk('data: {"stage":1,"log":"hi"}\n\n');
    expect(events).toEqual([{ stage: 1, log: 'hi' }]);
    expect(rest).toBe('');
  });

  it('parses multiple events in one chunk', () => {
    const buf = 'data: {"a":1}\n\ndata: {"b":2}\n\n';
    const { events, rest } = parseSSEChunk(buf);
    expect(events).toEqual([{ a: 1 }, { b: 2 }]);
    expect(rest).toBe('');
  });

  it('holds back a partial trailing frame as rest', () => {
    const buf = 'data: {"done":true}\n\ndata: {"part';
    const { events, rest } = parseSSEChunk(buf);
    expect(events).toEqual([{ done: true }]);
    expect(rest).toBe('data: {"part');
  });

  it('reassembles a frame split across two chunks', () => {
    // First chunk ends mid-frame; rest carries over to the next parse.
    const first = parseSSEChunk('data: {"x":');
    expect(first.events).toEqual([]);
    const second = parseSSEChunk(first.rest + '42}\n\n');
    expect(second.events).toEqual([{ x: 42 }]);
  });

  it('ignores non-data lines (keep-alives / comments)', () => {
    const { events } = parseSSEChunk(': keepalive\n\ndata: {"ok":1}\n\n');
    expect(events).toEqual([{ ok: 1 }]);
  });

  it('skips unparseable JSON without throwing', () => {
    const { events } = parseSSEChunk('data: not-json\n\ndata: {"good":1}\n\n');
    expect(events).toEqual([{ good: 1 }]);
  });

  it('tolerates an is_final payload with assets + missing_figures', () => {
    const buf = 'data: {"is_final":true,"latex":"x","assets":["fig1.png"],"missing_figures":[{"n":2}]}\n\n';
    const { events } = parseSSEChunk(buf);
    expect(events[0].is_final).toBe(true);
    expect(events[0].missing_figures).toEqual([{ n: 2 }]);
  });
});
