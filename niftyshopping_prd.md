# **Product Requirements Document (PRD) - NiftyGroceries**

**Versie:** 1.0  
**Datum:** 21 april 2026  
**Doel:** Een mobiele app voor het beheer van boodschappenlijstjes, met focus op gebruiksgemak, snelle input en categorisatie.

---

## **1. Inleiding**

### **Doel van de App**

NiftyGroceries is een **mobiele boodschappenlijst-app** die gebruikers helpt om boodschappen georganiseerd, snel en intuïtief te beheren. De app ondersteunt:

- Snelle toevoeging van items via autocomplete.
- Categorisatie en sortering van boodschappen.
- Swipe-gestures voor het markeren van items als "compleet" of "verwijderd".
- Een overzicht van afgeronde boodschappen ("compleet"-lijst).
- Instellingen voor het beheren van items en categorieën.

### **Doelgroep**

- **Primaire gebruikers:** Consumenten die regelmatig boodschappen doen en een digitale lijst willen bijhouden.
- **Secundaire gebruikers:** Gezinsleden die een gedeelde lijst willen beheren (toekomstige feature).

---

## **2. Database Structuur**

### **Tabel: `items**`


| Kolom       | Type    | Beschrijving                                                         |
| ----------- | ------- | -------------------------------------------------------------------- |
| id          | INTEGER | Unieke identifier (primary key).                                     |
| category_id | INTEGER | Verwijzing naar de `categories` tabel.                               |
| item_name   | TEXT    | Naam van het item.                                                   |
| quantity    | INTEGER | Aantal/hoeveelheid (bijv. 2, 500g).                                  |
| listed      | BOOLEAN | `1` = op de actieve boodschappenlijst, `0` = op de "compleet"-lijst. |
| visible     | BOOLEAN | `1` = zichtbaar in de app, `0` = verborgen/gearchiveerd.             |
| change_date | DATE    | Datum van laatste wijziging (altijd "vandaag" bij wijziging).        |


### **Tabel: `categories**`


| Kolom | Type    | Beschrijving                                        |
| ----- | ------- | --------------------------------------------------- |
| id    | INTEGER | Unieke identifier (primary key).                    |
| name  | TEXT    | Naam van de categorie (bijv. "Zuivel", "Groenten"). |
| order | INTEGER | Volgorde voor weergave in de app (bijv. 1, 2, 3).   |


---

## **3. Functionele Vereisten**

### **A. Boodschappenlijst Weergave**

- **Actieve lijst:** Toont alle items waar `visible = 1` **en** `listed = 1`, gesorteerd op `category.order`.
- **Compleet-lijst:** Toont alle items waar `visible = 1`, `listed = 0` **en** `change_date = vandaag`.
- **Opstart-updates:** Bij opstarten van de app:
  - Update alle items waar `visible = 1`, `listed = 0` **en** `change_date != vandaag` naar `visible = 0`, `listed = 0`.

### **B. Items Toevoegen**

- **Autocomplete zoekveld:**
  - Typen in het zoekveld toont een dropdown met bestaande items (op `item_name`).
  - In de dropdown kunnen gebruikers het aantal aanpassen met `+`/`-` knoppen.
  - Selecteren van een item uit de dropdown:
    - Stelt `visible = 1`, `listed = 1` in.
    - Past `quantity` aan naar de geselecteerde waarde.
    - Stelt `change_date` in op "vandaag".
- **Nieuwe items toevoegen:**
  - Als een item niet in de database voorkomt, verschijnt een popup om:
    - Itemnaam, categorie, en aantal in te voeren.
    - Het item wordt toegevoegd aan de `items` tabel met `visible = 1`, `listed = 1`, en `change_date = vandaag`.

### **C. Items Beheren**

- **Swipe-gestures:**
  - **Naar rechts swipen:** Markeert item als "compleet" (`listed = 0`, `change_date = vandaag`).
  - **Naar links swipen:** Verwijdert item (`visible = 0`).
  - Tijdens het swipen verschijnt een **checkbox** (compleet) of **vuilnisbakje** (verwijderen) achter het item.
- **Compleet-lijst:**
  - Items kunnen teruggezet worden naar de actieve lijst (`listed = 1`).

### **D. Instellingen**

- **Tabblad "Items":**
  - Toont alle items uit de `items` tabel.
  - Gebruikers kunnen items bewerken (naam, categorie) of verwijderen.
- **Tabblad "Categorieën":**
  - Toont alle categorieën uit de `categories` tabel.
  - Gebruikers kunnen categorieën toevoegen, verwijderen en de volgorde aanpassen via drag-and-drop.

---

## **4. User Interface & Design**

### **Layout**

- **Mobile-first** ontwerp met **WASP/SQLite** backend en **Tailwind CSS** voor styling.
- **Header:**
  - Links: Logo (wit winkelwagentje in afgerond oranje vierkant, 5 graden geroteerd, kleur `#c36322`).
  - Rechts: Switch om te wisselen tussen "boodschappenlijst" en "compleet"-lijst, en een tandwiel-icon voor instellingen.
  - Achtergrondkleur header: `hsl(30 10% 12%)`.
- **Kleuren:**
  - Primaire kleur voor knoppen/switches: `#c36322`.
  - Moderne iconset voor visuele elementen.

### **Interactie**

- **Autocomplete:** Directe feedback bij typen, met dropdown en `+`/`-` knoppen voor hoeveelheid.
- **Swipe:** Vloeiende animatie bij swipen, met duidelijke visuele feedback (checkbox/vuilnisbakje).
- **Popup:** Voor nieuwe items, met velden voor naam, categorie, en aantal.

---

## **5. Technische Specificaties**

### **Infrastructuur**

- **Backend:** WASP met SQLite database.
- **Frontend:** Mobile-first, gebouwd met Tailwind CSS.
- **Deployment:** Docker container met `docker-compose`, waarbij de SQLite database persistent is.

### **Dataflow**

- **Items toevoegen:**
  - Gebruiker typt → autocomplete zoekt in `items` tabel → selecteert item → update `items` tabel.
- **Swipe acties:**
  - Swipe → update `listed` of `visible` in `items` tabel → `change_date` = vandaag.
- **Opstarten:**
  - Query: `UPDATE items SET visible = 0, listed = 0 WHERE visible = 1 AND listed = 0 AND change_date != vandaag`.

---

## **6. Voorbeelden**

### **Autocomplete Flow**

- **Input:** Gebruiker typt "melk".
- **Dropdown:** Toont "Melk (Zuivel, 1)" met `+`/`-` knoppen.
- **Selectie:** Gebruiker kiest "Melk" en stelt aantal in op 2.
- **Resultaat:** Item "Melk" wordt toegevoegd/geüpdatet in `items` tabel met `quantity = 2`, `listed = 1`, `visible = 1`.

### **Swipe Flow**

- **Actie:** Gebruiker swipet "Melk" naar rechts.
- **Resultaat:** `listed = 0`, `change_date = vandaag` in `items` tabel.

---

## **7. Validatie & Testen**

### **Testscenario's**

- **Autocomplete:** Controleer of bestaande items correct worden getoond en toegevoegd.
- **Swipe:** Controleer of items correct worden gemarkeerd als "compleet" of "verwijderd".
- **Opstart-updates:** Controleer of oude items correct worden gearchiveerd.
- **Instellingen:** Controleer of items en categorieën correct kunnen worden bewerkt/verwijderd.

### **Succescriteria**

- Gebruikers kunnen **binnen 3 stappen** een item toevoegen.
- Swipe-gestures werken **100% betrouwbaar**.
- De app start op **< 2 seconden** en toont de juiste lijsten.

---

## **8. Tijdlijn & Levering**

- **Mijlpaal 1:** Database en backend (1 week).
- **Mijlpaal 2:** Frontend en UI (2 weken).
- **Mijlpaal 3:** Testen en bugfixes (1 week).
- **Levering:** Docker container met persistent database.