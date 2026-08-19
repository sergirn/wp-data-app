import fs from "node:fs"
import path from "node:path"
import ts from "typescript"

const roots = ["app", "components", "hooks", "lib"]
const attributeNames = new Set([
  "alt",
  "aria-label",
  "aria-description",
  "placeholder",
  "title",
  "label",
  "description",
  "desc",
  "cta",
  "lines",
])
const objectPropertyNames = new Set(["label", "title", "description", "message"])
const ignoredPatterns = [
  /^[/#.@]/,
  /^(GET|POST|PUT|PATCH|DELETE)$/,
  /^(use client|server-only)$/,
  /^(sm|md|lg|xl|dark):/,
  /^(primary|secondary|destructive|outline|ghost|default)$/,
  /^(left|right|top|bottom|start|end|horizontal|vertical)$/,
  /^(WaterpoloStats|Waterpolo|TFT|BWMF|&amp;|CN Sant Andreu)$/,
  /^(dark|light)$/,
  /^(long|short|narrow|numeric|2-digit)$/,
  /^LEWaterpolo$/,
  /^(goal|save|out|scored|saved|missed)$/,
  /^(chart|table|match|team|totals|number)$/,
  /^(admin|coach|viewer|all|goals|value|attack|defense|goalkeeper)$/,
  /^[a-z][a-z0-9]*(?:_[a-z0-9]+)+$/,
  /^border-/,
  /^:global\(/,
  /^https?:\/\//,
]

let activeTranslationFunctions = new Set(["t", "common", "pageT"])

function filesIn(directory) {
  if (!fs.existsSync(directory)) return []
  return fs.readdirSync(directory, {withFileTypes: true}).flatMap((entry) => {
    const full = path.join(directory, entry.name)
    return entry.isDirectory() ? filesIn(full) : /\.(?:ts|tsx)$/.test(entry.name) ? [full] : []
  })
}

function normalize(value) {
  return value.replace(/\s+/g, " ").trim()
}

function looksVisible(value) {
  const text = normalize(value)
  return text.length > 1 && /[A-Za-zÁÉÍÓÚÜÑáéíóúüñ¿¡]/.test(text) && !ignoredPatterns.some((pattern) => pattern.test(text))
}

function collectExpressionStrings(node, sourceFile, output) {
  if (ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node) || ts.isJsxFragment(node) || ts.isJsxAttribute(node)) return
  if (
    ts.isCallExpression(node) &&
    ts.isIdentifier(node.expression) &&
    (activeTranslationFunctions.has(node.expression.text) || node.expression.text === "cn")
  ) return
  if (ts.isStringLiteralLike(node) && looksVisible(node.text)) {
    const {line} = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile))
    output.push({line: line + 1, text: normalize(node.text)})
    return
  }
  ts.forEachChild(node, (child) => collectExpressionStrings(child, sourceFile, output))
}

const report = []
for (const file of roots.flatMap(filesIn)) {
  const source = fs.readFileSync(file, "utf8")
  const sourceFile = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, file.endsWith("x") ? ts.ScriptKind.TSX : ts.ScriptKind.TS)
  const entries = []
  activeTranslationFunctions = new Set(["t", "common", "pageT"])
  function findTranslationFunctions(node) {
    if (
      ts.isVariableDeclaration(node) &&
      ts.isIdentifier(node.name) &&
      node.initializer
    ) {
      const initializer = ts.isAwaitExpression(node.initializer) ? node.initializer.expression : node.initializer
      if (
        ts.isCallExpression(initializer) &&
        ts.isIdentifier(initializer.expression) &&
        ["useTranslations", "getTranslations"].includes(initializer.expression.text)
      ) activeTranslationFunctions.add(node.name.text)
    }
    ts.forEachChild(node, findTranslationFunctions)
  }
  findTranslationFunctions(sourceFile)

  function visit(node) {
    if (ts.isJsxText(node) && looksVisible(node.text)) {
      const {line} = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile))
      entries.push({line: line + 1, text: normalize(node.text)})
      return
    } else if (ts.isJsxAttribute(node) && attributeNames.has(node.name.getText(sourceFile))) {
      if (
        node.name.getText(sourceFile) === "label" &&
        node.parent.parent &&
        ts.isJsxSelfClosingElement(node.parent.parent) &&
        node.parent.parent.tagName.getText(sourceFile) === "VisibleStatField"
      ) return
      if (node.initializer && ts.isStringLiteral(node.initializer) && looksVisible(node.initializer.text)) {
        const {line} = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile))
        entries.push({line: line + 1, text: normalize(node.initializer.text)})
      } else if (node.initializer && ts.isJsxExpression(node.initializer) && node.initializer.expression) {
        collectExpressionStrings(node.initializer.expression, sourceFile, entries)
      }
      return
    } else if (ts.isJsxAttribute(node)) {
      return
    } else if (
      ts.isJsxExpression(node) &&
      node.expression &&
      (!ts.isJsxAttribute(node.parent) || attributeNames.has(node.parent.name.getText(sourceFile)))
    ) {
      collectExpressionStrings(node.expression, sourceFile, entries)
      ts.forEachChild(node.expression, visit)
      return
    } else if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && ["alert", "confirm"].includes(node.expression.text)) {
      node.arguments.forEach((argument) => collectExpressionStrings(argument, sourceFile, entries))
    } else if (ts.isPropertyAssignment(node) && objectPropertyNames.has(node.name.getText(sourceFile).replace(/["']/g, ""))) {
      collectExpressionStrings(node.initializer, sourceFile, entries)
    }
    ts.forEachChild(node, visit)
  }

  visit(sourceFile)
  const unique = [...new Map(entries.map((entry) => [`${entry.line}:${entry.text}`, entry])).values()]
  if (unique.length) report.push({file: file.replaceAll("\\", "/"), entries: unique})
}

const total = report.reduce((sum, item) => sum + item.entries.length, 0)
if (process.argv.includes("--summary")) {
  console.log(`Potential user-facing strings: ${total} across ${report.length} files`)
  for (const item of report.sort((a, b) => b.entries.length - a.entries.length)) {
    console.log(`${String(item.entries.length).padStart(4)}  ${item.file}`)
  }
} else {
  console.log(JSON.stringify({total, files: report.length, report}, null, 2))
}
