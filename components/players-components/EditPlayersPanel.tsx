"use client"

import { useEffect, useMemo, useState } from "react"
import { useTranslations } from "next-intl"
import { Eye, EyeOff, Loader2, Plus, Search, Trash2, UserRound } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { Player } from "@/lib/types"
import { createClient } from "@/lib/supabase/client"

type Props = {
  players: Player[]
  clubId?: number | null
  onSaved?: () => void
}

type Draft = {
  id: number
  number: string
  name: string
  isGoalkeeper: boolean
  isActive: boolean
  isNew: boolean
}

function createDraft(player: Player): Draft {
  return {
    id: player.id,
    number: String(player.number ?? ""),
    name: player.name ?? "",
    isGoalkeeper: player.is_goalkeeper,
    isActive: player.is_active !== false,
    isNew: false,
  }
}

export function EditPlayersPanel({ players, clubId, onSaved }: Props) {
  const t = useTranslations("EditPlayers")
  const supabase = createClient()

  const [saving, setSaving] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [drafts, setDrafts] = useState<Record<number, Draft>>({})
  const [search, setSearch] = useState("")
  const [nextTemporaryId, setNextTemporaryId] = useState(-1)

  useEffect(() => {
    // Reset the editable form whenever the roster is refreshed after saving.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDrafts(Object.fromEntries(players.map((player) => [player.id, createDraft(player)])))
    setSearch("")
    setErrorMsg(null)
    setNextTemporaryId(-1)
  }, [players])

  const resetDrafts = () => {
    setDrafts(Object.fromEntries(players.map((player) => [player.id, createDraft(player)])))
    setSearch("")
    setErrorMsg(null)
    setNextTemporaryId(-1)
  }

  const sortedDrafts = useMemo(
    () =>
      Object.values(drafts).sort((a, b) => {
        if (a.isActive !== b.isActive) return a.isActive ? -1 : 1
        return (Number(a.number) || 0) - (Number(b.number) || 0)
      }),
    [drafts],
  )

  const visibleDrafts = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase()
    if (!normalizedSearch) return sortedDrafts

    return sortedDrafts.filter(
      (draft) => draft.name.toLocaleLowerCase().includes(normalizedSearch) || draft.number.includes(normalizedSearch),
    )
  }, [search, sortedDrafts])

  const activeCount = sortedDrafts.filter((draft) => draft.isActive).length
  const inactiveCount = sortedDrafts.length - activeCount

  const updateDraft = (id: number, patch: Partial<Draft>) => {
    setDrafts((current) => ({
      ...current,
      [id]: { ...current[id], ...patch },
    }))
  }

  const addPlayer = () => {
    const id = nextTemporaryId
    setNextTemporaryId((current) => current - 1)
    setDrafts((current) => ({
      ...current,
      [id]: {
        id,
        number: "",
        name: "",
        isGoalkeeper: false,
        isActive: true,
        isNew: true,
      },
    }))
    setSearch("")
  }

  const removeNewPlayer = (id: number) => {
    setDrafts((current) => {
      const next = { ...current }
      delete next[id]
      return next
    })
  }

  const validate = () => {
    if (!clubId) return t("clubRequired")

    for (const draft of sortedDrafts) {
      const number = Number.parseInt(draft.number, 10)
      if (!draft.name.trim()) return t("nameRequired")
      if (!Number.isFinite(number) || Number.isNaN(number) || number < 0) return t("invalidNumber")
    }

    const playerNumbers = new Set<number>()
    for (const draft of sortedDrafts) {
      const number = Number.parseInt(draft.number, 10)
      if (playerNumbers.has(number)) return t("duplicateNumber")
      playerNumbers.add(number)
    }

    return null
  }

  const handleSave = async () => {
    setErrorMsg(null)

    const validationError = validate()
    if (validationError) {
      setErrorMsg(validationError)
      return
    }
    if (!clubId) return

    setSaving(true)
    try {
      const existingById = new Map(players.map((player) => [player.id, player]))
      const changedDrafts = sortedDrafts.filter((draft) => {
        if (draft.isNew) return true

        const original = existingById.get(draft.id)
        if (!original) return false

        return (
          Number.parseInt(draft.number, 10) !== original.number ||
          draft.name.trim() !== original.name ||
          draft.isGoalkeeper !== original.is_goalkeeper ||
          draft.isActive !== (original.is_active !== false)
        )
      })

      if (changedDrafts.length === 0) return

      const { error } = await supabase.rpc("save_club_players", {
        p_club_id: clubId,
        p_players: changedDrafts.map((draft) => ({
          id: draft.isNew ? null : draft.id,
          number: Number.parseInt(draft.number, 10),
          name: draft.name.trim(),
          is_goalkeeper: draft.isGoalkeeper,
          is_active: draft.isActive,
        })),
      })

      if (error) throw error

      onSaved?.()
    } catch (error: unknown) {
      setErrorMsg(error instanceof Error ? error.message : t("saveError"))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card className="overflow-hidden shadow-sm">
      <div className="h-1 bg-gradient-to-r from-primary via-primary/60 to-transparent" />
      <CardHeader className="border-b">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="text-xl sm:text-2xl">{t("title")}</CardTitle>
            <CardDescription className="mt-1 max-w-2xl leading-5">{t("description")}</CardDescription>
          </div>
          <Button type="button" className="w-full shrink-0 gap-2 sm:w-auto" onClick={addPlayer} disabled={saving || !clubId}>
            <Plus className="h-4 w-4" />
            {t("addPlayer")}
          </Button>
        </div>

        <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={t("searchPlaceholder")}
              className="pl-9"
            />
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">{t("activeCount", { count: activeCount })}</Badge>
            <Badge variant="outline">{t("inactiveCount", { count: inactiveCount })}</Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <div className="bg-muted/10 px-3 py-4 sm:px-6 sm:py-5">

          {errorMsg && (
            <div className="mb-4 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {errorMsg}
            </div>
          )}

          {visibleDrafts.length === 0 ? (
            <div className="flex min-h-48 flex-col items-center justify-center rounded-xl border border-dashed text-center">
              <UserRound className="mb-3 h-8 w-8 text-muted-foreground" />
              <p className="font-medium">{t("noResults")}</p>
              <p className="mt-1 text-sm text-muted-foreground">{t("noResultsDescription")}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
              {visibleDrafts.map((draft) => {
                const original = draft.isNew ? null : players.find((player) => player.id === draft.id)

                return (
                  <article
                    key={draft.id}
                    className={`overflow-hidden rounded-xl border bg-card shadow-sm transition-opacity ${
                      draft.isActive ? "" : "border-dashed opacity-70"
                    }`}
                  >
                    <div className="flex items-center gap-3 border-b bg-muted/20 p-3">
                      <div className="relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-muted">
                        {original?.photo_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={original.photo_url} alt={original.name} className="h-full w-full object-cover object-top" loading="lazy" />
                        ) : (
                          <span className="font-bold tabular-nums text-muted-foreground">#{draft.number || "-"}</span>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate font-semibold">{draft.name || t("newPlayer")}</p>
                          {draft.isNew && <Badge>{t("newBadge")}</Badge>}
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {draft.isGoalkeeper ? t("goalkeeper") : t("fieldPlayer")}
                        </p>
                      </div>

                      {draft.isNew ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="shrink-0 text-muted-foreground hover:text-destructive"
                          onClick={() => removeNewPlayer(draft.id)}
                          aria-label={t("removeNewPlayer")}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      ) : (
                        <Badge variant={draft.isActive ? "secondary" : "outline"}>
                          {draft.isActive ? t("active") : t("inactive")}
                        </Badge>
                      )}
                    </div>

                    <div className="space-y-4 p-3 sm:p-4">
                      <div className="grid grid-cols-[6rem_1fr] gap-3">
                        <div className="space-y-1.5">
                          <Label htmlFor={`player-number-${draft.id}`}>{t("capNumber")}</Label>
                          <Input
                            id={`player-number-${draft.id}`}
                            value={draft.number}
                            inputMode="numeric"
                            onChange={(event) => updateDraft(draft.id, { number: event.target.value })}
                            className="tabular-nums"
                          />
                        </div>
                        <div className="min-w-0 space-y-1.5">
                          <Label htmlFor={`player-name-${draft.id}`}>{t("name")}</Label>
                          <Input
                            id={`player-name-${draft.id}`}
                            value={draft.name}
                            onChange={(event) => updateDraft(draft.id, { name: event.target.value })}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant={!draft.isGoalkeeper ? "default" : "outline"}
                          onClick={() => updateDraft(draft.id, { isGoalkeeper: false })}
                        >
                          {t("fieldPlayer")}
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant={draft.isGoalkeeper ? "default" : "outline"}
                          onClick={() => updateDraft(draft.id, { isGoalkeeper: true })}
                        >
                          {t("goalkeeper")}
                        </Button>
                      </div>

                      <Button
                        type="button"
                        size="sm"
                        variant={draft.isActive ? "outline" : "secondary"}
                        className="w-full gap-2"
                        onClick={() => updateDraft(draft.id, { isActive: !draft.isActive })}
                      >
                        {draft.isActive ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        {draft.isActive ? t("deactivate") : t("activate")}
                      </Button>
                    </div>
                  </article>
                )
              })}
            </div>
          )}
        </div>

        <div className="sticky bottom-0 z-10 flex flex-col-reverse gap-2 border-t bg-background/95 px-4 py-3 backdrop-blur sm:flex-row sm:justify-end sm:px-6 sm:py-4">
          <Button variant="outline" onClick={resetDrafts} disabled={saving} className="sm:min-w-28">
            {t("discard")}
          </Button>
          <Button onClick={handleSave} disabled={saving} className="sm:min-w-36">
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {saving ? t("saving") : t("saveChanges")}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
