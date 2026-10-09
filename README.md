# Alpirsbacher Steeldartscup – MVP

Lokaler Prototyp der Turniersoftware für den 3. Alpirsbacher Steeldartscup am 16.01.2027.

## Start

Am einfachsten im Projektordner einen kleinen lokalen Webserver starten, z. B. mit Python:

`python3 -m http.server 8080`

Danach im Browser öffnen:

`http://localhost:8080`

Der Prototyp speichert seinen Zustand im Browser (localStorage). Über **Demo zurücksetzen** wird wieder der Ausgangszustand geladen.

## Enthalten

- 80 Testteilnehmer
- Teilnehmerverwaltung / Check-in
- zufällige Auslosung auf 16 Gruppen A–P
- feste Board-Zuordnung
- Veröffentlichung getrennt von Auslosung
- Turnierstart
- getrennte Testansichten für Turnierleitung, Schreiber/Board, Spieler und Beamer
- Board-Ansichten mit aktuellem und nächstem Match sowie „läuft seit …“ statt fester Match-Uhrzeiten
- Gruppenergebnisse und Live-Tabellen
- letzte Ergebnis-Korrektur pro Board
- fester 32er-KO-Baum und automatische Qualifikanten-Befüllung
- persönliche Spieleransicht mit Gruppe, Bilanz, nächstem Gegner, Turnierplan und Benachrichtigungsstufen
- Statuslogik: „Noch 2 Spiele“, „Nach diesem Spiel“, „Du bist jetzt dran“
- Beamer-Vorschau
- lokale Persistenz

## Noch nicht vollständig produktionsreif

Persönliche Magic-Links, Push, echte Benutzer-/Rechteverwaltung, PDF-Export, Server-Datenbank und die Live-Schnittstelle zur separaten Anmeldung kommen in den nächsten Ausbaustufen.
