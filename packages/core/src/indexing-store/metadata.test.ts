import {
  setupCommon,
  setupDatabaseServices,
  setupIsolatedDatabase,
} from "@/_test/setup.js";
import { createSchema } from "@/schema/schema.js";
import { beforeEach, expect, test } from "vitest";
import { getMetadataStore } from "./metadata.js";

beforeEach(setupCommon);
beforeEach(setupIsolatedDatabase);

const schema = createSchema(() => ({}));

test("getMetadata() empty", async (context) => {
  console.log("setup");
  const { database, cleanup } = await setupDatabaseServices(context, {
    schema,
  });
  console.log("get store");
  const metadataStore = getMetadataStore({ db: database.qb.user });

  console.log("get status");
  const status = await metadataStore.getStatus();

  expect(status).toBe(null);

  console.log("cleanup");
  await cleanup();
});

test("setMetadata()", async (context) => {
  const { database, cleanup } = await setupDatabaseServices(context, {
    schema,
  });
  const metadataStore = getMetadataStore({ db: database.qb.user });

  await metadataStore.setStatus({
    mainnet: { block: { number: 10, timestamp: 10 }, ready: false },
  });

  const status = await metadataStore.getStatus();

  expect(status).toStrictEqual({
    mainnet: { block: { number: 10, timestamp: 10 }, ready: false },
  });

  await cleanup();
});
