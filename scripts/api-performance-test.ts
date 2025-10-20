#!/usr/bin/env tsx

/**
 * Comprehensive API Performance Test Suite
 *
 * This script tests all API endpoints and generates detailed performance metrics.
 * It creates resources, tests them, and cleans up afterwards.
 */

import fs from "fs";
import path from "path";
import { getSecretAsync } from "../src/lib/encryption/async-secrets";

interface PerformanceMetrics {
  endpoint: string;
  method: string;
  status: number;
  responseTime: number;
  dataTransferred: number;
  success: boolean;
  error?: string;
  timestamp: string;
}

interface TestResult {
  metrics: PerformanceMetrics[];
  summary: {
    totalTests: number;
    successfulTests: number;
    failedTests: number;
    averageResponseTime: number;
    totalDataTransferred: number;
    slowestEndpoint: string;
    fastestEndpoint: string;
  };
}

class APIPerformanceTester {
  private baseUrl: string;
  private metrics: PerformanceMetrics[] = [];
  private authToken: string | null = null;
  private rootUserEmail: string | null = null;
  private rootUserPassword: string | null = null;
  private createdResources: {
    products: string[];
    tags: string[];
    users: string[];
    addresses: string[];
    cartItems: string[];
  } = {
    products: [],
    tags: [],
    users: [],
    addresses: [],
    cartItems: [],
  };

  constructor(baseUrl: string = "http://localhost:3000") {
    this.baseUrl = baseUrl;
  }

  private async initializeAuthentication(): Promise<void> {
    console.log("🔐 Initializing authentication...");

    try {
      // Load ROOT_EMAIL and ROOT_SECRET from GCP Secret Manager
      this.rootUserEmail = await getSecretAsync("ROOT_EMAIL");
      this.rootUserPassword = await getSecretAsync("ROOT_SECRET");

      if (!this.rootUserEmail || !this.rootUserPassword) {
        console.warn(
          "⚠️ ROOT_EMAIL or ROOT_SECRET not found in GCP Secret Manager"
        );
        console.log("Continuing without authentication...");
        return;
      }

      console.log(`🔑 Using root user: ${this.rootUserEmail}`);

      // First, try to create the root user if it doesn't exist
      const createRootUserResponse = await fetch(
        `${this.baseUrl}/api/admin/create-root-user`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: this.rootUserEmail,
            rootSecret: this.rootUserPassword,
          }),
        }
      );

      if (createRootUserResponse.ok) {
        console.log("✅ Root user created/verified");
      } else {
        const createError = await createRootUserResponse.text();
        console.log("Root user creation response:", createError);
      }

      // Login as root user
      const loginResponse = await fetch(`${this.baseUrl}/api/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: this.rootUserEmail,
          password: this.rootUserPassword,
        }),
      });

      if (loginResponse.ok) {
        // Extract the auth token from the Set-Cookie header
        const setCookieHeader = loginResponse.headers.get("set-cookie");
        if (setCookieHeader) {
          const authTokenMatch = setCookieHeader.match(/auth-token=([^;]+)/);
          if (authTokenMatch) {
            this.authToken = authTokenMatch[1];
            console.log("✅ Successfully authenticated as root user");
          } else {
            console.warn("⚠️ Could not extract auth token from cookie");
            console.log("Continuing without authentication...");
          }
        } else {
          console.warn("⚠️ No Set-Cookie header received");
          console.log("Continuing without authentication...");
        }
      } else {
        console.warn("⚠️ Failed to authenticate as root user");
        try {
          const errorResponse = await loginResponse.text();
          console.log("Login error response:", errorResponse);
        } catch (e) {
          console.log("Could not read error response");
        }
        console.log("Continuing without authentication...");
      }
    } catch (error) {
      console.warn("⚠️ Authentication initialization failed:", error);
      console.log("Continuing without authentication...");
    }
  }

  private async makeRequest(
    endpoint: string,
    method: string = "GET",
    body?: any,
    headers: Record<string, string> = {}
  ): Promise<PerformanceMetrics> {
    const startTime = Date.now();
    const url = `${this.baseUrl}${endpoint}`;

    try {
      const requestHeaders: Record<string, string> = {
        "Content-Type": "application/json",
        ...headers,
      };

      // Add auth token as cookie if available
      if (this.authToken) {
        requestHeaders["Cookie"] = `auth-token=${this.authToken}`;
      }

      const response = await fetch(url, {
        method,
        headers: requestHeaders,
        body: body ? JSON.stringify(body) : undefined,
      });

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      let responseText = "";
      let dataTransferred = 0;

      try {
        responseText = await response.text();
        dataTransferred = responseText.length;
      } catch (e) {
        // Response might not be text
        dataTransferred = 0;
      }

      return {
        endpoint,
        method,
        status: response.status,
        responseTime,
        dataTransferred,
        success: response.ok,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      const endTime = Date.now();
      const responseTime = endTime - startTime;

      return {
        endpoint,
        method,
        status: 0,
        responseTime,
        dataTransferred: 0,
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      };
    }
  }

  private async testHealthEndpoint(): Promise<void> {
    console.log("Testing health endpoint...");
    const metric = await this.makeRequest("/api/health");
    this.metrics.push(metric);
  }

  private async testAuthEndpoints(): Promise<void> {
    console.log("Testing auth endpoints...");

    // Test auth/me
    const meMetric = await this.makeRequest("/api/auth/me");
    this.metrics.push(meMetric);

    // Test auth/logout (POST method)
    const logoutMetric = await this.makeRequest("/api/auth/logout", "POST");
    this.metrics.push(logoutMetric);

    // Test csrf-token
    const csrfMetric = await this.makeRequest("/api/csrf-token");
    this.metrics.push(csrfMetric);

    // Test registration (creates user) - only if not authenticated
    if (!this.authToken) {
      const registerData = {
        email: `test-${Date.now()}@example.com`,
        name: "Test User",
        password: "TestPassword123!",
      };

      const registerMetric = await this.makeRequest(
        "/api/auth/register",
        "POST",
        registerData
      );
      this.metrics.push(registerMetric);

      if (registerMetric.success) {
        // Note: In a real test, you'd extract the user ID from the response
        // For now, we'll track it for cleanup
        console.log("Created test user for cleanup");
      }
    }
  }

  private async testAdminEndpoints(): Promise<void> {
    console.log("Testing admin endpoints...");

    // Test admin endpoints that don't require authentication
    const publicEndpoints = ["/api/admin/create-root-user"];

    for (const endpoint of publicEndpoints) {
      const metric = await this.makeRequest(endpoint, "POST", {
        email: `root-${Date.now()}@example.com`,
        name: "Root User",
        password: "RootPassword123!",
      });
      this.metrics.push(metric);
    }

    // Test tags endpoints
    const tagData = {
      name: `Test Tag ${Date.now()}`,
    };

    const createTagMetric = await this.makeRequest(
      "/api/admin/tags",
      "POST",
      tagData
    );
    this.metrics.push(createTagMetric);

    if (createTagMetric.success) {
      // Extract tag ID from response for cleanup
      try {
        const responseText = await fetch(`${this.baseUrl}/api/admin/tags`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            ...(this.authToken
              ? { Cookie: `auth-token=${this.authToken}` }
              : {}),
          },
        }).then((res) => res.text());

        const response = JSON.parse(responseText);
        if (response.tags) {
          const createdTag = response.tags.find(
            (tag: any) => tag.name === tagData.name
          );
          if (createdTag) {
            this.createdResources.tags.push(createdTag.id);
            console.log("Created test tag for cleanup");
          }
        }
      } catch (e) {
        console.log("Could not extract tag ID for cleanup");
      }
    }

    const getTagsMetric = await this.makeRequest("/api/admin/tags");
    this.metrics.push(getTagsMetric);

    // Test users endpoints
    const userData = {
      email: `admin-${Date.now()}@example.com`,
      name: "Admin User",
      password: "AdminPassword123!",
      role: "admin",
    };

    const createUserMetric = await this.makeRequest(
      "/api/admin/users",
      "POST",
      userData
    );
    this.metrics.push(createUserMetric);

    if (createUserMetric.success) {
      // Extract user ID from response for cleanup
      try {
        const responseText = await fetch(`${this.baseUrl}/api/admin/users`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            ...(this.authToken
              ? { Cookie: `auth-token=${this.authToken}` }
              : {}),
          },
        }).then((res) => res.text());

        const response = JSON.parse(responseText);
        if (response.users) {
          const createdUser = response.users.find(
            (user: any) => user.email === userData.email
          );
          if (createdUser) {
            this.createdResources.users.push(createdUser.id);
            console.log("Created test admin user for cleanup");
          }
        }
      } catch (e) {
        console.log("Could not extract user ID for cleanup");
      }
    }

    const getUsersMetric = await this.makeRequest("/api/admin/users");
    this.metrics.push(getUsersMetric);

    // Test products endpoints
    const productData = {
      title: `Test Product ${Date.now()}`,
      slug: `test-product-${Date.now()}`,
      description: "Test product description",
      status: "draft",
    };

    const createProductMetric = await this.makeRequest(
      "/api/admin/products",
      "POST",
      productData
    );
    this.metrics.push(createProductMetric);

    if (createProductMetric.success) {
      // Extract product ID from response for cleanup
      try {
        const responseText = await fetch(`${this.baseUrl}/api/admin/products`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            ...(this.authToken
              ? { Cookie: `auth-token=${this.authToken}` }
              : {}),
          },
        }).then((res) => res.text());

        const response = JSON.parse(responseText);
        if (response.products) {
          const createdProduct = response.products.find(
            (product: any) => product.slug === productData.slug
          );
          if (createdProduct) {
            this.createdResources.products.push(createdProduct.id);
            console.log("Created test product for cleanup");
          }
        }
      } catch (e) {
        console.log("Could not extract product ID for cleanup");
      }
    }

    const getProductsMetric = await this.makeRequest("/api/admin/products");
    this.metrics.push(getProductsMetric);
  }

  private async testProductEndpoints(): Promise<void> {
    console.log("Testing product endpoints...");

    // Test products GET
    const productsMetric = await this.makeRequest("/api/products");
    this.metrics.push(productsMetric);

    // Test popular products (may fail if no analytics data exists)
    const popularMetric = await this.makeRequest("/api/products/popular");
    this.metrics.push(popularMetric);

    // Test trending products (may fail if no purchase data exists)
    const trendingMetric = await this.makeRequest("/api/products/trending");
    this.metrics.push(trendingMetric);

    // Test specific product endpoint (using a known slug)
    const productSlugMetric = await this.makeRequest(
      "/api/products/test-product"
    );
    this.metrics.push(productSlugMetric);
  }

  private async testCategoryEndpoints(): Promise<void> {
    console.log("Testing category endpoints...");

    const categoryEndpoints = ["/api/categories"];

    for (const endpoint of categoryEndpoints) {
      const metric = await this.makeRequest(endpoint);
      this.metrics.push(metric);
    }

    // Test category products endpoint
    const categoryProductsMetric = await this.makeRequest(
      "/api/categories/test-category/products"
    );
    this.metrics.push(categoryProductsMetric);
  }

  private async testCartEndpoints(): Promise<void> {
    console.log("Testing cart endpoints...");

    // Test cart GET
    const cartMetric = await this.makeRequest("/api/cart");
    this.metrics.push(cartMetric);

    // Test cart sync (POST method with items)
    const cartSyncMetric = await this.makeRequest("/api/cart/sync", "POST", {
      items: [
        {
          product_id: "test-product-id",
          quantity: 1,
          selected_options: {},
        },
      ],
    });
    this.metrics.push(cartSyncMetric);

    // Test cart items (POST method to add item)
    const cartItemsMetric = await this.makeRequest("/api/cart/items", "POST", {
      product_id: "test-product-id",
      quantity: 1,
      selected_options: {},
    });
    this.metrics.push(cartItemsMetric);

    // Test specific cart item (GET method)
    const cartItemMetric = await this.makeRequest(
      "/api/cart/items/test-item-id"
    );
    this.metrics.push(cartItemMetric);
  }

  private async testOrderEndpoints(): Promise<void> {
    console.log("Testing order endpoints...");

    // Test orders GET
    const ordersMetric = await this.makeRequest("/api/orders");
    this.metrics.push(ordersMetric);

    // Test order lookup (POST method with orderNumber and email)
    const orderLookupMetric = await this.makeRequest(
      "/api/orders/lookup",
      "POST",
      {
        orderNumber: "ORD-12345678-TEST",
        email: "test@example.com",
      }
    );
    this.metrics.push(orderLookupMetric);

    // Test order confirmation (GET method with orderNumber and email query params)
    const orderConfirmationMetric = await this.makeRequest(
      "/api/orders/confirmation?orderNumber=ORD-12345678-TEST&email=test@example.com"
    );
    this.metrics.push(orderConfirmationMetric);

    // Test specific order (GET method)
    const orderMetric = await this.makeRequest("/api/orders/test-order-id");
    this.metrics.push(orderMetric);
  }

  private async testAddressEndpoints(): Promise<void> {
    console.log("Testing address endpoints...");

    // Test addresses GET
    const addressesMetric = await this.makeRequest("/api/addresses");
    this.metrics.push(addressesMetric);

    // Test specific address (PUT/DELETE methods)
    const addressPutMetric = await this.makeRequest(
      "/api/addresses/test-address-id",
      "PUT",
      {
        type: "shipping",
        name: "Test User",
        line1: "123 Test St",
        city: "Test City",
        region: "Test State",
        postal_code: "12345",
        country: "US",
        is_default: false,
      }
    );
    this.metrics.push(addressPutMetric);

    const addressDeleteMetric = await this.makeRequest(
      "/api/addresses/test-address-id",
      "DELETE"
    );
    this.metrics.push(addressDeleteMetric);
  }

  private async testCheckoutEndpoints(): Promise<void> {
    console.log("Testing checkout endpoints...");

    // Test checkout validate (POST method with items)
    const validateMetric = await this.makeRequest(
      "/api/checkout/validate",
      "POST",
      {
        items: [
          {
            product_id: "test-product-id",
            quantity: 1,
            selected_options: {},
          },
        ],
      }
    );
    this.metrics.push(validateMetric);

    // Test guest checkout (POST method with full checkout data)
    const guestCheckoutMetric = await this.makeRequest(
      "/api/checkout/guest",
      "POST",
      {
        cartItems: [
          {
            product_id: "test-product-id",
            quantity: 1,
            selected_options: {},
          },
        ],
        shippingAddress: {
          name: "Test User",
          line1: "123 Test St",
          city: "Test City",
          region: "Test State",
          postal_code: "12345",
          country: "US",
        },
        guestEmail: "test@example.com",
        useSameAddress: true,
      }
    );
    this.metrics.push(guestCheckoutMetric);

    // Test checkout submit (POST method with authenticated user)
    const submitMetric = await this.makeRequest(
      "/api/checkout/submit",
      "POST",
      {
        cartItems: [
          {
            product_id: "test-product-id",
            quantity: 1,
            selected_options: {},
          },
        ],
        shippingAddress: {
          name: "Test User",
          line1: "123 Test St",
          city: "Test City",
          region: "Test State",
          postal_code: "12345",
          country: "US",
        },
        useSameAddress: true,
      }
    );
    this.metrics.push(submitMetric);
  }

  private async testStockNotificationEndpoints(): Promise<void> {
    console.log("Testing stock notification endpoints...");

    // Test stock notification subscription (POST method)
    const stockNotificationMetric = await this.makeRequest(
      "/api/products/test-product/stock-notification",
      "POST",
      {
        email: "test@example.com",
      }
    );
    this.metrics.push(stockNotificationMetric);

    // Test stock notification status check (GET method with email query param)
    const stockStatusMetric = await this.makeRequest(
      "/api/products/test-product/stock-notification?email=test@example.com"
    );
    this.metrics.push(stockStatusMetric);
  }

  private async cleanupCreatedResources(): Promise<void> {
    console.log("Cleaning up created resources...");

    // Clean up tags
    if (this.createdResources.tags.length > 0) {
      const deleteTagsMetric = await this.makeRequest(
        "/api/admin/tags",
        "DELETE",
        {
          tagIds: this.createdResources.tags,
        }
      );
      this.metrics.push(deleteTagsMetric);
    }

    // Clean up users (including the root user we created)
    if (this.createdResources.users.length > 0) {
      const deleteUsersMetric = await this.makeRequest(
        "/api/admin/users",
        "DELETE",
        {
          userIds: this.createdResources.users,
        }
      );
      this.metrics.push(deleteUsersMetric);
    }

    // Clean up products
    if (this.createdResources.products.length > 0) {
      const deleteProductsMetric = await this.makeRequest(
        "/api/admin/products",
        "DELETE",
        {
          productIds: this.createdResources.products,
        }
      );
      this.metrics.push(deleteProductsMetric);
    }

    // Note: Using existing root user from GCP Secret Manager
    // No cleanup needed for root user credentials
  }

  private generateSummary(): TestResult["summary"] {
    const successfulTests = this.metrics.filter((m) => m.success).length;
    const failedTests = this.metrics.filter((m) => !m.success).length;
    const totalResponseTime = this.metrics.reduce(
      (sum, m) => sum + m.responseTime,
      0
    );
    const totalDataTransferred = this.metrics.reduce(
      (sum, m) => sum + m.dataTransferred,
      0
    );

    const slowestEndpoint = this.metrics.reduce((slowest, current) =>
      current.responseTime > slowest.responseTime ? current : slowest
    );

    const fastestEndpoint = this.metrics.reduce((fastest, current) =>
      current.responseTime < fastest.responseTime ? current : fastest
    );

    return {
      totalTests: this.metrics.length,
      successfulTests,
      failedTests,
      averageResponseTime: totalResponseTime / this.metrics.length,
      totalDataTransferred,
      slowestEndpoint: `${slowestEndpoint.method} ${slowestEndpoint.endpoint}`,
      fastestEndpoint: `${fastestEndpoint.method} ${fastestEndpoint.endpoint}`,
    };
  }

  private async saveResults(): Promise<void> {
    const results: TestResult = {
      metrics: this.metrics,
      summary: this.generateSummary(),
    };

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = `api-performance-test-${timestamp}.json`;
    const filepath = path.join(process.cwd(), "performance-logs", filename);

    // Ensure directory exists
    const dir = path.dirname(filepath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(filepath, JSON.stringify(results, null, 2));
    console.log(`\nPerformance test results saved to: ${filepath}`);

    // Also save a human-readable summary
    const summaryFilename = `api-performance-summary-${timestamp}.txt`;
    const summaryFilepath = path.join(
      process.cwd(),
      "performance-logs",
      summaryFilename
    );

    const summaryText = `
API Performance Test Summary
============================
Test Date: ${new Date().toISOString()}
Total Tests: ${results.summary.totalTests}
Successful: ${results.summary.successfulTests}
Failed: ${results.summary.failedTests}
Success Rate: ${(
      (results.summary.successfulTests / results.summary.totalTests) *
      100
    ).toFixed(2)}%

Performance Metrics:
- Average Response Time: ${results.summary.averageResponseTime.toFixed(2)}ms
- Total Data Transferred: ${(
      results.summary.totalDataTransferred / 1024
    ).toFixed(2)} KB
- Slowest Endpoint: ${results.summary.slowestEndpoint}
- Fastest Endpoint: ${results.summary.fastestEndpoint}

Detailed Results:
${this.metrics
  .map(
    (m) =>
      `${m.method} ${m.endpoint} - ${m.status} - ${m.responseTime}ms - ${(
        m.dataTransferred / 1024
      ).toFixed(2)}KB ${m.success ? "✓" : "✗"}`
  )
  .join("\n")}
`;

    fs.writeFileSync(summaryFilepath, summaryText);
    console.log(`Performance test summary saved to: ${summaryFilepath}`);
  }

  async runFullTest(): Promise<void> {
    console.log("🚀 Starting comprehensive API performance test...\n");

    try {
      // Initialize authentication first
      await this.initializeAuthentication();

      await this.testHealthEndpoint();
      await this.testAuthEndpoints();
      await this.testAdminEndpoints();
      await this.testProductEndpoints();
      await this.testCategoryEndpoints();
      await this.testCartEndpoints();
      await this.testOrderEndpoints();
      await this.testAddressEndpoints();
      await this.testCheckoutEndpoints();
      await this.testStockNotificationEndpoints();

      await this.cleanupCreatedResources();

      await this.saveResults();

      console.log("\n✅ Performance test completed successfully!");
      console.log(`📊 Tested ${this.metrics.length} endpoints`);
      console.log(
        `✅ ${this.metrics.filter((m) => m.success).length} successful`
      );
      console.log(`❌ ${this.metrics.filter((m) => !m.success).length} failed`);
    } catch (error) {
      console.error("❌ Performance test failed:", error);
      throw error;
    }
  }
}

// Main execution
async function main() {
  const baseUrl = process.env.API_BASE_URL || "http://localhost:3000";
  const tester = new APIPerformanceTester(baseUrl);

  try {
    await tester.runFullTest();
  } catch (error) {
    console.error("Test execution failed:", error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

export { APIPerformanceTester };
