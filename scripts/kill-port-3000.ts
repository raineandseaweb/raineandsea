import { execSync } from "child_process";

function killPort3000() {
  try {
    // Find processes listening on port 3000
    const output = execSync("netstat -ano | findstr :3000").toString();
    const lines = output.split("\n");

    const pids = new Set<string>();

    lines.forEach((line) => {
      const parts = line.trim().split(/\s+/);
      if (parts.length >= 5) {
        const pid = parts[4];
        if (pid && !isNaN(Number(pid))) {
          pids.add(pid);
        }
      }
    });

    if (pids.size === 0) {
      console.log("No processes found on port 3000");
      return;
    }

    console.log(
      `Found ${pids.size} processes on port 3000: ${Array.from(pids).join(
        ", "
      )}`
    );

    // Kill each PID
    for (const pid of pids) {
      try {
        execSync(`taskkill /PID ${pid} /F`);
        console.log(`Successfully killed process ${pid}`);
      } catch (killError) {
        console.error(`Failed to kill process ${pid}:`, killError);
      }
    }
  } catch (error) {
    console.error("Error finding/killing processes:", error);
  }
}

killPort3000();
