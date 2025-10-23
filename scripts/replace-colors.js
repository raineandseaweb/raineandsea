#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const glob = require("glob");

// Load color mappings
const colorMappings = require("../color-replacements.json");

// Get all files to process
const includeExtensions = colorMappings.includeExtensions;
const excludeFiles = colorMappings.excludeFiles;

// Create glob patterns for included files
const globPatterns = includeExtensions.map((ext) => `**/*${ext}`);

// Get all files matching the patterns
let allFiles = [];
globPatterns.forEach((pattern) => {
  const files = glob.sync(pattern, {
    ignore: excludeFiles,
    cwd: process.cwd(),
  });
  allFiles = allFiles.concat(files);
});

// Remove duplicates
allFiles = [...new Set(allFiles)];

console.log(`Found ${allFiles.length} files to process`);

// Flatten all color mappings into a single object
const allMappings = {};
Object.values(colorMappings.colorMappings).forEach((category) => {
  Object.assign(allMappings, category);
});

console.log(`Found ${Object.keys(allMappings).length} color mappings to apply`);

let totalReplacements = 0;
let filesModified = 0;

// Process each file
allFiles.forEach((filePath) => {
  try {
    const fullPath = path.resolve(filePath);

    // Check if file exists
    if (!fs.existsSync(fullPath)) {
      console.log(`Skipping non-existent file: ${filePath}`);
      return;
    }

    let content = fs.readFileSync(fullPath, "utf8");
    let fileReplacements = 0;
    let originalContent = content;

    // Apply all color replacements
    Object.entries(allMappings).forEach(([oldColor, newColor]) => {
      // Use word boundaries to ensure we only replace exact matches
      const regex = new RegExp(
        `\\b${oldColor.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`,
        "g"
      );
      const matches = content.match(regex);

      if (matches) {
        content = content.replace(regex, newColor);
        fileReplacements += matches.length;
        totalReplacements += matches.length;
      }
    });

    // Write file if changes were made
    if (content !== originalContent) {
      fs.writeFileSync(fullPath, content, "utf8");
      filesModified++;
      console.log(`✅ ${filePath}: ${fileReplacements} replacements`);
    }
  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error.message);
  }
});

console.log(`\n🎨 Color replacement complete!`);
console.log(`📁 Files processed: ${allFiles.length}`);
console.log(`📝 Files modified: ${filesModified}`);
console.log(`🔄 Total replacements: ${totalReplacements}`);

if (totalReplacements > 0) {
  console.log(
    `\n✨ All hardcoded colors have been replaced with theme variables!`
  );
  console.log(`🚀 Restart your dev server to see the changes.`);
}
