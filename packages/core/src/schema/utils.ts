import { replaceBigInts } from "@ponder/utils";
import type { ColumnDefinitionBuilder } from "kysely";
import type {
  Column,
  Constraints,
  DefaultColumn,
  Enum,
  EnumColumn,
  JSONColumn,
  ManyColumn,
  MaterialColumn,
  OneColumn,
  ReferenceColumn,
  ScalarColumn,
  Schema,
  Table,
} from "./common.js";

export const isScalarColumn = (column: Column): column is ScalarColumn =>
  column[" type"] === "scalar";

export const isReferenceColumn = (column: Column): column is ReferenceColumn =>
  column[" type"] === "reference";

export const isOneColumn = (column: Column): column is OneColumn =>
  column[" type"] === "one";

export const isManyColumn = (column: Column): column is ManyColumn =>
  column[" type"] === "many";

export const isJSONColumn = (column: Column): column is JSONColumn =>
  column[" type"] === "json";

export const isEnumColumn = (column: Column): column is EnumColumn =>
  column[" type"] === "enum";

export const isOptionalColumn = (column: Column): boolean => {
  if (isManyColumn(column) || isOneColumn(column)) return false;
  return column[" optional"];
};

export const isDefaultColumn = (column: Column): boolean => {
  return (column as any)[" default"] !== undefined;
};

export const isColumnHex = (column: Column): boolean =>
  isScalarColumn(column) && column[" scalar"] === "hex";

export const applyDefault = (
  col: ColumnDefinitionBuilder,
  column: DefaultColumn,
) => {
  if (isDefaultColumn(column)) {
    if (isColumnHex(column)) {
      col = col.defaultTo(`\\x${(column[" default"] as string).slice(2)}`);
    } else {
      col = col.defaultTo(column[" default"]);
    }
  }
  return col;
};

export const isListColumn = (column: Column): boolean => {
  if (
    isManyColumn(column) ||
    isOneColumn(column) ||
    isReferenceColumn(column) ||
    isJSONColumn(column)
  )
    return false;
  return column[" list"];
};

/** Returns true if the column corresponds to a column in the database */
export const isMaterialColumn = (column: Column): column is MaterialColumn =>
  isScalarColumn(column) ||
  isReferenceColumn(column) ||
  isEnumColumn(column) ||
  isJSONColumn(column);

export const isTable = (
  tableOrEnum: Schema[string],
): tableOrEnum is { table: Table; constraints: Constraints } =>
  !Array.isArray(tableOrEnum);

export const isEnum = (tableOrEnum: Schema[string]): tableOrEnum is Enum =>
  Array.isArray(tableOrEnum);

export const getTables = (
  schema: Schema,
): { [tableName: string]: { table: Table; constraints: Constraints } } => {
  const tables: {
    [tableName: string]: { table: Table; constraints: Constraints };
  } = {};

  for (const [name, tableOrEnum] of Object.entries(schema)) {
    if (isTable(tableOrEnum)) {
      tables[name] = tableOrEnum;
    }
  }

  return tables;
};

export const getEnums = (schema: Schema): { [enumName: string]: Enum } => {
  const enums: { [enumName: string]: Enum } = {};

  for (const [name, tableOrEnum] of Object.entries(schema)) {
    if (isEnum(tableOrEnum)) {
      enums[name] = tableOrEnum;
    }
  }

  return enums;
};

export const extractReferenceTable = (ref: ReferenceColumn): string => {
  return ref[" reference"].split(".")[0]!;
};

export const encodeSchema = (schema: Schema) => {
  return JSON.stringify(
    {
      tables: getTables(schema),
      enums: getEnums(schema),
    },
    (_k, v) => replaceBigInts(v, (n) => `${n}`),
  );
};
