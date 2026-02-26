/**
 * Snowflake SQL API - Access Management via SQL statements
 * Docs: https://docs.snowflake.com/en/sql-reference/sql/grant-privilege
 *
 * Snowflake access management is SQL-based. We execute SQL via the Snowflake SQL REST API.
 * Endpoint: POST https://{account}.snowflakecomputing.com/api/v2/statements
 */

export interface SnowflakeConfig {
  accountUrl: string;   // e.g. https://xy12345.us-east-1.snowflakecomputing.com
  accessToken: string;  // OAuth token
}

interface StatementResult {
  statementHandle: string;
  message: string;
  data?: any[][];
  resultSetMetaData?: { numRows: number; format: string; rowType: any[] };
}

async function executeSql(config: SnowflakeConfig, sql: string): Promise<StatementResult> {
  const res = await fetch(`${config.accountUrl}/api/v2/statements`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.accessToken}`,
      'Content-Type': 'application/json',
      'X-Snowflake-Authorization-Token-Type': 'OAUTH',
    },
    body: JSON.stringify({ statement: sql, timeout: 30 }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw Object.assign(new Error(`Snowflake SQL API ${res.status}: ${res.statusText}`), { body: text });
  }
  return res.json() as Promise<StatementResult>;
}

/** Grant a role to a user */
export async function grantRole(config: SnowflakeConfig, roleName: string, userName: string): Promise<StatementResult> {
  const sql = `GRANT ROLE "${roleName}" TO USER "${userName}"`;
  console.log(`[Snowflake] Executing: ${sql}`);
  return executeSql(config, sql);
}

/** Revoke a role from a user */
export async function revokeRole(config: SnowflakeConfig, roleName: string, userName: string): Promise<StatementResult> {
  const sql = `REVOKE ROLE "${roleName}" FROM USER "${userName}"`;
  console.log(`[Snowflake] Executing: ${sql}`);
  return executeSql(config, sql);
}

/** Show grants to a user */
export async function showGrantsToUser(config: SnowflakeConfig, userName: string): Promise<string[]> {
  const result = await executeSql(config, `SHOW GRANTS TO USER "${userName}"`);
  // Parse role names from result rows
  return (result.data || []).map(row => row[1] as string).filter(Boolean);
}

/** List available roles */
export async function listRoles(config: SnowflakeConfig): Promise<string[]> {
  const result = await executeSql(config, 'SHOW ROLES');
  return (result.data || []).map(row => row[1] as string).filter(Boolean);
}

/** List warehouses (for discovery) */
export async function listWarehouses(config: SnowflakeConfig): Promise<{ name: string; size: string; state: string }[]> {
  const result = await executeSql(config, 'SHOW WAREHOUSES');
  return (result.data || []).map(row => ({ name: row[0] as string, size: row[2] as string, state: row[3] as string }));
}

/** List databases (for discovery) */
export async function listDatabases(config: SnowflakeConfig): Promise<string[]> {
  const result = await executeSql(config, 'SHOW DATABASES');
  return (result.data || []).map(row => row[1] as string).filter(Boolean);
}

/** Show current user/role */
export async function getCurrentContext(config: SnowflakeConfig): Promise<{ user: string; role: string; warehouse: string }> {
  const result = await executeSql(config, 'SELECT CURRENT_USER(), CURRENT_ROLE(), CURRENT_WAREHOUSE()');
  const row = result.data?.[0] || [];
  return { user: row[0] as string, role: row[1] as string, warehouse: row[2] as string };
}

/** Grant warehouse usage to a role */
export async function grantWarehouseUsage(config: SnowflakeConfig, warehouseName: string, roleName: string): Promise<StatementResult> {
  return executeSql(config, `GRANT USAGE ON WAREHOUSE "${warehouseName}" TO ROLE "${roleName}"`);
}

/** Grant database usage to a role */
export async function grantDatabaseUsage(config: SnowflakeConfig, dbName: string, roleName: string): Promise<StatementResult> {
  return executeSql(config, `GRANT USAGE ON DATABASE "${dbName}" TO ROLE "${roleName}"`);
}
