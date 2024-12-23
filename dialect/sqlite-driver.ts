import {
  SqliteDatabase,
  SqliteDialectConfig,
} from "./sqlite-dialect-config.js";
import {
  CompiledQuery,
  DatabaseConnection,
  Driver,
  QueryResult,
  SelectQueryNode,
} from "kysely";

export class SqliteDriver implements Driver {
  readonly #config: SqliteDialectConfig;
  readonly #connectionMutex = new ConnectionMutex();

  #db?: SqliteDatabase;
  #connection?: DatabaseConnection;

  constructor(config: SqliteDialectConfig) {
    this.#config = Object.freeze({ ...config });
  }

  async init(): Promise<void> {
    this.#db =
      typeof this.#config.database === "function"
        ? await this.#config.database()
        : this.#config.database;

    this.#connection = new SqliteConnection(this.#db);

    if (this.#config.onCreateConnection) {
      await this.#config.onCreateConnection(this.#connection);
    }
  }

  async acquireConnection(): Promise<DatabaseConnection> {
    // SQLite only has one single connection. We use a mutex here to wait
    // until the single connection has been released.
    await this.#connectionMutex.lock();
    return this.#connection!;
  }

  async beginTransaction(connection: DatabaseConnection): Promise<void> {
    await connection.executeQuery(CompiledQuery.raw("begin"));
  }

  async commitTransaction(connection: DatabaseConnection): Promise<void> {
    await connection.executeQuery(CompiledQuery.raw("commit"));
  }

  async rollbackTransaction(connection: DatabaseConnection): Promise<void> {
    await connection.executeQuery(CompiledQuery.raw("rollback"));
  }

  async releaseConnection(): Promise<void> {
    this.#connectionMutex.unlock();
  }

  async destroy(): Promise<void> {
    this.#db?.close();
  }
}

class SqliteConnection implements DatabaseConnection {
  readonly #db: SqliteDatabase;

  constructor(db: SqliteDatabase) {
    this.#db = db;
  }

  executeQuery<O>(compiledQuery: CompiledQuery): Promise<QueryResult<O>> {
    const { sql, parameters, query } = compiledQuery;
    const stmt = this.#db.prepare(sql);

    if (SelectQueryNode.is(query)) {
      return Promise.resolve({
        rows: stmt.all(...parameters) as O[],
      });
    } else {
      const { changes, lastInsertRowid } = stmt.run(...parameters);

      const numAffectedRows =
        changes !== undefined && changes !== null ? BigInt(changes) : undefined;

      return Promise.resolve({
        // TODO: remove.
        numUpdatedOrDeletedRows: numAffectedRows,
        numAffectedRows,
        insertId:
          lastInsertRowid !== undefined && lastInsertRowid !== null
            ? BigInt(lastInsertRowid)
            : undefined,
        rows: [],
      });
    }
  }

  async *streamQuery<R>(
    compiledQuery: CompiledQuery,
    _chunkSize: number,
  ): AsyncIterableIterator<QueryResult<R>> {
    const { sql, parameters, query } = compiledQuery;
    const stmt = this.#db.prepare(sql);
    if (SelectQueryNode.is(query)) {
      const iter = stmt.iterate(...parameters) as IterableIterator<R>;
      for (const row of iter) {
        yield {
          rows: [row],
        };
      }
    } else {
      throw new Error(
        "Sqlite driver only supports streaming of select queries",
      );
    }
  }
}

class ConnectionMutex {
  #promise?: Promise<void>;
  #resolve?: () => void;

  async lock(): Promise<void> {
    while (this.#promise) {
      await this.#promise;
    }

    this.#promise = new Promise((resolve) => {
      this.#resolve = resolve;
    });
  }

  unlock(): void {
    const resolve = this.#resolve;

    this.#promise = undefined;
    this.#resolve = undefined;

    resolve?.();
  }
}
