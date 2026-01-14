#!/usr/bin/env node

/**
 * Build script for Shelf browser extension
 * Replaces localhost URLs with production URL in extension files
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const EXTENSION_DIR = path.join(__dirname, "..", "extension");
const CONFIG_FILE = path.join(EXTENSION_DIR, "config.js");

// Read config to get production URL
let PROD_URL = "https://your-app.vercel.app";
let ENV = "dev";

if (fs.existsSync(CONFIG_FILE)) {
  const configContent = fs.readFileSync(CONFIG_FILE, "utf8");
  // Match PROD_URL only on non-comment lines (not starting with //)
  const prodUrlMatch = configContent.match(/^[^/]*const PROD_URL = ["']([^"']+)["']/m);
  const envMatch = configContent.match(/^[^/]*const ENV = ["']([^"']+)["']/m);
  
  if (prodUrlMatch) PROD_URL = prodUrlMatch[1];
  if (envMatch) ENV = envMatch[1];
}

// Get production URL from command line or use config
const args = process.argv.slice(2);
const urlArg = args.find(arg => arg.startsWith("--url="));
if (urlArg) {
  PROD_URL = urlArg.split("=")[1];
}

const DEV_URL = "http://localhost:3000";
const SHELF_URL = ENV === "prod" ? PROD_URL : DEV_URL;

console.log(`Building extension with URL: ${SHELF_URL}`);

// Files to update
const filesToUpdate = [
  "background.js",
  "popup.js",
  "content.js",
  "manifest.json",
];

// Update each file
filesToUpdate.forEach((filename) => {
  const filePath = path.join(EXTENSION_DIR, filename);
  
  if (!fs.existsSync(filePath)) {
    console.warn(`Warning: ${filename} not found, skipping`);
    return;
  }

  let content = fs.readFileSync(filePath, "utf8");
  let updated = false;

  // Replace localhost URLs with production URL
  if (content.includes(DEV_URL)) {
    content = content.replace(new RegExp(DEV_URL.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"), SHELF_URL);
    updated = true;
  }

  // Also replace any existing production URLs (from previous builds)
  // Match common Vercel URL patterns - but only if they're different from target URL
  const vercelUrlPattern = /https:\/\/[a-zA-Z0-9-]+\.vercel\.app/g;
  const matches = content.match(vercelUrlPattern);
  if (matches && matches.some(url => url !== SHELF_URL)) {
    content = content.replace(vercelUrlPattern, SHELF_URL);
    updated = true;
  }

  // Update manifest.json host_permissions and matches
  if (filename === "manifest.json") {
    const manifest = JSON.parse(content);
    
    // Update host_permissions
    if (manifest.host_permissions) {
      manifest.host_permissions = manifest.host_permissions.map((perm) => {
        if (perm.includes("localhost:3000")) {
          return perm.replace("http://localhost:3000/*", `${SHELF_URL}/*`);
        }
        if (perm.includes("*.vercel.app")) {
          // Keep vercel.app if it's a wildcard, or replace with specific domain
          const domain = new URL(SHELF_URL).hostname;
          return perm.replace("https://*.vercel.app/*", `${SHELF_URL}/*`);
        }
        return perm;
      });
    }

    // Update content_scripts matches
    if (manifest.content_scripts) {
      manifest.content_scripts.forEach((script) => {
        if (script.matches) {
          script.matches = script.matches.map((match) => {
            if (match.includes("localhost:3000")) {
              return match.replace("http://localhost:3000/*", `${SHELF_URL}/*`);
            }
            if (match.includes("*.vercel.app")) {
              const domain = new URL(SHELF_URL).hostname;
              return match.replace("https://*.vercel.app/*", `${SHELF_URL}/*`);
            }
            return match;
          });
        }
      });
    }

    // Update web_accessible_resources matches
    if (manifest.web_accessible_resources) {
      manifest.web_accessible_resources.forEach((resource) => {
        if (resource.matches) {
          resource.matches = resource.matches.map((match) => {
            if (match.includes("localhost:3000")) {
              return match.replace("http://localhost:3000/*", `${SHELF_URL}/*`);
            }
            if (match.includes("*.vercel.app")) {
              const domain = new URL(SHELF_URL).hostname;
              return match.replace("https://*.vercel.app/*", `${SHELF_URL}/*`);
            }
            return match;
          });
        }
      });
    }

    content = JSON.stringify(manifest, null, 2);
    updated = true;
  }

  if (updated) {
    fs.writeFileSync(filePath, content, "utf8");
    console.log(`✓ Updated ${filename}`);
  } else {
    console.log(`- ${filename} (no changes needed)`);
  }
});

console.log("\nExtension build complete!");
console.log(`\nNext steps:`);
console.log(`1. Test the extension in your browser`);
console.log(`2. Run 'npm run package:extension' to create a zip file`);
console.log(`3. Submit to browser stores (see extension/DISTRIBUTION.md)`);
