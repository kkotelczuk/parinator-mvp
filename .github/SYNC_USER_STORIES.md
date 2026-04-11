# Synchronizacja GitHub Issues z user stories (PRD)

Skrypt [scripts/sync-user-stories.mjs](scripts/sync-user-stories.mjs) wczytuje bloki `### US-xxx` z [`.ai/prd.md`](../.ai/prd.md) i tworzy lub aktualizuje issue w repozytorium przez [GitHub CLI](https://cli.github.com/) (`gh`).

## Wymagania

- Zainstalowany `gh` i zalogowanie: `gh auth login` (zakres `repo`; dla GitHub Projects dodatkowo `project`: `gh auth refresh -s project`).
- Repozytorium zdalne wskazujące na ten projekt (lub zmienna `GITHUB_REPOSITORY=owner/repo`).

## Uruchomienie

```bash
npm run sync:github-issues
```

Podgląd listy tytułów bez wywołań API:

```bash
node .github/scripts/sync-user-stories.mjs --dry-run
```

## Zachowanie

- Tytuł issue: `[US-xxx] …` — po tym prefiksie skrypt wyszukuje istniejące issue i **nadpisuje** treść przy ponownym uruchomieniu.
- Etykiety: `user-story` oraz `mvp` (US-001–US-032) albo `post-mvp` (US-033+).

## GitHub Project (opcjonalnie)

Po utworzeniu issue można dodać je do tablicy Project v2:

```bash
export GITHUB_PROJECT_NUMBER=1   # numer projektu widoczny w URL
export PROJECT_OWNER=kkotelczuk  # domyślnie właściciel repozytorium
npm run sync:github-issues
```

Jeśli `item-add` zwróci błąd, sprawdź `gh auth refresh -s project` i numer projektu (`gh project list --owner <owner>`).
