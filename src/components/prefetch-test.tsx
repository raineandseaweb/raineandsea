import { useRouter } from "next/router";
import { useState } from "react";

export function PrefetchTest() {
  const router = useRouter();
  const [status, setStatus] = useState("Ready to test");

  const testPrefetch = async () => {
    setStatus("Testing prefetch...");
    try {
      await router.prefetch("/products");
      setStatus("Prefetch successful!");
    } catch (error) {
      setStatus(`Prefetch failed: ${error}`);
    }
  };

  return (
    <div className="fixed bottom-4 right-4 bg-card p-4 rounded-lg shadow-lg border z-50">
      <h3 className="font-semibold mb-2">Prefetch Test</h3>
      <p className="text-sm text-muted-foreground mb-2">{status}</p>
      <button
        onClick={testPrefetch}
        className="px-3 py-1 bg-blue-500 text-primary-foreground rounded text-sm hover:bg-primary"
      >
        Test Prefetch
      </button>
    </div>
  );
}
