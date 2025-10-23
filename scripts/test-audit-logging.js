const fetch = require("node-fetch");

const BASE_URL = "http://localhost:3000/api";

async function testEndpoint(method, path, body = null, description) {
  try {
    console.log(`\n🧪 Testing: ${description}`);
    console.log(`   ${method} ${path}`);

    const options = {
      method,
      headers: {
        "Content-Type": "application/json",
      },
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(`${BASE_URL}${path}`, options);
    const data = await response.text();

    console.log(`   ✅ Status: ${response.status}`);
    console.log(`   📝 Response: ${data.substring(0, 100)}...`);

    return { status: response.status, data };
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
    return { error: error.message };
  }
}

async function runTests() {
  console.log("🚀 Testing Audit Logging System\n");

  // Test public endpoints
  await testEndpoint("GET", "/health", null, "Health Check");
  await testEndpoint("GET", "/categories", null, "Get Categories");
  await testEndpoint("GET", "/products?limit=5", null, "Get Products");

  // Test cart operations
  await testEndpoint("GET", "/cart", null, "Get Cart");
  await testEndpoint(
    "POST",
    "/cart/items",
    {
      product_id: "test-product-id",
      quantity: 1,
    },
    "Add Item to Cart"
  );

  // Test auth endpoints (will fail but should log)
  await testEndpoint(
    "POST",
    "/auth/login",
    {
      email: "test@example.com",
      password: "wrongpassword",
    },
    "Login Attempt (Expected to Fail)"
  );

  await testEndpoint(
    "POST",
    "/auth/register",
    {
      name: "Test User",
      email: "test@example.com",
      password: "password123",
    },
    "Register Attempt"
  );

  // Test checkout validation
  await testEndpoint(
    "POST",
    "/checkout/validate",
    {
      items: [
        {
          product_id: "test-product-id",
          quantity: 1,
        },
      ],
    },
    "Checkout Validation"
  );

  console.log("\n✅ All tests completed!");
  console.log("\n📊 Check your database for audit logs:");
  console.log(
    "   SELECT * FROM api_audit_logs ORDER BY created_at DESC LIMIT 10;"
  );
}

runTests().catch(console.error);
