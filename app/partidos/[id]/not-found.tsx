import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft } from "lucide-react"
import { useTranslations } from "next-intl"

export default function NotFound() {
  const t = useTranslations("Matches")
  return (
    <main className="container mx-auto px-4 py-8 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>{t("notFoundTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">{t("notFoundDescription")}</p>
          <Button asChild>
            <Link href="/partidos">
              <ArrowLeft className="mr-2 h-4 w-4" />
              {t("backToMatches")}
            </Link>
          </Button>
        </CardContent>
      </Card>
    </main>
  )
}
