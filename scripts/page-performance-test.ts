import { getSecretAsync } from "@/lib/encryption/async-secrets";
import { mkdirSync, writeFileSync } from "fs";
import { join } from "path";

interface PageMetric {
  url: string;
  method: string;
  status: number;
  responseTime: number;
  htmlSize: number;
  success: boolean;
  error?: string;
  timestamp: string;
}

interface PageTestResult {
  summary: {
    totalPages: number;
    successfulPages: number;
    failedPages: number;
    successRate: number;
    averageResponseTime: number;
    totalHtmlSize: number;
    slowestPage: PageMetric;
    fastestPage: PageMetric;
  };
  metrics: PageMetric[];
}

class PagePerformanceTester {
  private baseUrl: string;
  private authToken: string | null = null;
  private rootUserEmail: string = "";
  private rootUserPassword: string = "";
  private metrics: PageMetric[] = [];
  private testData: {
    products: Array<{ id: string; slug: string; title: string }>;
    categories: Array<{ id: string; slug: string; name: string }>;
    orders: Array<{ id: string; orderNumber: string }>;
    addresses: Array<{ id: string }>;
  } = {
    products: [],
    categories: [],
    orders: [],
    addresses: [],
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

  private async createTestData(): Promise<void> {
    console.log("📦 Creating test data for pages...");

    try {
      // Fetch existing categories
      const categoriesResponse = await fetch(`${this.baseUrl}/api/categories`);
      if (categoriesResponse.ok) {
        const categoriesResult = await categoriesResponse.json();
        this.testData.categories = categoriesResult.data.slice(0, 3); // Use first 3 categories
        console.log(
          `✅ Found ${this.testData.categories.length} existing categories`
        );
      }

      // Fetch existing products
      const productsResponse = await fetch(`${this.baseUrl}/api/products`);
      if (productsResponse.ok) {
        const productsResult = await productsResponse.json();
        this.testData.products = productsResult.data.slice(0, 5); // Use first 5 products
        console.log(
          `✅ Found ${this.testData.products.length} existing products`
        );
      }

      // Create test orders (if we have products)
      if (this.testData.products.length > 0) {
        const orderData = {
          cartItems: [
            {
              product_id: this.testData.products[0].id,
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
        };

        const createOrderResponse = await fetch(
          `${this.baseUrl}/api/checkout/guest`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(orderData),
          }
        );

        if (createOrderResponse.ok) {
          const orderResult = await createOrderResponse.json();
          this.testData.orders.push({
            id: orderResult.data.orderId,
            orderNumber: orderResult.data.orderNumber,
          });
          console.log("✅ Created test order");
        }
      }

      console.log(
        `📊 Test data created: ${this.testData.products.length} products, ${this.testData.categories.length} categories, ${this.testData.orders.length} orders`
      );
    } catch (error) {
      console.warn("⚠️ Failed to create some test data:", error);
    }
  }

  private async fetchPage(
    url: string,
    method: string = "GET"
  ): Promise<PageMetric> {
    const startTime = Date.now();

    try {
      const response = await fetch(`${this.baseUrl}${url}`, {
        method,
        headers: {
          "Content-Type": "text/html",
          Accept:
            "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
          ...(this.authToken ? { Cookie: `auth-token=${this.authToken}` } : {}),
        },
      });

      const responseTime = Date.now() - startTime;
      const htmlContent = await response.text();
      const htmlSize = new Blob([htmlContent]).size;

      return {
        url,
        method,
        status: response.status,
        responseTime,
        htmlSize,
        success: response.ok,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      return {
        url,
        method,
        status: 0,
        responseTime,
        htmlSize: 0,
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      };
    }
  }

  private async testStaticPages(): Promise<void> {
    console.log("🏠 Testing static pages...");

    const staticPages = [
      "/",
      "/products",
      "/categories",
      "/auth/signin",
      "/auth/signup",
      "/auth/forgot-password",
      "/cart",
      "/checkout",
    ];

    for (const page of staticPages) {
      const metric = await this.fetchPage(page);
      this.metrics.push(metric);
      console.log(
        `${metric.success ? "✅" : "❌"} ${page} - ${
          metric.responseTime
        }ms - ${(metric.htmlSize / 1024).toFixed(2)}KB`
      );
    }
  }

  private async testDynamicPages(): Promise<void> {
    console.log("🔄 Testing dynamic pages...");

    // Test product pages
    for (const product of this.testData.products) {
      const metric = await this.fetchPage(`/products/${product.slug}`);
      this.metrics.push(metric);
      console.log(
        `${metric.success ? "✅" : "❌"} /products/${product.slug} - ${
          metric.responseTime
        }ms - ${(metric.htmlSize / 1024).toFixed(2)}KB`
      );
    }

    // Test category pages
    for (const category of this.testData.categories) {
      const metric = await this.fetchPage(`/categories/${category.slug}`);
      this.metrics.push(metric);
      console.log(
        `${metric.success ? "✅" : "❌"} /categories/${category.slug} - ${
          metric.responseTime
        }ms - ${(metric.htmlSize / 1024).toFixed(2)}KB`
      );
    }

    // Test order confirmation pages
    for (const order of this.testData.orders) {
      const metric = await this.fetchPage(
        `/order-confirmation?orderNumber=${order.orderNumber}&email=test@example.com`
      );
      this.metrics.push(metric);
      console.log(
        `${metric.success ? "✅" : "❌"} /order-confirmation?orderNumber=${
          order.orderNumber
        } - ${metric.responseTime}ms - ${(metric.htmlSize / 1024).toFixed(2)}KB`
      );
    }
  }

  private async testAuthenticatedPages(): Promise<void> {
    console.log("🔒 Testing authenticated pages...");

    const authenticatedPages = ["/account", "/orders", "/orders/lookup"];

    for (const page of authenticatedPages) {
      const metric = await this.fetchPage(page);
      this.metrics.push(metric);
      console.log(
        `${metric.success ? "✅" : "❌"} ${page} - ${
          metric.responseTime
        }ms - ${(metric.htmlSize / 1024).toFixed(2)}KB`
      );
    }
  }

  private async testAdminPages(): Promise<void> {
    console.log("👑 Testing admin pages...");

    const adminPages = [
      "/admin",
      "/admin/products",
      "/admin/orders",
      "/admin/users",
    ];

    for (const page of adminPages) {
      const metric = await this.fetchPage(page);
      this.metrics.push(metric);
      console.log(
        `${metric.success ? "✅" : "❌"} ${page} - ${
          metric.responseTime
        }ms - ${(metric.htmlSize / 1024).toFixed(2)}KB`
      );
    }
  }

  private generateSummary(): PageTestResult["summary"] {
    const successfulPages = this.metrics.filter((m) => m.success).length;
    const failedPages = this.metrics.filter((m) => !m.success).length;
    const totalResponseTime = this.metrics.reduce(
      (sum, m) => sum + m.responseTime,
      0
    );
    const totalHtmlSize = this.metrics.reduce((sum, m) => sum + m.htmlSize, 0);

    const slowestPage = this.metrics.reduce((slowest, current) =>
      current.responseTime > slowest.responseTime ? current : slowest
    );

    const fastestPage = this.metrics.reduce((fastest, current) =>
      current.responseTime < fastest.responseTime ? current : fastest
    );

    return {
      totalPages: this.metrics.length,
      successfulPages,
      failedPages,
      successRate: (successfulPages / this.metrics.length) * 100,
      averageResponseTime: totalResponseTime / this.metrics.length,
      totalHtmlSize,
      slowestPage,
      fastestPage,
    };
  }

  private async cleanupTestData(): Promise<void> {
    console.log("🧹 Cleaning up test data...");

    try {
      // Clean up test orders using bulk delete
      if (this.testData.orders.length > 0) {
        const orderIds = this.testData.orders.map((order) => order.id);

        const deleteOrdersResponse = await fetch(
          `${this.baseUrl}/api/admin/orders`,
          {
            method: "DELETE",
            headers: {
              "Content-Type": "application/json",
              ...(this.authToken
                ? { Cookie: `auth-token=${this.authToken}` }
                : {}),
            },
            body: JSON.stringify({ orderIds }),
          }
        );

        if (deleteOrdersResponse.ok) {
          const result = await deleteOrdersResponse.json();
          console.log(`✅ Deleted ${result.data.deletedCount} test orders`);
        } else {
          console.warn(`⚠️ Failed to delete test orders`);
        }
      }

      console.log("✅ Test data cleanup completed");
    } catch (error) {
      console.warn("⚠️ Failed to cleanup some test data:", error);
    }
  }

  private async saveResults(): Promise<void> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const resultsDir = "performance-logs";

    try {
      mkdirSync(resultsDir, { recursive: true });
    } catch (error) {
      // Directory might already exist
    }

    const result: PageTestResult = {
      summary: this.generateSummary(),
      metrics: this.metrics,
    };

    // Save JSON results
    const jsonPath = join(
      resultsDir,
      `page-performance-test-${timestamp}.json`
    );
    writeFileSync(jsonPath, JSON.stringify(result, null, 2));

    // Save human-readable summary
    const summaryPath = join(
      resultsDir,
      `page-performance-summary-${timestamp}.txt`
    );
    const summary = `
Page Performance Test Summary
============================
Test Date: ${new Date().toISOString()}
Total Pages: ${result.summary.totalPages}
Successful: ${result.summary.successfulPages}
Failed: ${result.summary.failedPages}
Success Rate: ${result.summary.successRate.toFixed(2)}%

Performance Metrics:
- Average Response Time: ${result.summary.averageResponseTime.toFixed(2)}ms
- Total HTML Size: ${(result.summary.totalHtmlSize / 1024).toFixed(2)} KB
- Slowest Page: ${result.summary.slowestPage.url} (${
      result.summary.slowestPage.responseTime
    }ms)
- Fastest Page: ${result.summary.fastestPage.url} (${
      result.summary.fastestPage.responseTime
    }ms)

Detailed Results:
${this.metrics
  .map(
    (m) =>
      `${m.method} ${m.url} - ${m.status} - ${m.responseTime}ms - ${(
        m.htmlSize / 1024
      ).toFixed(2)}KB ${m.success ? "✓" : "✗"}`
  )
  .join("\n")}
`;

    writeFileSync(summaryPath, summary);

    console.log(`\nPage performance test results saved to: ${jsonPath}`);
    console.log(`Page performance summary saved to: ${summaryPath}`);
  }

  public async run(): Promise<void> {
    console.log("🚀 Starting comprehensive page performance test...");
    console.log(`🌐 Testing against: ${this.baseUrl}`);

    try {
      await this.initializeAuthentication();
      await this.createTestData();

      await this.testStaticPages();
      await this.testDynamicPages();
      await this.testAuthenticatedPages();
      await this.testAdminPages();

      await this.cleanupTestData();
      await this.saveResults();

      const summary = this.generateSummary();
      console.log(`\n✅ Page performance test completed successfully!`);
      console.log(`📊 Tested ${summary.totalPages} pages`);
      console.log(`✅ ${summary.successfulPages} successful`);
      console.log(`❌ ${summary.failedPages} failed`);
      console.log(`📈 Success rate: ${summary.successRate.toFixed(2)}%`);
      console.log(
        `⏱️ Average response time: ${summary.averageResponseTime.toFixed(2)}ms`
      );
      console.log(
        `📦 Total HTML size: ${(summary.totalHtmlSize / 1024).toFixed(2)} KB`
      );
    } catch (error) {
      console.error("❌ Page performance test failed:", error);
      process.exit(1);
    }
  }
}

// Main execution
async function main() {
  const baseUrl = process.env.API_BASE_URL || "http://localhost:3000";
  const tester = new PagePerformanceTester(baseUrl);
  await tester.run();
}

if (require.main === module) {
  main().catch(console.error);
}

export { PagePerformanceTester };
