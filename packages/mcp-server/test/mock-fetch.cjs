// Child-process-only preload. Any unexpected network request fails closed.
globalThis.fetch = function (input) {
  return Promise.resolve().then(() => {
    const url = new URL(String(input));
    if (url.origin !== 'https://mcp-test.invalid') throw new Error('Unexpected API origin');
    let body = {};
    let status = 200;
    const fixture = {name: 'Fixture', slug: 'fixture', category: 'databases', github_stars: 42, tools: []};
    if (url.pathname === '/api/servers') {
      if (url.searchParams.get('q') === 'fail') return new Response('{}', {status: 503});
      const expectedLimit = url.searchParams.get('q') === 'limit-boundary'
        ? ['1', '20'].includes(url.searchParams.get('limit'))
        : url.searchParams.get('limit') === '10';
      if (url.searchParams.get('sort') !== 'stars' || !expectedLimit) throw new Error('Schema defaults lost');
      body = {servers: [fixture]};
    } else if (url.pathname === '/api/servers/fixture') body = fixture;
    else if (url.pathname === '/api/servers/fixture/config/cursor') body = {mcpServers: {fixture: {command: 'fixture'}}};
    else { status = 404; body = {}; }
    return new Response(JSON.stringify(body), {status, headers: {'content-type': 'application/json'}});
  });
};
