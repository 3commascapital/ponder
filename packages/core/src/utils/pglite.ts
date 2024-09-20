import { PGlite, type PGliteOptions, type QueryOptions, type Results } from "@electric-sql/pglite";
import { ensureDirExists } from "./exists.js";
import { prettyPrint } from "./print.js";
import type { PostgresCursor, PostgresPool, PostgresPoolClient, PostgresQueryResult } from "kysely";

function improvePgliteErrors(database: PGlite) {
  const originalPrepare = database.query;
  // @ts-ignore
  database.prepare = (source: string) => {
    let statement: any;
    try {
      statement = originalPrepare.apply(database, [source]);
    } catch (error_) {
      // This block is reachable if the database is closed, and possibly in other cases.
      const error = error_ as Error & { detail?: string; meta?: string[] };
      error.name = "PgliteError";
      Error.captureStackTrace(error);

      error.meta = Array.isArray(error.meta) ? error.meta : [];
      if (error.detail) error.meta.push(`Detail:\n  ${error.detail}`);
      error.meta.push(`Statement:\n  ${statement}`);

      throw error;
    }

    const wrapper =
      (fn: (...args: any) => void) =>
      (...args: any) => {
        try {
          return fn.apply(statement, args);
        } catch (error_) {
          const error = error_ as Error & { detail?: string; meta?: string[] };
          error.name = "PgliteError";

          let parameters = (args[0] ?? []) as string[];
          parameters =
            parameters.length <= 25
              ? parameters
              : parameters.slice(0, 26).concat(["..."]);
          const params = parameters.reduce<Record<number, any>>(
            (acc, parameter, idx) => {
              acc[idx + 1] = parameter;
              return acc;
            },
            {},
          );

          error.meta = Array.isArray(error.meta) ? error.meta : [];
          if (error.detail) error.meta.push(`Detail:\n  ${error.detail}`);
          error.meta.push(`Statement:\n  ${source}`);
          error.meta.push(`Parameters:\n${prettyPrint(params)}`);

          throw error;
        }
      };

    for (const method of ["run", "get", "all"]) {
      // @ts-ignore
      statement[method] = wrapper(statement[method]);
    }

    return statement;
  };
}

export type PgliteDatabase = PostgresPool & PGlite;

const conformPoolInterface = (file: string, options: PGliteOptions & {
  queryOptions?: QueryOptions
} = {}) => {
  let outstanding: PGlite[] = []
  const queryOptions = options.queryOptions
  return {
    connect: async () => {
      const instance = await PGlite.create(file, options)
      outstanding.push(instance)
      return {
        query: async <R>(q: string | PostgresCursor<R>, p?: readonly unknown[]) => {
          if (typeof q === 'string') {
            const result = await instance.query<R>(q, p, queryOptions)
            return {
              ...result,
              rowCount: result.affectedRows as number,
              command: 'SELECT',
            }
          }
          return await instance.query(q)
        },
        release: () => {
          outstanding = outstanding.filter((nstnc) => nstnc !== instance)
          if (!instance.closed) {
            instance.close()
          }
        },
      } as PostgresPoolClient
    },
    end: async () => {
      const closing: Promise<void>[] = []
      for (const instance of outstanding) {
        if (!instance.closed) {
          closing.push(instance.close())
        }
      }
      outstanding = []
      await Promise.all(closing)
    },
  }
}

export function createSqliteDatabase(
  file: string,
  options?: PGliteOptions,
): PgliteDatabase {
  ensureDirExists(file);
  const database = new PGlite(file, options);
  improvePgliteErrors(database);
  // database.pragma("journal_mode = WAL");
  return conformPoolInterface(file, options);
}

export function createReadonlyPgliteDatabase(
  file: string,
  options?: PGliteOptions,
): PgliteDatabase {
  ensureDirExists(file);
  // { readonly: true, ...options }
  const database = new PGlite(file, options);
  improvePgliteErrors(database);
  // database.pragma("journal_mode = WAL");
  return conformPoolInterface(database);
}
