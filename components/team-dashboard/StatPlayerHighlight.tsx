import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

interface StatPlayerHighlightProps {
  label: string
  player: any // puede tipar con Player & stats
  statValue: string | number
}

export function StatPlayerHighlight({ label, player, statValue }: StatPlayerHighlightProps) {
  return (
    <Card className="border">
      <CardHeader>
        <CardTitle>{label}</CardTitle>
        <CardDescription>Jugador más destacado</CardDescription>
      </CardHeader>
      <CardContent className="flex items-center gap-4">
        <Avatar className="h-12 w-12">
          <AvatarFallback>{player.photo_url}</AvatarFallback>
        </Avatar>
        <div className="flex flex-col">
          <p className="font-semibold">{player.name}</p>
          <p className="text-sm text-muted-foreground">{statValue}</p>
        </div>
      </CardContent>
    </Card>
  )
}
