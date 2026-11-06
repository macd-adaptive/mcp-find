# Frontmatter compatibility baseline

`frontmatter-baseline-3.14.2.json` records canonical parsed data and body hashes
from the old js-yaml parser, plus each article's source hash. The migration
comparison established identical results for all 153 MDX files present then.

The CI compatibility test compares only files whose source hash still matches.
New and edited articles emit an explicit SKIP warning, without blocking blog
publication. Unchanged files still fail if their parsed data or body differs.
Deleted files need no comparison. The separate content tests still parse every
current published article, and the publication-date/source gate stays active.

To regenerate after an intentional content change, from repository root:

```sh
baseline=$(mktemp -d)
(cd "$baseline" && npm pack js-yaml@3.14.2 --ignore-scripts && tar -xzf js-yaml-3.14.2.tgz)
node scripts/compare-frontmatter-baseline.mjs "$baseline/package/dist/js-yaml.js" > "$baseline/fixture.json"
cp "$baseline/fixture.json" scripts/__tests__/fixtures/frontmatter-baseline-3.14.2.json
rm -rf "$baseline"
pnpm --filter @mcpfind/web test ../../scripts/__tests__/content-dependency-compat.test.mjs
```

The generator fails before producing JSON if old and new parsed data or bodies
differ. Do not replace the fixture with new-parser-only output. Review the
fixture diff with the article changes. The vulnerable old parser stays outside
the installed workspace dependency tree and is used only for this local,
repository-content comparison.
