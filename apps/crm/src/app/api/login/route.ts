export async function POST(req: Request) {
  const { email, password } = await req.json();

  if (email === "admin@test.com" && password === "1234") {
    return Response.json({
      token: "test-token",
    });
  }

  return Response.json(
    { error: "Invalid credentials" },
    { status: 401 }
  );
}
