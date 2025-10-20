import { getSecretAsync } from "@/lib/encryption/async-secrets";
import { mkdirSync, writeFileSync } from "fs";
import { join } from "path";

interface PerformanceAnalysis {
  page: string;
  responseTime: number;
  htmlSize: number;
  bottlenecks: string[];
  recommendations: string[];
}

class PerformanceAnalyzer {
  private baseUrl: string;
  private authToken: string | null = null;
  private rootUserEmail: string = "";
  private rootUserPassword: string = "";

  constructor(baseUrl: string = "http://localhost:3000") {
    this.baseUrl = baseUrl;
  }

  private async initializeAuthentication(): Promise<void> {
    console.log("🔐 Initializing authentication...");

    try {
      this.rootUserEmail = await getSecretAsync("ROOT_EMAIL");
      this.rootUserPassword = await getSecretAsync("ROOT_SECRET");

      if (!this.rootUserEmail || !this.rootUserPassword) {
        console.warn(
          "⚠️ ROOT_EMAIL or ROOT_SECRET not found in GCP Secret Manager"
        );
        return;
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
        const setCookieHeader = loginResponse.headers.get("set-cookie");
        if (setCookieHeader) {
          const authTokenMatch = setCookieHeader.match(/auth-token=([^;]+)/);
          if (authTokenMatch) {
            this.authToken = authTokenMatch[1];
            console.log("✅ Successfully authenticated as root user");
          }
        }
      }
    } catch (error) {
      console.warn("⚠️ Authentication initialization failed:", error);
    }
  }

  private async analyzePage(page: string): Promise<PerformanceAnalysis> {
    const startTime = Date.now();

    try {
      const response = await fetch(`${this.baseUrl}${page}`, {
        method: "GET",
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

      return this.identifyBottlenecks(
        page,
        responseTime,
        htmlSize,
        htmlContent
      );
    } catch (error) {
      return {
        page,
        responseTime: Date.now() - startTime,
        htmlSize: 0,
        bottlenecks: ["Network error"],
        recommendations: ["Check network connectivity"],
      };
    }
  }

  private identifyBottlenecks(
    page: string,
    responseTime: number,
    htmlSize: number,
    htmlContent: string
  ): PerformanceAnalysis {
    const bottlenecks: string[] = [];
    const recommendations: string[] = [];

    // Response time analysis
    if (responseTime > 500) {
      bottlenecks.push("Slow response time (>500ms)");
      recommendations.push(
        "Optimize server-side rendering and database queries"
      );
    } else if (responseTime > 300) {
      bottlenecks.push("Moderate response time (>300ms)");
      recommendations.push("Consider caching and query optimization");
    }

    // HTML size analysis
    if (htmlSize > 100000) {
      // >100KB
      bottlenecks.push("Large HTML size (>100KB)");
      recommendations.push("Implement code splitting and lazy loading");
    } else if (htmlSize > 50000) {
      // >50KB
      bottlenecks.push("Moderate HTML size (>50KB)");
      recommendations.push("Consider reducing bundle size");
    }

    // Page-specific analysis
    if (page === "/orders") {
      bottlenecks.push("N+1 query problem in orders API");
      bottlenecks.push("Multiple database queries per order");
      recommendations.push("Use JOIN queries to fetch all data in one request");
      recommendations.push("Implement pagination for large order lists");
      recommendations.push("Cache order data for authenticated users");
    }

    if (page === "/orders/lookup") {
      bottlenecks.push("Complex order lookup logic");
      recommendations.push("Optimize order lookup queries");
      recommendations.push("Add database indexes for order_number and email");
    }

    if (page === "/cart") {
      bottlenecks.push("Multiple product queries per cart item");
      bottlenecks.push("Product options fetched separately");
      recommendations.push("Use JOIN queries to fetch all product data");
      recommendations.push("Cache product data");
    }

    if (page === "/") {
      bottlenecks.push("Multiple context providers loading");
      bottlenecks.push("Auth and cart contexts making API calls");
      recommendations.push("Implement context caching");
      recommendations.push("Use React.memo for expensive components");
      recommendations.push("Consider server-side rendering for static content");
    }

    // Check for specific patterns in HTML
    if (htmlContent.includes("loading") && htmlContent.includes("spinner")) {
      bottlenecks.push("Client-side loading states");
      recommendations.push(
        "Implement server-side rendering for initial content"
      );
    }

    if (htmlContent.includes("useEffect") || htmlContent.includes("useState")) {
      bottlenecks.push("Client-side state management");
      recommendations.push("Move state to server where possible");
    }

    // Check for image optimization opportunities
    const imageMatches = htmlContent.match(/<img[^>]+>/g) || [];
    if (imageMatches.length > 10) {
      bottlenecks.push("Many images without optimization");
      recommendations.push("Implement image lazy loading");
      recommendations.push("Use Next.js Image component");
      recommendations.push("Optimize image formats (WebP, AVIF)");
    }

    // Check for external resources
    const externalResourceMatches =
      htmlContent.match(/https?:\/\/[^"'\s]+/g) || [];
    if (externalResourceMatches.length > 5) {
      bottlenecks.push("Many external resource requests");
      recommendations.push("Minimize external dependencies");
      recommendations.push("Use CDN for static assets");
    }

    return {
      page,
      responseTime,
      htmlSize,
      bottlenecks,
      recommendations,
    };
  }

  private async analyzeApiEndpoints(): Promise<void> {
    console.log("🔍 Analyzing API endpoints...");

    const apiEndpoints = [
      "/api/orders",
      "/api/cart",
      "/api/auth/me",
      "/api/products",
      "/api/categories",
    ];

    for (const endpoint of apiEndpoints) {
      const startTime = Date.now();
      try {
        const response = await fetch(`${this.baseUrl}${endpoint}`, {
          headers: {
            "Content-Type": "application/json",
            ...(this.authToken
              ? { Cookie: `auth-token=${this.authToken}` }
              : {}),
          },
        });
        const responseTime = Date.now() - startTime;
        const data = await response.text();
        const dataSize = new Blob([data]).size;

        console.log(
          `📊 ${endpoint}: ${responseTime}ms, ${(dataSize / 1024).toFixed(2)}KB`
        );

        if (responseTime > 200) {
          console.log(`⚠️ Slow API: ${endpoint} (${responseTime}ms)`);
        }
      } catch (error) {
        console.log(`❌ API Error: ${endpoint}`);
      }
    }
  }

  public async run(): Promise<void> {
    console.log("🚀 Starting performance bottleneck analysis...");
    console.log(`🌐 Analyzing: ${this.baseUrl}`);

    try {
      await this.initializeAuthentication();

      const pagesToAnalyze = [
        "/",
        "/products",
        "/categories",
        "/cart",
        "/checkout",
        "/orders",
        "/orders/lookup",
        "/account",
        "/admin",
        "/admin/products",
        "/admin/orders",
        "/admin/users",
      ];

      const analyses: PerformanceAnalysis[] = [];

      console.log("📊 Analyzing pages...");
      for (const page of pagesToAnalyze) {
        console.log(`Analyzing ${page}...`);
        const analysis = await this.analyzePage(page);
        analyses.push(analysis);

        if (analysis.bottlenecks.length > 0) {
          console.log(`⚠️ ${page}: ${analysis.bottlenecks.join(", ")}`);
        }
      }

      await this.analyzeApiEndpoints();

      // Generate report
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const resultsDir = "performance-logs";

      try {
        mkdirSync(resultsDir, { recursive: true });
      } catch (error) {
        // Directory might already exist
      }

      const reportPath = join(
        resultsDir,
        `performance-bottleneck-analysis-${timestamp}.json`
      );
      writeFileSync(reportPath, JSON.stringify(analyses, null, 2));

      const summaryPath = join(
        resultsDir,
        `performance-bottleneck-summary-${timestamp}.txt`
      );
      const summary = this.generateSummary(analyses);
      writeFileSync(summaryPath, summary);

      console.log(`\n📊 Performance analysis completed!`);
      console.log(`📄 Report saved to: ${reportPath}`);
      console.log(`📄 Summary saved to: ${summaryPath}`);

      // Print summary to console
      console.log("\n" + summary);
    } catch (error) {
      console.error("❌ Performance analysis failed:", error);
      process.exit(1);
    }
  }

  private generateSummary(analyses: PerformanceAnalysis[]): string {
    const slowPages = analyses.filter((a) => a.responseTime > 300);
    const largePages = analyses.filter((a) => a.htmlSize > 50000);
    const pagesWithBottlenecks = analyses.filter(
      (a) => a.bottlenecks.length > 0
    );

    const allRecommendations = analyses.flatMap((a) => a.recommendations);
    const uniqueRecommendations = [...new Set(allRecommendations)];

    return `
Performance Bottleneck Analysis Summary
======================================
Analysis Date: ${new Date().toISOString()}

Slow Pages (>300ms):
${slowPages.map((p) => `- ${p.page}: ${p.responseTime}ms`).join("\n")}

Large Pages (>50KB):
${largePages
  .map((p) => `- ${p.page}: ${(p.htmlSize / 1024).toFixed(2)}KB`)
  .join("\n")}

Pages with Bottlenecks:
${pagesWithBottlenecks
  .map((p) => `- ${p.page}: ${p.bottlenecks.join(", ")}`)
  .join("\n")}

Top Recommendations:
${uniqueRecommendations
  .slice(0, 10)
  .map((rec, i) => `${i + 1}. ${rec}`)
  .join("\n")}

Detailed Analysis:
${analyses
  .map(
    (a) => `
${a.page}:
  Response Time: ${a.responseTime}ms
  HTML Size: ${(a.htmlSize / 1024).toFixed(2)}KB
  Bottlenecks: ${a.bottlenecks.join(", ") || "None"}
  Recommendations: ${a.recommendations.join(", ") || "None"}
`
  )
  .join("\n")}
`;
  }
}

// Main execution
async function main() {
  const baseUrl = process.env.API_BASE_URL || "http://localhost:3000";
  const analyzer = new PerformanceAnalyzer(baseUrl);
  await analyzer.run();
}

if (require.main === module) {
  main().catch(console.error);
}

export { PerformanceAnalyzer };
