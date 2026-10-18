import { migrate, pool } from "./db.js";

migrate()
  .then((ran) => {
    console.log(
      `migrations applied: ${ran.length ? ran.join(", ") : "none (up to date)"}`
    );
    return pool.end();
  })
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
