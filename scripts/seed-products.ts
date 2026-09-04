import { ensureProCatalog } from "../server/proCatalog";

async function seed() {
  await ensureProCatalog();
  console.log("PLAYR1 Pro catalog ready");
}

seed().catch((error) => {
  console.error("Failed to seed PLAYR1 Pro catalog:", error);
  process.exitCode = 1;
});