<conversation_summary>
<decisions>

1. Model danych ma być projektowany docelowo poza MVP: wspierać drużyny 5, 8 i większe; w MVP obowiązuje 5 graczy + niegrający kapitan.
2. Członkostwo w drużynie ma być historyczne (rekomendacja zaakceptowana).
3. Estymacja matchupu pozostaje jako jeden rekord z obsługą wariantu pierwszeństwa (rekomendacja zaakceptowana).
4. Komentarz do matchupu jest przechowywany per runda.
5. Preferencje stołów zapisują tylko różnice od stanu neutralnego.
6. Status turnieju: `active` i `closed`; turniej `active` można dowolnie konfigurować.
7. Synchronizacja offline->online w MVP ma być możliwie najprostsza, zgodna z zasadą local wins.
8. RLS ma być docelowe: gracz widzi tylko własne estymacje, ale może oglądać pairing matrix w trybie read-only.
9. Import/caching ma zawierać rekomendowane lekkie wersjonowanie i diagnostykę.
10. Partycjonowanie odkładamy na etap po MVP.
11. Runda może zostać zamknięta tylko przez kapitana; po zamknięciu staje się read-only.
12. Zmiana drużyny przeciwnika powoduje hard reset całej rundy.
13. Matrix gracza nie ukrywa danych w obrębie drużyny; różnica względem kapitana to brak możliwości edycji.
14. `team_size` jest zamrożony od setupu turnieju.
15. Kody dołączania działają bez TTL.
16. Użytkownik może należeć równolegle do wielu drużyn.
17. Estymacje mogą wprowadzać tylko użytkownicy z rolą `player`.
18. Po zamknięciu rundy blokowane są wszystkie dane tej rundy.
19. Deduplikacja importu działa globalnie.
20. Audyt ma być minimalny.
21. Po zamknięciu turnieju odczyt historyczny pozostaje dostępny dla wszystkich członków drużyny.
22. Pełny matrix dla gracza ma być dostępny dopiero po uzupełnieniu własnych estymacji w danej rundzie.
    </decisions>

<matched_recommendations>

1. Model `team_memberships` z rolami (`captain`, `player`) i flagą `is_playing` jest zgodny z wymaganiem kapitana niegrającego oraz przyszłego wsparcia różnych formatów składu.
2. Konfigurowalne `team_size` (5/8/więcej) zamrażane na etapie setupu turnieju najlepiej odpowiada uzgodnionej regule stabilności danych.
3. Statusy warstwowe: `tournaments.status` (`active`, `closed`) oraz `rounds.status` (editable/locked) realizują wymaganie zamknięcia rundy tylko przez kapitana.
4. Hard reset „całej rundy” po zmianie przeciwnika powinien być wykonany transakcyjnie dla wszystkich encji zależnych rundy.
5. RLS: gracze mają zapis tylko do własnych estymacji, ale odczyt pełnego matrixu drużyny jako read-only.
6. Najprostsza synchronizacja MVP: atomowe nadpisanie snapshotu rundy zgodnie z local wins.
7. Kody dołączania bez TTL z limitem użyć i natychmiastową invalidacją poprzedniego aktywnego kodu przy regeneracji.
8. Użytkownik w wielu drużynach wymaga autoryzacji opartej o membership/context, nie tylko `user_id`.
9. Globalna deduplikacja importów (`source_url` + hash) oraz lekka tabela `import_runs` dają cache i diagnostykę bez dużej złożoności.
10. Minimalny audyt zdarzeń krytycznych (bez pełnych snapshotów before/after) jest wystarczający na obecny etap.
    </matched_recommendations>

<database_planning_summary>
Główne wymagania schematu bazy danych:

- Schemat ma wyjść poza ograniczenia MVP i wspierać zmienne rozmiary drużyny (5/8+), przy zachowaniu zgodności z obecnym MVP (5 graczy + kapitan niegrający).
- Turniej ma status `active`/`closed`; runda jest edytowalna do momentu zamknięcia przez kapitana, potem jest w pełni read-only.
- Zmiana drużyny przeciwnika wykonuje twardy reset pełnego stanu rundy.
- Estymacje zapisują tylko gracze (`player`), komentarz jest per runda, a preferencje stołów przechowują tylko różnice względem neutralnego.
- Gracz widzi pełny matrix drużyny w odczycie dopiero po uzupełnieniu własnych estymacji dla rundy.

Kluczowe encje i relacje:

- `users` <-> `team_memberships` <-> `teams` <-> `tournaments`: relacje wspierające wielokrotne członkostwa użytkownika.
- `tournaments` -> `rounds` (1:N) z rozdzieleniem statusów turnieju i rundy.
- `rounds` -> dane operacyjne (`matchup_estimations`, `table_preferences`, `comments`, `simulations`, `live_pairings`, `results`) oraz reguły blokady/resetu.
- `join_codes` powiązane z drużyną/turniejem, z limitem użyć i jedną aktywną instancją.
- `import_runs` globalne dla deduplikacji i cache importu.
- `audit_events` minimalne dla krytycznych operacji.

Bezpieczeństwo i skalowalność:

- RLS ma być docelowe już teraz: precyzyjny zapis/uprawnienia po roli i członkostwie, read-only matrix dla graczy, pełna kontrola modyfikacji po stronie kapitana.
- Blokady read-only po zamknięciu rundy powinny być egzekwowane na poziomie bazy (nie tylko UI).
- Deduplikacja importu globalna poprawia efektywność przy rosnącej liczbie turniejów.
- Partycjonowanie odkładane na po MVP; na teraz wystarczą podstawowe indeksy i lekki audyt.

Stan rozmowy dla kolejnego etapu:

- Uzgodniono docelowe reguły domenowe i bezpieczeństwa potrzebne do stworzenia DDL PostgreSQL + polityk RLS.
- Kierunek implementacyjny jest „prosty w MVP, rozszerzalny docelowo”: minimalna złożoność synchronizacji i audytu, ale poprawny model relacyjny od startu.
  </database_planning_summary>

<unresolved_issues>

- Dokładny zakres encji objętych hard resetem rundy do formalnego zatwierdzenia w specyfikacji technicznej (lista tabel i kolejność kasowania).
- Formalna definicja warunku „gracz uzupełnił własne estymacje” (progi kompletności dla odblokowania pełnego matrixu read-only).
- Finalny słownik statusów rundy (nazwy enumów i przejścia stanów) do doprecyzowania przed przygotowaniem migracji SQL.
- Strategia przechowywania historii po hard resecie (brak historii vs minimalny ślad w audycie) do decyzji implementacyjnej.
  </unresolved_issues>
  </conversation_summary>
