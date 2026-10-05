import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const repositoryRoot = process.cwd();
const migrationsDirectory = resolve(repositoryRoot, 'supabase/migrations');
const rollbackDirectory = resolve(repositoryRoot, 'supabase/rollback');

function readSql(filePath: string): string {
  return readFileSync(filePath, 'utf8');
}

function withoutComments(sql: string): string {
  return sql
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/--.*$/gm, '');
}

function migrationFiles(): string[] {
  return readdirSync(migrationsDirectory)
    .filter((fileName) => fileName.endsWith('.sql'))
    .sort();
}

const rlsOrderingMigration = '20261002_enable_rls_customer_settings_rate_limits.sql';
const rlsOrderingRollback = '20261002_down.sql';

// Mirrors the Supabase CLI: only `<digits>_name.sql` files are applied, in filename order.
function cliMigrationFiles(): string[] {
  return migrationFiles().filter((fileName) => /^\d+_.+\.sql$/.test(fileName));
}

function createdTables(sql: string): Set<string> {
  const tables = new Set<string>();
  const pattern = /\bCREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:public\.)?([a-z_][a-z0-9_]*)/gi;

  for (const match of withoutComments(sql).matchAll(pattern)) {
    tables.add(match[1].toLowerCase());
  }

  return tables;
}

function enabledRlsTables(sql: string): Set<string> {
  const tables = new Set<string>();
  const pattern = /\bALTER\s+TABLE\s+(?:IF\s+EXISTS\s+)?(?:public\.)?([a-z_][a-z0-9_]*)\s+ENABLE\s+ROW\s+LEVEL\s+SECURITY/gi;

  for (const match of withoutComments(sql).matchAll(pattern)) {
    tables.add(match[1].toLowerCase());
  }

  return tables;
}

function createdPolicies(sql: string): Map<string, string> {
  const policies = new Map<string, string>();
  const pattern =
    /\bCREATE\s+POLICY\s+(?:"([^"]+)"|([a-z_][a-z0-9_]*))\s+ON\s+(?:public\.)?([a-z_][a-z0-9_]*)/gi;

  for (const match of withoutComments(sql).matchAll(pattern)) {
    policies.set((match[1] ?? match[2]).toLowerCase(), match[3].toLowerCase());
  }

  return policies;
}

function disabledRlsTables(sql: string): Set<string> {
  const tables = new Set<string>();
  const pattern = /\bALTER\s+TABLE\s+(?:IF\s+EXISTS\s+)?(?:public\.)?([a-z_][a-z0-9_]*)\s+DISABLE\s+ROW\s+LEVEL\s+SECURITY/gi;

  for (const match of withoutComments(sql).matchAll(pattern)) {
    tables.add(match[1].toLowerCase());
  }

  return tables;
}

function hasDroppedPolicy(sql: string, policyName: string, tableName: string): boolean {
  const escapedPolicyName = policyName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const escapedTableName = tableName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(
    `\\bDROP\\s+POLICY\\s+IF\\s+EXISTS\\s+"?${escapedPolicyName}"?\\s+ON\\s+(?:public\\.)?${escapedTableName}\\b`,
    'i',
  );

  return pattern.test(withoutComments(sql));
}

function addedColumns(sql: string): Set<string> {
  const columns = new Set<string>();
  const pattern =
    /\bALTER\s+TABLE\s+(?:IF\s+EXISTS\s+)?(?:public\.)?([a-z_][a-z0-9_]*)\s+ADD\s+COLUMN\s+(?:IF\s+NOT\s+EXISTS\s+)?([a-z_][a-z0-9_]*)/gi;

  for (const match of withoutComments(sql).matchAll(pattern)) {
    columns.add(`${match[1].toLowerCase()}.${match[2].toLowerCase()}`);
  }

  return columns;
}

function hasDroppedColumn(sql: string, tableName: string, columnName: string): boolean {
  const pattern = new RegExp(
    `\\bALTER\\s+TABLE\\s+(?:IF\\s+EXISTS\\s+)?(?:public\\.)?${tableName}\\s+DROP\\s+COLUMN\\s+IF\\s+EXISTS\\s+${columnName}\\b`,
    'i',
  );

  return pattern.test(withoutComments(sql));
}

function createdIndexes(sql: string): Set<string> {
  const indexes = new Set<string>();
  const pattern = /\bCREATE\s+INDEX\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:public\.)?([a-z_][a-z0-9_]*)/gi;

  for (const match of withoutComments(sql).matchAll(pattern)) {
    indexes.add(match[1].toLowerCase());
  }

  return indexes;
}

function createdFunctions(sql: string): Set<string> {
  const functions = new Set<string>();
  const pattern =
    /\bCREATE\s+(?:OR\s+REPLACE\s+)?FUNCTION\s+(?:public\.)?([a-z_][a-z0-9_]*)\s*\(/gi;

  for (const match of withoutComments(sql).matchAll(pattern)) {
    functions.add(match[1].toLowerCase());
  }

  return functions;
}

describe('Supabase RLS migration preparation', () => {
  it('enables RLS for every table created by the migration set after 009', () => {
    const files = migrationFiles();
    const before009 = files
      .filter((fileName) => fileName !== '009_enable_rls_policies.sql')
      .map((fileName) => readSql(join(migrationsDirectory, fileName)))
      .join('\n');
    const after009 = `${before009}\n${readSql(join(migrationsDirectory, '009_enable_rls_policies.sql'))}`;
    const tables = new Set<string>();

    for (const sql of files.map((fileName) => readSql(join(migrationsDirectory, fileName)))) {
      for (const table of createdTables(sql)) tables.add(table);
    }

    const missingRls = [...tables].filter((table) => !enabledRlsTables(after009).has(table));
    expect(missingRls).toEqual([]);
  });

  it('enables RLS for every table in a migration that the CLI applies at or after its creation', () => {
    const files = cliMigrationFiles();
    const missingRls: string[] = [];

    files.forEach((fileName, index) => {
      for (const table of createdTables(readSql(join(migrationsDirectory, fileName)))) {
        const protectedLater = files
          .slice(index)
          .some((laterFile) => enabledRlsTables(readSql(join(migrationsDirectory, laterFile))).has(table));
        if (!protectedLater) missingRls.push(`${table} (created in ${fileName})`);
      }
    });

    expect(missingRls).toEqual([]);
  });

  it('sorts the customer_settings/rate_limits RLS migration after the migrations that create them', () => {
    const files = cliMigrationFiles();
    const orderingIndex = files.indexOf(rlsOrderingMigration);

    expect(orderingIndex).toBeGreaterThanOrEqual(0);
    expect(orderingIndex).toBeGreaterThan(files.indexOf('20260312_create_customer_settings.sql'));
    expect(orderingIndex).toBeGreaterThan(files.indexOf('20260422_add_rate_limits.sql'));
    expect(orderingIndex).toBeGreaterThan(files.indexOf('010_restrict_model_pricing.sql'));
  });

  it('locks customer_settings and rate_limits to service_role in 20261002 and reverses it on rollback', () => {
    const forwardSql = readSql(join(migrationsDirectory, rlsOrderingMigration));
    const rollbackSql = readSql(join(rollbackDirectory, rlsOrderingRollback));

    for (const table of ['customer_settings', 'rate_limits']) {
      expect(enabledRlsTables(forwardSql).has(table)).toBe(true);
      expect(withoutComments(forwardSql)).toMatch(
        new RegExp(`to_regclass\\('public\\.${table}'\\)\\s+IS\\s+NOT\\s+NULL`, 'i'),
      );
      expect(forwardSql).toMatch(
        new RegExp(`REVOKE\\s+ALL\\s+ON\\s+TABLE\\s+(?:public\\.)?${table}\\s+FROM\\s+anon\\s*,\\s*authenticated`, 'i'),
      );
      expect(disabledRlsTables(rollbackSql).has(table)).toBe(true);
      expect(rollbackSql).toMatch(
        new RegExp(`GRANT\\s+ALL\\s+ON\\s+TABLE\\s+(?:public\\.)?${table}\\s+TO\\s+anon\\s*,\\s*authenticated`, 'i'),
      );
    }

    expect(withoutComments(forwardSql)).not.toMatch(/\bCREATE\s+POLICY\b/i);
    expect(withoutComments(forwardSql)).not.toMatch(/\bGRANT\b[\s\S]*?\bTO\s+(?:anon|authenticated)\b/i);
    expect(existsSync(join(migrationsDirectory, rlsOrderingRollback))).toBe(false);
  });

  it('drops every policy created by 009 in the 009 rollback', () => {
    const forwardSql = readSql(join(migrationsDirectory, '009_enable_rls_policies.sql'));
    const rollbackSql = readSql(join(rollbackDirectory, '009_down.sql'));

    for (const [policyName, tableName] of createdPolicies(forwardSql)) {
      expect(hasDroppedPolicy(rollbackSql, policyName, tableName)).toBe(true);
    }
  });

  it('reverts every table and column created by 008 in the 008 rollback', () => {
    const forwardSql = readSql(join(migrationsDirectory, '008_add_analysis_metadata.sql'));
    const rollbackSql = readSql(join(rollbackDirectory, '008_down.sql'));

    for (const tableName of createdTables(forwardSql)) {
      expect(rollbackSql).toMatch(
        new RegExp(`\\bDROP\\s+TABLE\\s+IF\\s+EXISTS\\s+(?:public\\.)?${tableName}\\b`, 'i'),
      );
    }

    for (const qualifiedColumn of addedColumns(forwardSql)) {
      const [tableName, columnName] = qualifiedColumn.split('.');
      expect(hasDroppedColumn(rollbackSql, tableName, columnName)).toBe(true);
    }

    for (const indexName of createdIndexes(forwardSql)) {
      expect(rollbackSql).toMatch(
        new RegExp(`\\bDROP\\s+INDEX\\s+IF\\s+EXISTS\\s+(?:public\\.)?${indexName}\\b`, 'i'),
      );
    }

    for (const functionName of createdFunctions(forwardSql)) {
      expect(rollbackSql).toMatch(
        new RegExp(`\\bDROP\\s+FUNCTION\\s+IF\\s+EXISTS\\s+(?:public\\.)?${functionName}\\b`, 'i'),
      );
    }

    if (/\bCOMMENT\s+ON\b/i.test(withoutComments(forwardSql))) {
      expect(rollbackSql).toMatch(/\bCOMMENT\s+ON\s+COLUMN\s+public\.chat_messages\.analysis_metadata\s+IS\s+NULL/i);
    }
  });

  it('keeps manual rollbacks outside the forward migration directory', () => {
    expect(existsSync(join(migrationsDirectory, '009_down.sql'))).toBe(false);
    expect(existsSync(join(migrationsDirectory, '008_down.sql'))).toBe(false);
    expect(existsSync(join(rollbackDirectory, '009_down.sql'))).toBe(true);
    expect(existsSync(join(rollbackDirectory, '008_down.sql'))).toBe(true);
  });

  it('does not add broad anon or authenticated policies in 009', () => {
    const forwardSql = withoutComments(readSql(join(migrationsDirectory, '009_enable_rls_policies.sql')));
    const broadPolicy =
      /\bCREATE\s+POLICY[\s\S]*?\bTO\s+(?:anon|authenticated)\b[\s\S]*?\bUSING\s*\(\s*true\s*\)/i;

    expect(forwardSql).not.toMatch(broadPolicy);
  });

  it('restricts model_pricing to server-side access in 010 and restores the 003/005 contract on rollback', () => {
    const forwardSql = readSql(join(migrationsDirectory, '010_restrict_model_pricing.sql'));
    const rollbackSql = readSql(join(rollbackDirectory, '010_down.sql'));
    const previousPolicies = [
      'Users can view active models',
      'Admins can manage models',
      'Authenticated users can read all models for Realtime sync',
      'Anonymous can view active models',
    ];

    expect(forwardSql).toMatch(
      /ALTER\s+TABLE\s+(?:IF\s+EXISTS\s+)?(?:public\.)?model_pricing\s+ENABLE\s+ROW\s+LEVEL\s+SECURITY/i,
    );
    for (const policyName of previousPolicies) {
      expect(hasDroppedPolicy(forwardSql, policyName, 'model_pricing')).toBe(true);
      expect(rollbackSql).toMatch(
        new RegExp(`CREATE\\s+POLICY\\s+"${policyName.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&')}"\\s+ON\\s+(?:public\\.)?model_pricing`, 'i'),
      );
    }

    expect(forwardSql).toMatch(
      /REVOKE\s+ALL\s+ON\s+TABLE\s+(?:public\.)?model_pricing\s+FROM\s+anon\s*,\s*authenticated/i,
    );
    expect(rollbackSql).toMatch(
      /GRANT\s+SELECT\s+ON\s+TABLE\s+(?:public\.)?model_pricing\s+TO\s+anon\s*,\s*authenticated/i,
    );
    expect(withoutComments(forwardSql)).toMatch(
      /pg_publication_tables[\s\S]*ALTER\s+PUBLICATION\s+supabase_realtime\s+DROP\s+TABLE\s+(?:public\.)?model_pricing/i,
    );
    expect(withoutComments(rollbackSql)).toMatch(
      /pg_publication_tables[\s\S]*ALTER\s+PUBLICATION\s+supabase_realtime\s+ADD\s+TABLE\s+(?:public\.)?model_pricing/i,
    );
  });

  it('documents the 20261002, 010, 009, 008 manual rollback order', () => {
    const readme = readFileSync(join(rollbackDirectory, 'README.md'), 'utf8');

    expect(readme.indexOf(rlsOrderingRollback)).toBeGreaterThanOrEqual(0);
    expect(readme.indexOf('010_down.sql')).toBeGreaterThan(readme.indexOf(rlsOrderingRollback));
    expect(readme.indexOf('009_down.sql')).toBeGreaterThan(readme.indexOf('010_down.sql'));
    expect(readme.indexOf('008_down.sql')).toBeGreaterThan(readme.indexOf('009_down.sql'));
  });
});
