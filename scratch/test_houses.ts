import { authRouter } from "../libs/backend/src/api/routes/auth";
import { housesRouter } from "../libs/backend/src/api/routes/houses";

async function run(): Promise<void> {
  // 1. Login to get token
  const loginRes = await authRouter.request("/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "alice@exemplo.com", password: "senha123" }),
  });

  const loginData = await loginRes.json();
  const token = loginData.token;
  console.log("Logged in successfully, token received.");

  // 2. Fetch houses using the token
  const housesRes = await housesRouter.request("/houses", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  console.log("Houses Status:", housesRes.status);
  console.log("Houses Response:", await housesRes.json());
  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
