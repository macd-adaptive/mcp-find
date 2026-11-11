import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { fileURLToPath } from 'node:url';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

// Exercise the real entry point and SDK handshake with a mocked directory API.
// No live services, credentials, HTTP MCP transport, or production data.
describe('MCP stdio compatibility', () => {
  let client;
  let transport;
  let stderr = '';
  beforeAll(async () => {
    transport = new StdioClientTransport({
      command: process.execPath,
      args: ['--require', fileURLToPath(new URL('./mock-fetch.cjs', import.meta.url)),
        '--import', fileURLToPath(new URL('../../../node_modules/tsx/dist/loader.mjs', import.meta.url)),
        fileURLToPath(new URL('../src/index.ts', import.meta.url))],
      env: { PATH: process.env.PATH ?? '', MCPFIND_API_URL: 'https://mcp-test.invalid/api' },
      stderr: 'pipe',
    });
    transport.stderr?.on('data', chunk => { stderr += chunk.toString(); });
    client = new Client({name: 'compatibility-test', version: '1.0.0'});
    await client.connect(transport);
  }, 15000);
  afterAll(async () => { await client?.close(); });

  it('negotiates and lists all tools with their Zod-generated JSON schemas', async () => {
    const {tools} = await client.listTools();
    expect(tools.map(t => t.name).sort()).toEqual(['get_install_config', 'get_server_details', 'search_servers']);
    const search = tools.find(t => t.name === 'search_servers');
    expect(search.inputSchema.required).toContain('query');
    expect(search.inputSchema.properties.limit.maximum).toBe(20);
    expect(search.inputSchema.properties.limit.default).toBe(10);
  });
  it('advertises the search boundaries required by the directory API', async () => {
    const {tools} = await client.listTools();
    const search = tools.find(t => t.name === 'search_servers');
    expect(search.inputSchema.properties.query.maxLength).toBe(120);
    expect(search.inputSchema.properties.limit.type).toBe('integer');
  });
  it('accepts the maximum query length and rejects oversized queries at the tool boundary', async () => {
    const boundary = await client.callTool({name: 'search_servers', arguments: {query: 'x'.repeat(120)}});
    expect(boundary.isError).not.toBe(true);
    const oversized = await client.callTool({name: 'search_servers', arguments: {query: 'x'.repeat(121)}});
    expect(oversized.isError).toBe(true);
    expect(oversized.content[0].text).toContain('Input validation error');
  });
  it('rejects fractional limits at the tool boundary rather than sending them to the API', async () => {
    const result = await client.callTool({name: 'search_servers', arguments: {query: 'fixture', limit: 1.5}});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Input validation error');
    expect(result.content[0].text).not.toContain('Schema defaults lost');
  });
  it('calls search with preserved defaults and serializes the API result', async () => {
    const result = await client.callTool({name: 'search_servers', arguments: {query: 'fixture'}});
    expect(result.isError).not.toBe(true);
    expect(JSON.parse(result.content[0].text)[0]).toMatchObject({slug: 'fixture', stars: 42});
  });
  it.each([1, 20])('accepts integer limit boundary %i over stdio', async (limit) => {
    const result = await client.callTool({name: 'search_servers', arguments: {query: 'limit-boundary', limit}});
    expect(result.isError).not.toBe(true);
    expect(JSON.parse(result.content[0].text)[0].slug).toBe('fixture');
  });
  it('rejects schema violations before making an API request', async () => {
    const result = await client.callTool({name: 'search_servers', arguments: {query: 'fixture', limit: 21}});
    expect(result.isError).toBe(true);
  });
  it('returns API failures as tool errors', async () => {
    const result = await client.callTool({name: 'search_servers', arguments: {query: 'fail'}});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('API error: 503');
  });
  it('returns details and config over the stdio transport', async () => {
    const detail = await client.callTool({name: 'get_server_details', arguments: {server_id: 'fixture'}});
    expect(JSON.parse(detail.content[0].text).slug).toBe('fixture');
    const config = await client.callTool({name: 'get_install_config', arguments: {server_id: 'fixture', client: 'cursor'}});
    expect(JSON.parse(config.content[0].text).mcpServers.fixture.command).toBe('fixture');
  });
  it('keeps not-found semantics and stdout free of non-protocol output', async () => {
    const missing = await client.callTool({name: 'get_server_details', arguments: {server_id: 'missing'}});
    expect(missing.isError).toBe(true);
    expect(missing.content[0].text).toContain('not found');
    expect(stderr).toBe('');
  });
});
