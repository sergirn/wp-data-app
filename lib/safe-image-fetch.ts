import "server-only"

import { lookup } from "node:dns/promises"
import { isIP } from "node:net"

const MAX_IMAGE_BYTES = 5 * 1024 * 1024
const MAX_REDIRECTS = 3

function isPrivateAddress(address: string) {
  const normalized = address.toLowerCase()
  if (isIP(normalized) === 4) {
    const [a, b] = normalized.split(".").map(Number)
    return a === 0 || a === 10 || a === 127 ||
      (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) || a >= 224
  }
  return normalized === "::" || normalized === "::1" ||
    normalized.startsWith("fc") || normalized.startsWith("fd") ||
    /^(fe8|fe9|fea|feb)/.test(normalized) ||
    normalized.startsWith("::ffff:127.") || normalized.startsWith("::ffff:10.") ||
    normalized.startsWith("::ffff:192.168.")
}

async function assertPublicHttpsUrl(value: string) {
  const url = new URL(value)
  if (url.protocol !== "https:") throw new Error("Only HTTPS images are allowed")
  if (url.username || url.password) throw new Error("Credentials in image URLs are not allowed")
  if (url.hostname === "localhost" || url.hostname.endsWith(".local")) {
    throw new Error("Local image hosts are not allowed")
  }
  const addresses = await lookup(url.hostname, { all: true })
  if (addresses.length === 0 || addresses.some(({ address }) => isPrivateAddress(address))) {
    throw new Error("Private image hosts are not allowed")
  }
  return url
}

export async function fetchRemoteImage(value: string) {
  let url = await assertPublicHttpsUrl(value)
  for (let redirectCount = 0; redirectCount <= MAX_REDIRECTS; redirectCount += 1) {
    const response = await fetch(url, {
      redirect: "manual",
      signal: AbortSignal.timeout(5_000),
      headers: { Accept: "image/png,image/jpeg" },
    })
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location")
      if (!location || redirectCount === MAX_REDIRECTS) throw new Error("Invalid image redirect")
      url = await assertPublicHttpsUrl(new URL(location, url).toString())
      continue
    }
    if (!response.ok || !response.body) throw new Error("Image request failed")
    const contentType = response.headers.get("content-type")?.split(";", 1)[0].toLowerCase() ?? ""
    if (contentType !== "image/png" && contentType !== "image/jpeg") throw new Error("Unsupported image type")
    const declaredLength = Number(response.headers.get("content-length") ?? 0)
    if (declaredLength > MAX_IMAGE_BYTES) throw new Error("Image is too large")

    const reader = response.body.getReader()
    const chunks: Uint8Array[] = []
    let size = 0
    while (true) {
      const { done, value: chunk } = await reader.read()
      if (done) break
      size += chunk.byteLength
      if (size > MAX_IMAGE_BYTES) {
        await reader.cancel()
        throw new Error("Image is too large")
      }
      chunks.push(chunk)
    }
    const bytes = new Uint8Array(size)
    let offset = 0
    for (const chunk of chunks) {
      bytes.set(chunk, offset)
      offset += chunk.byteLength
    }
    return { bytes, contentType }
  }
  throw new Error("Too many image redirects")
}
