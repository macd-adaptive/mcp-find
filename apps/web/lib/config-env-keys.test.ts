import { describe, expect, it } from 'vitest';
import { generateConfig, CLIENT_CONFIGS } from '@mcpfind/shared';
import type { ClientType } from '@mcpfind/shared';

const clients = Object.keys(CLIENT_CONFIGS) as ClientType[];
const envVars = [
  { name: '__proto__', placeholder: 'synthetic proto value', required: true },
  { name: 'constructor', placeholder: 'synthetic constructor value', required: false },
  { name: 'API_KEY', placeholder: 'YOUR_API_KEY', required: true },
];

describe.each(clients)('environment data keys for %s', (client) => {
  it('preserves reserved keys in the actual serialized client configuration', () => {
    const generated = generateConfig({ slug: 'synthetic', packageName: 'synthetic-mcp', packageType: 'npm', envVars }, client);
    const parsed = JSON.parse(JSON.stringify(generated.config));
    const env = parsed[CLIENT_CONFIGS[client].topLevelKey].synthetic.env;
    expect(Object.hasOwn(env, '__proto__')).toBe(true);
    expect(Object.getOwnPropertyDescriptor(env, '__proto__')?.value).toBe('synthetic proto value');
    expect(env.constructor).toBe('synthetic constructor value');
    expect(env.API_KEY).toBe('YOUR_API_KEY');
    expect(generated.placeholders).toEqual(['__proto__', 'API_KEY']);
    const section = generated.config[CLIENT_CONFIGS[client].topLevelKey] as { synthetic: { env: Record<string, string> } };
    expect(Object.getPrototypeOf(section.synthetic.env)).toBe(Object.prototype);
  });

  it('keeps normal configuration output byte-for-byte compatible with the previous algorithm', () => {
    const normal = [
      { name: 'API_KEY', placeholder: 'YOUR_API_KEY', required: true },
      { name: 'REGION', placeholder: 'eu', required: false },
      { name: 'API_KEY', placeholder: 'REPLACE_ME', required: true },
    ];
    const input = { slug: 'synthetic', packageName: 'synthetic-mcp', packageType: 'npm' as const, additionalArgs: ['--stdio'], envVars: normal };
    const generated = generateConfig(input, client);
    const env: Record<string, string> = {};
    for (const v of normal) env[v.name] = v.placeholder;
    const entry = { ...(client === 'vscode' ? { type: 'stdio' } : {}), command: 'npx', args: ['-y', 'synthetic-mcp', '--stdio'], env };
    const previous = {
      client,
      config: { [CLIENT_CONFIGS[client].topLevelKey]: { synthetic: entry } },
      filePath: CLIENT_CONFIGS[client].filePath,
      postInstall: CLIENT_CONFIGS[client].postInstall,
      placeholders: ['API_KEY', 'API_KEY'],
    };
    expect(JSON.stringify(generated)).toBe(JSON.stringify(previous));
  });
});
