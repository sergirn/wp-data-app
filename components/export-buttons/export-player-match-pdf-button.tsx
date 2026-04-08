"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Download } from "lucide-react"

function getFilenameFromDisposition(disposition: string | null) {
  if (!disposition) return null

  const utf8Match = disposition.match(/filename\*=UTF-8''([^;]+)/i)
  if (utf8Match?.[1]) return decodeURIComponent(utf8Match[1])

  const asciiMatch = disposition.match(/filename="([^"]+)"/i)
  if (asciiMatch?.[1]) return asciiMatch[1]

  return null
}

export function ExportPlayerMatchPdfButton({
  playerId,
  matchStatId,
}: {
  playerId: number | string
  matchStatId: number | string
}) {
  const [loading, setLoading] = useState(false)

  const handleDownload = async (e?: React.MouseEvent) => {
    e?.stopPropagation()

    try {
      setLoading(true)

      const response = await fetch(`/api/players/${playerId}/matches/${matchStatId}/export/pdf`, {
        method: "GET",
      })

      if (!response.ok) throw new Error("Failed to download PDF")

      const blob = await response.blob()
      const blobUrl = window.URL.createObjectURL(blob)

      const disposition = response.headers.get("Content-Disposition")
      const filename = getFilenameFromDisposition(disposition) || `player-match-${matchStatId}.pdf`

      const link = document.createElement("a")
      link.href = blobUrl
      link.download = filename
      document.body.appendChild(link)
      link.click()
      link.remove()

      window.URL.revokeObjectURL(blobUrl)
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button
      onClick={handleDownload}
      disabled={loading}
      variant="outline"
      size="sm"
      className="bg-blue-600 text-white hover:bg-blue-700 border-blue-600"
    >
      <Download className="mr-2 h-4 w-4" />
      {loading ? "Descargando..." : "PDF"}
    </Button>
  )
}