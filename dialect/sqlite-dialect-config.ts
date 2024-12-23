import { DatabaseConnection } from "kysely";

/**
 * Config for the SQLite dialect.
 */
export interface SqliteDialectConfig {
  database: SqliteDatabase | (() => Promise<SqliteDatabase>);

  onCreateConnection?: (connection: DatabaseConnection) => Promise<void>;
}

export interface SqliteDatabase {
  close(): void;
  prepare(sql: string): SqliteStatement;
}

export interface SqliteStatement {
  all(...parameters: ReadonlyArray<unknown>): unknown[];
  run(...parameters: ReadonlyArray<unknown>): {
    changes: number | bigint;
    lastInsertRowid: number | bigint;
  };
  iterate(...parameters: ReadonlyArray<unknown>): IterableIterator<unknown>;
}
