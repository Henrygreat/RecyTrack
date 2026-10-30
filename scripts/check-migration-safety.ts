/**
 * Migration Safety Check
 *
 * This script analyzes pending Prisma migrations for common issues
 * that could cause production failures.
 *
 * Run before deploying migrations:
 *   npx ts-node scripts/check-migration-safety.ts
 *
 * Or add to CI/CD pipeline:
 *   npm run check:migrations
 */

import * as fs from "fs";
import * as path from "path";

interface Issue {
  severity: "ERROR" | "WARNING" | "INFO";
  file: string;
  line?: number;
  message: string;
  fix?: string;
}

const MIGRATIONS_DIR = path.join(__dirname, "..", "prisma", "migrations");

function findMigrationFiles(): string[] {
  const files: string[] = [];
  const dirs = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter(
      (d) =>
        fs.statSync(path.join(MIGRATIONS_DIR, d)).isDirectory() &&
        d !== "_journal"
    );

  for (const dir of dirs) {
    const sqlPath = path.join(MIGRATIONS_DIR, dir, "migration.sql");
    if (fs.existsSync(sqlPath)) {
      files.push(sqlPath);
    }
  }
  return files;
}

function checkMigrationFile(filePath: string): Issue[] {
  const issues: Issue[] = [];
  const content = fs.readFileSync(filePath, "utf-8");
  const lines = content.split("\n");
  const fileName = path.basename(path.dirname(filePath));

  // Check 1: Composite FK with SET NULL
  const setNullFkRegex =
    /FOREIGN KEY\s*\([^)]+,\s*"organizationId"\s*\)[^;]*ON DELETE SET NULL/gi;
  let match;
  while ((match = setNullFkRegex.exec(content)) !== null) {
    const lineNum = content.substring(0, match.index).split("\n").length;
    issues.push({
      severity: "ERROR",
      file: fileName,
      line: lineNum,
      message:
        "Composite FK with required organizationId uses ON DELETE SET NULL",
      fix: "Change to ON DELETE RESTRICT or ON DELETE CASCADE",
    });
  }

  // Check 2: FK referencing composite key without unique index creation first
  const compositeFkRegex =
    /REFERENCES\s+"(\w+)"\s*\(\s*"id"\s*,\s*"organizationId"\s*\)/gi;
  while ((match = compositeFkRegex.exec(content)) !== null) {
    const tableName = match[1];
    const fkPosition = match.index;

    // Check if unique index is created before this FK
    const uniqueIndexRegex = new RegExp(
      `CREATE\\s+UNIQUE\\s+INDEX[^;]*"${tableName}_id_organizationId_key"`,
      "gi"
    );
    const indexMatch = uniqueIndexRegex.exec(content);

    if (!indexMatch || indexMatch.index > fkPosition) {
      const lineNum = content.substring(0, fkPosition).split("\n").length;
      issues.push({
        severity: "ERROR",
        file: fileName,
        line: lineNum,
        message: `FK references ${tableName}(id, organizationId) but unique index not created before this point`,
        fix: `Add CREATE UNIQUE INDEX "${tableName}_id_organizationId_key" ON "${tableName}"("id", "organizationId") before this FK`,
      });
    }
  }

  // Check 3: Missing IF NOT EXISTS on CREATE TABLE
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (
      /CREATE\s+TABLE\s+(?!IF\s+NOT\s+EXISTS)/i.test(line) &&
      !line.includes("_prisma_migrations")
    ) {
      issues.push({
        severity: "WARNING",
        file: fileName,
        line: i + 1,
        message: "CREATE TABLE without IF NOT EXISTS",
        fix: "Add IF NOT EXISTS for idempotent migrations",
      });
    }
  }

  // Check 4: Missing IF NOT EXISTS on CREATE INDEX
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (
      /CREATE\s+(UNIQUE\s+)?INDEX\s+(?!IF\s+NOT\s+EXISTS)/i.test(line) &&
      !line.includes("--")
    ) {
      issues.push({
        severity: "WARNING",
        file: fileName,
        line: i + 1,
        message: "CREATE INDEX without IF NOT EXISTS",
        fix: "Add IF NOT EXISTS for idempotent migrations",
      });
    }
  }

  // Check 5: ALTER TABLE ADD CONSTRAINT without existence check
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/ALTER\s+TABLE[^;]+ADD\s+CONSTRAINT/i.test(line)) {
      // Check if this is inside a DO block with existence check
      const contextStart = Math.max(0, i - 10);
      const context = lines.slice(contextStart, i + 1).join("\n");
      if (!/IF NOT EXISTS|pg_constraint/i.test(context)) {
        issues.push({
          severity: "WARNING",
          file: fileName,
          line: i + 1,
          message: "ADD CONSTRAINT without existence check",
          fix: "Wrap in DO block with pg_constraint check",
        });
      }
    }
  }

  // Check 6: DROP commands (potential data loss)
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/DROP\s+(TABLE|COLUMN|INDEX|CONSTRAINT)/i.test(line)) {
      issues.push({
        severity: "WARNING",
        file: fileName,
        line: i + 1,
        message: `DROP statement detected - verify this won't cause data loss`,
      });
    }
  }

  // Check 7: NOT NULL column without default
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/ADD\s+COLUMN[^;]+NOT\s+NULL(?![^;]*DEFAULT)/i.test(line)) {
      issues.push({
        severity: "ERROR",
        file: fileName,
        line: i + 1,
        message: "Adding NOT NULL column without DEFAULT",
        fix: "Add DEFAULT value or make column nullable",
      });
    }
  }

  return issues;
}

function checkPrismaSchema(): Issue[] {
  const issues: Issue[] = [];
  const schemaPath = path.join(__dirname, "..", "prisma", "schema.prisma");

  if (!fs.existsSync(schemaPath)) {
    issues.push({
      severity: "ERROR",
      file: "schema.prisma",
      message: "Prisma schema file not found",
    });
    return issues;
  }

  const content = fs.readFileSync(schemaPath, "utf-8");
  const lines = content.split("\n");

  // Check for composite relations without @@unique
  const modelBlocks = content.split(/(?=model\s+\w+)/);

  for (const block of modelBlocks) {
    const modelMatch = block.match(/model\s+(\w+)/);
    if (!modelMatch) continue;

    const modelName = modelMatch[1];

    // Check if model has organizationId
    if (!block.includes("organizationId")) continue;

    // Check if model is referenced by composite FK elsewhere
    const compositeRefRegex = new RegExp(
      `@relation\\([^)]*references:\\s*\\[id,\\s*organizationId\\]`,
      "g"
    );
    if (content.match(compositeRefRegex)) {
      // Check if this model has @@unique([id, organizationId])
      if (!block.includes("@@unique([id, organizationId])")) {
        // Check if it's a model that needs the unique constraint
        const isReferenced = content.includes(
          `references: [id, organizationId]`
        );
        if (isReferenced) {
          issues.push({
            severity: "WARNING",
            file: "schema.prisma",
            message: `Model ${modelName} may need @@unique([id, organizationId]) for composite FK references`,
          });
        }
      }
    }
  }

  // Check for composite FK relations without onDelete
  const relationRegex =
    /@relation\(fields:\s*\[\w+,\s*organizationId\][^)]*references:\s*\[\w+,\s*organizationId\](?![^)]*onDelete)/g;
  let match;
  let lineNum = 0;
  for (let i = 0; i < lines.length; i++) {
    if (relationRegex.test(lines[i])) {
      issues.push({
        severity: "WARNING",
        file: "schema.prisma",
        line: i + 1,
        message:
          "Composite FK relation without explicit onDelete - defaults may cause issues",
        fix: "Add onDelete: Restrict for composite FKs with required organizationId",
      });
    }
  }

  return issues;
}

function main() {
  console.log("========================================");
  console.log("MIGRATION SAFETY CHECK");
  console.log("========================================\n");

  let allIssues: Issue[] = [];

  // Check Prisma schema
  console.log("Checking Prisma schema...");
  const schemaIssues = checkPrismaSchema();
  allIssues = allIssues.concat(schemaIssues);

  // Check all migration files
  console.log("Checking migration files...\n");
  const migrationFiles = findMigrationFiles();

  for (const file of migrationFiles) {
    const issues = checkMigrationFile(file);
    allIssues = allIssues.concat(issues);
  }

  // Report results
  const errors = allIssues.filter((i) => i.severity === "ERROR");
  const warnings = allIssues.filter((i) => i.severity === "WARNING");

  if (allIssues.length === 0) {
    console.log("✓ No issues found\n");
  } else {
    for (const issue of allIssues) {
      const icon =
        issue.severity === "ERROR"
          ? "✗"
          : issue.severity === "WARNING"
            ? "⚠"
            : "ℹ";
      const lineInfo = issue.line ? `:${issue.line}` : "";
      console.log(`${icon} [${issue.severity}] ${issue.file}${lineInfo}`);
      console.log(`  ${issue.message}`);
      if (issue.fix) {
        console.log(`  Fix: ${issue.fix}`);
      }
      console.log();
    }
  }

  console.log("========================================");
  console.log(`ERRORS: ${errors.length}  WARNINGS: ${warnings.length}`);
  console.log("========================================\n");

  // Exit with error code if there are errors
  if (errors.length > 0) {
    console.log(
      "✗ Migration safety check FAILED - fix errors before deploying\n"
    );
    process.exit(1);
  } else if (warnings.length > 0) {
    console.log("⚠ Migration safety check passed with warnings\n");
  } else {
    console.log("✓ Migration safety check PASSED\n");
  }
}

main();
