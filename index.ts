import { DatabaseSync } from "node:sqlite";
import { Generated, Kysely } from "kysely";
import { SqliteDialect } from "./dialect/sqlite-dialect.js";

interface Database {
  person: {
    id: Generated<number>;
    first_name: string;
    last_name: string | null;
  };
}
export const db = new Kysely<Database>({
  dialect: new SqliteDialect({
    // @ts-expect-error @types/node hasn't been updated yet. error should say iterate doesn't exist on StatementSync
    database: new DatabaseSync(":memory:"),
  }),
});

await db.schema
  .createTable("person")
  .addColumn("id", "integer", (col) => col.autoIncrement().primaryKey())
  .addColumn("first_name", "varchar(50)", (col) => col.notNull())
  .addColumn("last_name", "varchar(255)")
  .execute();

console.log(
  await db
    .insertInto("person")
    .values({
      first_name: "Jennifer",
      last_name: "Aniston",
    })
    .executeTakeFirst(),
);
console.log(
  await db.selectFrom("person").select(["first_name", "last_name"]).execute(),
);
