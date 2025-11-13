import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft } from "lucide-react"

export default function NotFound() {
  return (
    <main className="container mx-auto px-4 py-8 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>Jugador No Encontrado</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">El jugador que estás buscando no existe o ha sido eliminado.</p>
          <Button asChild>
            <Link href="/jugadores">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Volver a Jugadores
            </Link>
          </Button>
        </CardContent>
      </Card>
    </main>
  )
}
