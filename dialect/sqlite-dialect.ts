import {
  DatabaseIntrospector,
  Dialect,
  DialectAdapter,
  Driver,
  Kysely,
  QueryCompiler,
} from "kysely";
import { SqliteDialectConfig } from "./sqlite-dialect-config.js";
import { SqliteDriver } from "./sqlite-driver.js";
import { SqliteQueryCompiler } from "./sqlite-query-compiler.js";
import { SqliteAdapter } from "./sqlite-adapter.js";
import { SqliteIntrospector } from "./sqlite-introspector.js";

/**
 * A dialect for node:sqlite. It's almost the same as the better-sqlite3
 * adapter in provided in Kysely but covering a few small differences
 * between better-sqlite3 and node:sqlite's APIs.
 *
 * Most of the code is copy and pasted from the better-sqlite3 adapter:
 * https://github.com/kysely-org/kysely/tree/42732f7252005c0bc02484fd6ec74d6a15370d2c/src/dialect/sqlite
 */
export class SqliteDialect implements Dialect {
  readonly #config: SqliteDialectConfig;

  constructor(config: SqliteDialectConfig) {
    this.#config = Object.freeze({ ...config });
  }

  createDriver(): Driver {
    return new SqliteDriver(this.#config);
  }

  createQueryCompiler(): QueryCompiler {
    return new SqliteQueryCompiler();
  }

  createAdapter(): DialectAdapter {
    return new SqliteAdapter();
  }

  createIntrospector(db: Kysely<any>): DatabaseIntrospector {
    return new SqliteIntrospector(db);
  }
}
