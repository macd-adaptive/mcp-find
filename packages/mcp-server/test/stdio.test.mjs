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
  it('calls search with preserved defaults and serializes the API result', async () => {
    const result = await client.callTool({name: 'search_servers', arguments: {query: 'fixture'}});
    expect(result.isError).not.toBe(true);
    expect(JSON.parse(result.content[0].text)[0]).toMatchObject({slug: 'fixture', stars: 42});
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
