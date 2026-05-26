import { authRouter } from "../libs/backend/src/api/routes/auth";

async function run(): Promise<void> {
  const res = await authRouter.request("/auth/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: "alice@exemplo.com",
      password: "senha123",
    }),
  });

  console.log("Status:", res.status);
  console.log("Response:", await res.json());
  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
