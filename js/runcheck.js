// Run-Check (Freeski | Slopestyle) als Reiter der App.
// Uebernommen aus dem Artefakt «Swiss-Ski Run-Check» (Stand 14.11.2026): Katalog, Kriterien, Ansichten und
// Uebersetzungen sind unveraendert. Neu: Speichern in Supabase (Tabelle run_checks, SQL: supabase/runcheck_athlete_migration.sql),
// Rolle aus dem App-Login (Athlet:in oder Coach). Die Logins selbst verwaltet der Reiter «Accounts» (js/accounts.js).
// Nur aktiv, wo CFG.runCheck gesetzt ist (Freeski). Alles laeuft in einer IIFE; nach aussen gehen nur
// runCheckBoot() (boot.js) und loadRunCheck() (showPage).
(function(){
"use strict";
var root=null;
var $=function(s){return root?root.querySelector(s):null};
var esc=function(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})};
var uniq=function(a){return Array.from(new Set(a))};
var TR=[["Freeski | Slopestyle. Trage deinen Run ein und sieh sofort, ob er alle Judge-Kriterien abdeckt.", "Freeski | Slopestyle. Enter your run and see right away whether it covers all judging criteria.", "Freeski | Slopestyle. Saisis ton run et vois tout de suite s'il couvre tous les critères des juges.", "Freeski | Slopestyle. Inserisci il tuo run e vedi subito se copre tutti i criteri dei giudici."], ["Bereiche", "Sections", "Sections", "Sezioni"], ["Sprache", "Language", "Langue", "Lingua"], ["Ansicht", "View", "Vue", "Vista"], ["Athlet:innen-Ansicht", "Athlete view", "Vue athlète", "Vista atleta"], ["Coach:in-Ansicht", "Coach view", "Vue coach", "Vista coach"], ["Meine Runs", "My runs", "Mes runs", "I miei run"], ["Kriterien", "Criteria", "Critères", "Criteri"], ["Entwurf gesichert", "Draft saved", "Brouillon enregistré", "Bozza salvata"], ["Sichert …", "Saving …", "Enregistrement …", "Salvataggio …"], ["Speichern fehlgeschlagen", "Saving failed", "Échec de l'enregistrement", "Salvataggio non riuscito"], ["Nur auf diesem Gerät", "Only on this device", "Uniquement sur cet appareil", "Solo su questo dispositivo"], ["Verbunden", "Connected", "Connecté", "Connesso"], ["Kein Grab", "No grab", "Pas de grab", "Nessun grab"], ["Kein Flip", "No flip", "Pas de flip", "Nessun flip"], ["Linke Hand", "Left hand", "Main gauche", "Mano sinistra"], ["Rechte Hand", "Right hand", "Main droite", "Mano destra"], ["Beide Hände", "Both hands", "Les deux mains", "Entrambe le mani"], ["linke Hand", "left hand", "main gauche", "mano sinistra"], ["rechte Hand", "right hand", "main droite", "mano destra"], ["beide Hände", "both hands", "les deux mains", "entrambe le mani"], ["Links", "Left", "Gauche", "Sinistra"], ["Rechts", "Right", "Droite", "Destra"], ["Linker Fuss", "Left foot", "Pied gauche", "Piede sinistro"], ["Rechter Fuss", "Right foot", "Pied droit", "Piede destro"], ["Kein Spin", "No spin", "Pas de spin", "Nessuno spin"], ["Gerade", "Straight", "Droit", "Dritto"], ["Gerade rein", "Straight in", "Entrée droite", "Entrata dritta"], ["Ja", "Yes", "Oui", "Sì"], ["Nein", "No", "Non", "No"], ["Spin rein aufs Feature", "Spin onto the feature", "Spin d'entrée sur le feature", "Spin d'ingresso sul feature"], ["Rotation rein", "Rotation in", "Rotation d'entrée", "Rotazione in ingresso"], ["Fuss vorne", "Foot forward", "Pied devant", "Piede avanti"], ["Swaps auf dem Rail (optional, mehrere nacheinander möglich)", "Swaps on the rail (optional, several in a row possible)", "Swaps sur le rail (optionnel, plusieurs à la suite possibles)", "Swap sul rail (opzionale, anche più di seguito)"], ["Spin raus vom Feature (eine oder zwei Optionen)", "Spin off the feature (one or two options)", "Spin de sortie du feature (une ou deux options)", "Spin in uscita dal feature (una o due opzioni)"], ["Rotation raus", "Rotation out", "Rotation de sortie", "Rotazione in uscita"], ["Seite raus", "Side out", "Côté de sortie", "Lato di uscita"], ["Grab nach dem Rail (optional)", "Grab after the rail (optional)", "Grab après le rail (optionnel)", "Grab dopo il rail (opzionale)"], ["Grab mit Hand", "Grab with hand", "Grab avec la main", "Grab con la mano"], ["Spezielles (optional)", "Special (optional)", "Spécial (optionnel)", "Speciale (opzionale)"], ["Eigene Beschreibung, z. B. besonderer Trick", "Your own description, e.g. special trick", "Ta propre description, p. ex. trick spécial", "Descrizione personale, ad es. trick speciale"], ["Landung", "Landing", "Réception", "Atterraggio"], ["Absprung", "Take-off stance", "Stance à l'appel", "Stance allo stacco"], ["Drehrichtung", "Spin direction", "Sens de rotation", "Direzione di rotazione"], ["Achse", "Axis", "Axe", "Asse"], ["Rotation (Grad)", "Rotation (degrees)", "Rotation (degrés)", "Rotazione (gradi)"], ["Entfernen", "Remove", "Retirer", "Rimuovi"], ["Nach vorne", "Move forward", "Vers l'avant", "Avanti"], ["Nach hinten", "Move back", "Vers l'arrière", "Indietro"], ["Element entfernen", "Remove element", "Retirer l'élément", "Rimuovi elemento"], ["Komplett", "Complete", "Complet", "Completo"], ["noch leer", "still empty", "encore vide", "ancora vuoto"], ["{x} vorne", "{x} forward", "{x} devant", "{x} avanti"], ["rein", "in", "entrée", "ingresso"], ["raus", "out", "sortie", "uscita"], ["Spezielles: {x}", "Special: {x}", "Spécial : {x}", "Speciale: {x}"], ["Switch-Landung", "Switch landing", "Réception switch", "Atterraggio switch"], ["Forward-Landung", "Forward landing", "Réception forward", "Atterraggio forward"], ["Landung {x}", "Landing {x}", "Réception {x}", "Atterraggio {x}"], ["Run komplett", "Run complete", "Run complet", "Run completo"], ["Noch 1 Punkt offen", "1 point left", "Encore 1 point ouvert", "Ancora 1 punto aperto"], ["Noch {n} Punkte offen", "{n} points left", "Encore {n} points ouverts", "Ancora {n} punti aperti"], ["Noch {n} offen", "{n} left", "Encore {n} ouverts", "Ancora {n} aperti"], ["{n} offen", "{n} open", "{n} ouverts", "{n} aperti"], ["Alle Kriterien erfüllt, auch die Bonuskriterien.", "All criteria met, including the bonus criteria.", "Tous les critères sont remplis, bonus compris.", "Tutti i criteri soddisfatti, anche quelli bonus."], ["Alle notwendigen Kriterien erfüllt. {n} Bonuskriterium/-kriterien möglich.", "All required criteria met. {n} bonus criterion/criteria still possible.", "Tous les critères obligatoires sont remplis. {n} critère(s) bonus encore possible(s).", "Tutti i criteri obbligatori soddisfatti. Ancora {n} criterio/i bonus possibile/i."], ["Erfüllt: {a} von {b} notwendigen Kriterien.", "Met: {a} of {b} required criteria.", "Remplis : {a} sur {b} critères obligatoires.", "Soddisfatti: {a} su {b} criteri obbligatori."], ["Bei diesem Kurs entfallen: {list}.", "Not applicable on this course: {list}.", "Non applicable sur ce parcours : {list}.", "Non applicabili su questo percorso: {list}."], ["Notwendig", "Required", "Obligatoire", "Obbligatorio"], ["Notwendig {a}/{b}", "Required {a}/{b}", "Obligatoire {a}/{b}", "Obbligatorio {a}/{b}"], ["Notwendig {a}/{b} · Tippen für Details", "Required {a}/{b} · Tap for details", "Obligatoire {a}/{b} · Touche pour les détails", "Obbligatorio {a}/{b} · Tocca per i dettagli"], ["Elemente", "Elements", "Éléments", "Elementi"], ["Run-Aufbau", "Run structure", "Structure du run", "Struttura del run"], ["Alle einklappen", "Collapse all", "Tout replier", "Comprimi tutto"], ["Alle ausklappen", "Expand all", "Tout déplier", "Espandi tutto"], ["fehlt: {x}", "missing: {x}", "manque : {x}", "manca: {x}"], ["Noch offen: {list}.", "Still open: {list}.", "Encore ouvert : {list}.", "Ancora aperti: {list}."], ["+ {x} hinzufügen", "+ Add {x}", "+ Ajouter {x}", "+ Aggiungi {x}"], ["Alle Elemente ausgefüllt", "All elements filled in", "Tous les éléments sont remplis", "Tutti gli elementi compilati"], ["Jedes Element ist vollständig eingetragen.", "Every element is completely filled in.", "Chaque élément est entièrement rempli.", "Ogni elemento è compilato completamente."], ["Jedes Element des Runs ist vollständig eingetragen.", "Every element of the run is completely filled in.", "Chaque élément du run est entièrement rempli.", "Ogni elemento del run è compilato completamente."], ["Linker und rechter Fuss vorne auf dem Rail", "Left and right foot forward on the rail", "Pied gauche et pied droit devant sur le rail", "Piede sinistro e destro avanti sul rail"], ["Mindestens einmal linker Fuss vorne und einmal rechter Fuss vorne auf einem Rail. Ein normaler Swap (Frontside oder Backside, kein 360 Swap) auf einem Rail zählt als beide Füsse vorne. Gilt ab 2 Rails.", "At least once left foot forward and once right foot forward on a rail. A normal swap (frontside or backside, not a 360 swap) on a rail counts as both feet forward. Applies from 2 rails.", "Au moins une fois pied gauche devant et une fois pied droit devant sur un rail. Un swap normal (frontside ou backside, pas un swap 360) sur un rail compte comme les deux pieds devant. S'applique à partir de 2 rails.", "Almeno una volta piede sinistro avanti e una volta piede destro avanti su un rail. Uno swap normale (frontside o backside, non uno swap 360) su un rail vale come entrambi i piedi avanti. Vale da 2 rail."], ["Beide Füsse durch Swap", "Both feet via swap", "Les deux pieds via swap", "Entrambi i piedi tramite swap"], ["Es fehlt ein Rail mit linkem Fuss vorne.", "A rail with the left foot forward is missing.", "Il manque un rail avec le pied gauche devant.", "Manca un rail con il piede sinistro avanti."], ["Es fehlt ein Rail mit rechtem Fuss vorne.", "A rail with the right foot forward is missing.", "Il manque un rail avec le pied droit devant.", "Manca un rail con il piede destro avanti."], ["Pretzel auf Rails", "Pretzel on rails", "Pretzel sur les rails", "Pretzel sui rail"], ["Mindestens ein Pretzel (Richtungswechsel) auf mindestens einem Rail. Ein Pretzel entsteht, wenn (1) Spin rein und Spin raus in verschiedene Richtungen gehen, (2) nach Left oder Right mit 90 oder 450 rein ein Frontside Swap oder Frontside 360 Swap folgt, bzw. nach Switch Left oder Switch Right mit 90 oder 450 rein ein Backside Swap oder Backside 360 Swap, oder (3) zwei normale Swaps derselben Art direkt nacheinander folgen (zweimal Frontside oder zweimal Backside, keine 360 Swaps). Frontside gefolgt von Backside (oder umgekehrt) ist kein Pretzel.", "At least one pretzel (change of direction) on at least one rail. A pretzel happens when (1) spin in and spin out go in different directions, (2) after Left or Right with 90 or 450 in a frontside swap or frontside 360 swap follows, or after Switch Left or Switch Right with 90 or 450 in a backside swap or backside 360 swap follows, or (3) two normal swaps of the same kind follow each other directly (frontside twice or backside twice, not 360 swaps). Frontside followed by backside (or the other way round) is not a pretzel.", "Au moins un pretzel (changement de direction) sur au moins un rail. Un pretzel existe lorsque (1) le spin d'entrée et le spin de sortie vont dans des directions différentes, (2) après Left ou Right avec 90 ou 450 à l'entrée un swap frontside ou un swap frontside 360 suit, ou après Switch Left ou Switch Right avec 90 ou 450 à l'entrée un swap backside ou un swap backside 360 suit, ou (3) deux swaps normaux du même type se suivent directement (deux fois frontside ou deux fois backside, pas de swaps 360). Un frontside suivi d'un backside (ou l'inverse) n'est pas un pretzel.", "Almeno un pretzel (cambio di direzione) su almeno un rail. Un pretzel c'è quando (1) lo spin in ingresso e quello in uscita vanno in direzioni diverse, (2) dopo Left o Right con 90 o 450 in ingresso segue uno swap frontside o uno swap frontside 360, oppure dopo Switch Left o Switch Right con 90 o 450 in ingresso segue uno swap backside o uno swap backside 360, oppure (3) due swap normali dello stesso tipo si susseguono direttamente (due volte frontside o due volte backside, non swap 360). Frontside seguito da backside (o viceversa) non è un pretzel."], ["Pretzel auf {list}", "Pretzel on {list}", "Pretzel sur {list}", "Pretzel su {list}"], ["Es fehlt ein Pretzel. Wähle bei einem Rail Spin rein und Spin raus in verschiedene Richtungen, mache nach 90 oder 450 rein den passenden Swap, oder füge zwei gleiche Swaps direkt nacheinander hinzu.", "A pretzel is missing. On one rail, choose spin in and spin out in different directions, do the matching swap after 90 or 450 in, or add two identical swaps directly in a row.", "Il manque un pretzel. Sur un rail, choisis un spin d'entrée et un spin de sortie dans des directions différentes, fais le swap adapté après 90 ou 450 à l'entrée, ou ajoute deux swaps identiques directement à la suite.", "Manca un pretzel. Su un rail scegli spin in ingresso e in uscita in direzioni diverse, fai lo swap adatto dopo 90 o 450 in ingresso, oppure aggiungi due swap identici direttamente di seguito."], ["Mindestens 2 verschiedene Achsen auf dem ganzen Kurs", "At least 2 different axes across the whole course", "Au moins 2 axes différents sur tout le parcours", "Almeno 2 assi diversi su tutto il percorso"], ["Mindestens 2 verschiedene Achsen, zum Beispiel Cork und Bio / Misty. Es zählen die Achsen der Jumps (Flat, Flatspin, Cork, Bio / Misty) und ein Spin raus vom Rail mit Cork oder Bio / Misty. Gerade beim Spin raus zählt nicht. Gilt ab 2 Features mit Achse.", "At least 2 different axes, for example cork and bio / misty. The axes of the jumps (flat, flatspin, cork, bio / misty) count, as does a spin off a rail with cork or bio / misty. Straight on the way out does not count. Applies from 2 features with an axis.", "Au moins 2 axes différents, par exemple cork et bio / misty. Comptent les axes des jumps (flat, flatspin, cork, bio / misty) et un spin de sortie de rail en cork ou bio / misty. Droit à la sortie ne compte pas. S'applique à partir de 2 features avec axe.", "Almeno 2 assi diversi, ad esempio cork e bio / misty. Contano gli assi dei jump (flat, flatspin, cork, bio / misty) e uno spin in uscita dal rail con cork o bio / misty. Dritto in uscita non conta. Vale da 2 elementi con asse."], ["Es fehlt eine weitere Achse, zum Beispiel {x}.", "Another axis is missing, for example {x}.", "Il manque un autre axe, par exemple {x}.", "Manca un altro asse, ad esempio {x}."], ["Alle 4 Drehrichtungen (Left, Right, Switch Left, Switch Right)", "All 4 spin directions (Left, Right, Switch Left, Switch Right)", "Les 4 sens de rotation (Left, Right, Switch Left, Switch Right)", "Tutte e 4 le direzioni (Left, Right, Switch Left, Switch Right)"], ["Bei 4 Jumps kommen alle 4 Drehrichtungen auf den Jumps vor. Bei nur 3 Jumps sind es 3 verschiedene Drehrichtungen auf den Jumps, und die übrige Richtung wird irgendwo auf einem Rail gemacht. Die Gesamtrichtung eines Rails ist die Richtung des Spins rein. Ausnahme: Bei Anfahrt vorwärts (Forward) mit nur 90 Grad rein zählt die gesamte Drehung (Spin rein, Swaps und Spin raus). Bei Switch-Anfahrt zählt der Spin rein immer, auch bei 90 Grad. Bei den Swaps wechselt der Fuss vorne nach jedem normalen Swap (kein 360 Swap), das bestimmt die Richtung des nächsten Swaps.", "With 4 jumps, all 4 spin directions appear on the jumps. With only 3 jumps, there are 3 different spin directions on the jumps, and the remaining direction is done somewhere on a rail. The overall direction of a rail is the direction of the spin in. Exception: when approaching forward with only 90 degrees in, the total rotation counts (spin in, swaps and spin out). On a switch approach the spin in always counts, even at 90 degrees. With swaps, the foot forward changes after every normal swap (not a 360 swap), which determines the direction of the next swap.", "Avec 4 jumps, les 4 sens de rotation apparaissent sur les jumps. Avec seulement 3 jumps, il y a 3 sens de rotation différents sur les jumps, et le sens restant est réalisé quelque part sur un rail. La direction globale d'un rail est celle du spin d'entrée. Exception : en approche avant (forward) avec seulement 90 degrés à l'entrée, c'est la rotation totale qui compte (spin d'entrée, swaps et spin de sortie). En approche switch, le spin d'entrée compte toujours, même à 90 degrés. Pour les swaps, le pied devant change après chaque swap normal (pas un swap 360), ce qui détermine la direction du swap suivant.", "Con 4 jump compaiono tutte e 4 le direzioni sui jump. Con soli 3 jump ci sono 3 direzioni diverse sui jump e la direzione restante viene fatta da qualche parte su un rail. La direzione complessiva di un rail è quella dello spin in ingresso. Eccezione: con avvicinamento in avanti (forward) e solo 90 gradi in ingresso conta la rotazione totale (spin in ingresso, swap e spin in uscita). Con avvicinamento switch conta sempre lo spin in ingresso, anche a 90 gradi. Con gli swap, il piede avanti cambia dopo ogni swap normale (non uno swap 360), e questo determina la direzione dello swap successivo."], ["Es fehlt auf den Jumps: {list}.", "Missing on the jumps: {list}.", "Manque sur les jumps : {list}.", "Mancano sui jump: {list}."], ["Verschiedene Drehrichtungen", "Different spin directions", "Sens de rotation différents", "Direzioni diverse"], ["Es fehlen verschiedene Drehrichtungen (Left, Right, Switch Left, Switch Right).", "Different spin directions are missing (Left, Right, Switch Left, Switch Right).", "Il manque des sens de rotation différents (Left, Right, Switch Left, Switch Right).", "Mancano direzioni diverse (Left, Right, Switch Left, Switch Right)."], ["Es fehlt: {list}.", "Missing: {list}.", "Manque : {list}.", "Manca: {list}."], ["Verschiedene Grabs", "Different grabs", "Grabs différents", "Grab diversi"], ["Mindestens 3 verschiedene Grabs. Grabs nach dem Rail (Spin raus) zählen mit. Derselbe Grab mit linker und mit rechter Hand zählt als zwei verschiedene Grabs, ebenso mit beiden Händen. «Kein Grab» zählt nicht.", "At least 3 different grabs. Grabs after the rail (spin out) count. The same grab with the left and with the right hand counts as two different grabs, likewise with both hands. “No grab” does not count.", "Au moins 3 grabs différents. Les grabs après le rail (spin de sortie) comptent. Le même grab avec la main gauche et avec la main droite compte comme deux grabs différents, de même avec les deux mains. « Pas de grab » ne compte pas.", "Almeno 3 grab diversi. Contano anche i grab dopo il rail (spin in uscita). Lo stesso grab con la mano sinistra e con la destra vale come due grab diversi, così come con entrambe le mani. «Nessun grab» non conta."], ["Noch {n} weitere(r) Grab nötig.", "{n} more grab(s) needed.", "Encore {n} grab(s) nécessaire(s).", "Servono ancora {n} grab."], ["Grabs mit beiden Händen", "Grabs with both hands", "Grabs avec les deux mains", "Grab con entrambe le mani"], ["Mindestens ein Grab mit der linken und eines mit der rechten Hand, nicht immer dieselbe Hand. Grabs nach dem Rail zählen mit. Ein Grab mit beiden Händen zusammen deckt beide Seiten ab.", "At least one grab with the left hand and one with the right hand, not always the same hand. Grabs after the rail count. A grab with both hands together covers both sides.", "Au moins un grab avec la main gauche et un avec la main droite, pas toujours la même main. Les grabs après le rail comptent. Un grab avec les deux mains ensemble couvre les deux côtés.", "Almeno un grab con la mano sinistra e uno con la destra, non sempre la stessa mano. Contano anche i grab dopo il rail. Un grab con entrambe le mani insieme copre entrambi i lati."], ["Es fehlt ein Grab mit der linken Hand (oder mit beiden Händen).", "A grab with the left hand (or with both hands) is missing.", "Il manque un grab avec la main gauche (ou avec les deux mains).", "Manca un grab con la mano sinistra (o con entrambe le mani)."], ["Es fehlt ein Grab mit der rechten Hand (oder mit beiden Händen).", "A grab with the right hand (or with both hands) is missing.", "Il manque un grab avec la main droite (ou avec les deux mains).", "Manca un grab con la mano destra (o con entrambe le mani)."], ["Bringback/Hold-Trick", "Bringback/hold trick", "Trick bringback/hold", "Trick bringback/hold"], ["Mindestens ein Jump mit Bringback/Hold.", "At least one jump with bringback/hold.", "Au moins un jump avec bringback/hold.", "Almeno un jump con bringback/hold."], ["Markiere bei einem Jump «Bringback/Hold».", "Mark one jump as “Bringback/Hold”.", "Marque un jump comme « Bringback/Hold ».", "Segna un jump come «Bringback/Hold»."], ["Andere Take-off-Variante", "Other take-off variant", "Autre variante de take-off", "Altra variante di take-off"], ["Mindestens ein Jump mit anderem Take-off, zum Beispiel Nose Butter, Tail Butter, Tokyo Drift oder Blender.", "At least one jump with a different take-off, for example nose butter, tail butter, tokyo drift or blender.", "Au moins un jump avec un autre take-off, par exemple nose butter, tail butter, tokyo drift ou blender.", "Almeno un jump con uno stacco diverso, ad esempio nose butter, tail butter, tokyo drift o blender."], ["Wähle bei einem Jump einen besonderen Take-off.", "Choose a special take-off on one jump.", "Choisis un take-off spécial sur un jump.", "Scegli uno stacco speciale su un jump."], ["Noch kein Run vorhanden. Wechsle zu «Meine Runs» und lege einen neuen Run an.", "No run yet. Go to “My runs” and create a new run.", "Aucun run pour l'instant. Va dans « Mes runs » et crée un nouveau run.", "Nessun run ancora. Vai su «I miei run» e crea un nuovo run."], ["Run zusammenstellen", "Build your run", "Composer le run", "Componi il run"], ["Wähle bei jedem Element die Merkmale aus. Der Run-Check zeigt sofort, was dir zu einem vollständigen Run noch fehlt.", "Choose the attributes for each element. The run check immediately shows what is still missing for a complete run.", "Choisis les caractéristiques de chaque élément. Le Run-Check montre tout de suite ce qu'il manque pour un run complet.", "Scegli le caratteristiche di ogni elemento. Il Run-Check mostra subito cosa manca per un run completo."], ["← Alle Runs", "← All runs", "← Tous les runs", "← Tutti i run"], ["Duplizieren", "Duplicate", "Dupliquer", "Duplica"], ["(Kopie)", "(copy)", "(copie)", "(copia)"], ["Name des Runs", "Run name", "Nom du run", "Nome del run"], ["Wettkampf (Contest)", "Competition (contest)", "Compétition (contest)", "Competizione (contest)"], ["z. B. Weltcup Laax", "e.g. World Cup Laax", "p. ex. Coupe du monde Laax", "ad es. Coppa del Mondo Laax"], ["Athlet:in", "Athlete", "Athlète", "Atleta"], ["Athlet:in {x}", "Athlete {x}", "Athlète {x}", "Atleta {x}"], ["Dein Name (für Coach:in)", "Your name (for the coach)", "Ton nom (pour le/la coach)", "Il tuo nome (per il/la coach)"], ["Sichtbar für Coach:in", "Visible to the coach", "Visible pour le/la coach", "Visibile al/alla coach"], ["Noch nicht gespeichert. Dein:e Coach:in sieht diesen Run erst, wenn du ihn speicherst.", "Not saved yet. Your coach only sees this run once you save it.", "Pas encore enregistré. Ton/ta coach ne voit ce run que lorsque tu l'enregistres.", "Non ancora salvato. Il/la tuo/a coach vede questo run solo dopo che lo salvi."], ["Gespeichert am {d}. Dein:e Coach:in sieht diesen Stand.", "Saved on {d}. Your coach sees this version.", "Enregistré le {d}. Ton/ta coach voit cette version.", "Salvato il {d}. Il/la tuo/a coach vede questa versione."], ["Änderungen noch nicht gespeichert. Dein:e Coach:in sieht den Stand vom {d}.", "Changes not saved yet. Your coach sees the version from {d}.", "Modifications pas encore enregistrées. Ton/ta coach voit la version du {d}.", "Modifiche non ancora salvate. Il/la tuo/a coach vede la versione del {d}."], ["Gespeichert", "Saved", "Enregistré", "Salvato"], ["Run speichern", "Save run", "Enregistrer le run", "Salva run"], ["Coach:in-Feedback", "Feedback from the coach", "Feedback du/de la coach", "Feedback del/della coach"], ["Du kannst den Run weiter bearbeiten. Speichere ihn danach erneut, damit dein:e Coach:in die Änderungen sieht.", "You can keep editing the run. Save it again afterwards so your coach sees the changes.", "Tu peux continuer à modifier le run. Enregistre-le ensuite à nouveau pour que ton/ta coach voie les modifications.", "Puoi continuare a modificare il run. Salvalo di nuovo dopo, così il/la tuo/a coach vede le modifiche."], ["Alle deine Runs. Dein:e Coach:in sieht sie ebenfalls und kann dir Feedback hinterlassen.", "All your runs. Your coach can see them too and leave you feedback.", "Tous tes runs. Ton/ta coach les voit aussi et peut te laisser un feedback.", "Tutti i tuoi run. Anche il/la tuo/a coach li vede e può lasciarti un feedback."], ["Neuer Run: Kurs zusammenstellen", "New run: build the course", "Nouveau run : composer le parcours", "Nuovo run: componi il percorso"], ["Wähle die Features in der Reihenfolge, in der sie im Kurs dieses Contests vorkommen.", "Choose the features in the order they appear on the course of this contest.", "Choisis les features dans l'ordre où ils apparaissent sur le parcours de ce contest.", "Scegli gli elementi nell'ordine in cui compaiono nel percorso di questa gara."], ["Noch keine Features gewählt.", "No features chosen yet.", "Aucun feature choisi pour l'instant.", "Nessun elemento scelto finora."], ["Wähle mindestens ein Feature.", "Choose at least one feature.", "Choisis au moins un feature.", "Scegli almeno un elemento."], ["Mindestens {n} Rails nötig.", "At least {n} rails needed.", "Au moins {n} rails nécessaires.", "Servono almeno {n} rail."], ["Höchstens {n} Rails.", "At most {n} rails.", "Au maximum {n} rails.", "Al massimo {n} rail."], ["Mindestens {n} Jumps nötig.", "At least {n} jumps needed.", "Au moins {n} jumps nécessaires.", "Servono almeno {n} jump."], ["Höchstens {n} Jumps.", "At most {n} jumps.", "Au maximum {n} jumps.", "Al massimo {n} jump."], ["Wettkampf", "Competition", "Compétition", "Competizione"], ["Wettkampf wählen …", "Choose competition …", "Choisir la compétition …", "Scegli la competizione …"], ["+ Neuen Wettkampf erstellen …", "+ Create new competition …", "+ Créer une nouvelle compétition …", "+ Crea nuova competizione …"], ["Name des neuen Wettkampfs, z. B. Slopestyle Weltcup Laax", "Name of the new competition, e.g. Slopestyle World Cup Laax", "Nom de la nouvelle compétition, p. ex. Slopestyle Coupe du monde Laax", "Nome della nuova competizione, ad es. Slopestyle Coppa del Mondo Laax"], ["Wähle einen Wettkampf oder erstelle einen neuen, damit der Run zugeordnet wird.", "Choose a competition or create a new one so the run is assigned to it.", "Choisis une compétition ou crée-en une nouvelle pour y rattacher le run.", "Scegli una competizione o creane una nuova, così il run viene assegnato."], ["Name des Runs (optional)", "Run name (optional)", "Nom du run (optionnel)", "Nome del run (opzionale)"], ["z. B. Quali Run 1", "e.g. Quali run 1", "p. ex. Run de quali 1", "ad es. Run di quali 1"], ["Run mit diesem Kurs starten", "Start run with this course", "Démarrer le run avec ce parcours", "Avvia il run con questo percorso"], ["Noch keine Runs. Stelle oben den Kurs zusammen, um zu starten.", "No runs yet. Build the course above to get started.", "Pas encore de runs. Compose le parcours ci-dessus pour commencer.", "Ancora nessun run. Componi il percorso qui sopra per iniziare."], ["Beispiel", "Example", "Exemple", "Esempio"], ["Kein Contest", "No contest", "Pas de contest", "Nessuna gara"], ["Ohne Contest", "No contest", "Sans contest", "Senza gara"], ["Nicht gespeichert", "Not saved", "Non enregistré", "Non salvato"], ["Für Coach:in gespeichert", "Saved for coach", "Enregistré pour le/la coach", "Salvato per il/la coach"], ["Ungespeicherte Änderungen", "Unsaved changes", "Modifications non enregistrées", "Modifiche non salvate"], ["Coach:in-Feedback vorhanden", "Coach feedback available", "Feedback du/de la coach disponible", "Feedback del/della coach presente"], ["Bearbeiten", "Edit", "Modifier", "Modifica"], ["Wirklich löschen?", "Really delete?", "Vraiment supprimer ?", "Eliminare davvero?"], ["Löschen", "Delete", "Supprimer", "Elimina"], ["Diese Ansicht ist nur für Coach:innen.", "This view is for coaches only.", "Cette vue est réservée aux coachs.", "Questa vista è riservata ai coach."], ["Coach:in-Ansicht: Dieser Stand ist nur zum Ansehen. Athlet:innen bearbeiten ihre Runs in der Athlet:innen-Ansicht unter «Meine Runs».", "Coach view: this version is read-only. Athletes edit their runs in the athlete view under “My runs”.", "Vue coach : cette version est en lecture seule. Les athlètes modifient leurs runs dans la vue athlète sous « Mes runs ».", "Vista coach: questa versione è solo di lettura. Atleti e atlete modificano i propri run nella vista atleta sotto «I miei run»."], ["Meinen Run bearbeiten", "Edit my run", "Modifier mon run", "Modifica il mio run"], ["Notiz oder Feedback zu diesem Run", "Note or feedback on this run", "Note ou feedback sur ce run", "Nota o feedback su questo run"], ["Feedback senden", "Send feedback", "Envoyer le feedback", "Invia feedback"], ["Feedback gegeben", "Feedback given", "Feedback donné", "Feedback dato"], ["← Alle Athlet:innen", "← All athletes", "← Tous les athlètes", "← Atleti e atlete"], ["← Zurück zu {x}", "← Back to {x}", "← Retour à {x}", "← Torna a {x}"], ["Coach:in-Übersicht", "Coach overview", "Aperçu coach", "Panoramica coach"], ["Alle deine Athlet:innen. Klicke eine Person an, um ihre gespeicherten Runs zu sehen.", "All your athletes. Click a person to see their saved runs.", "Tes athlètes. Clique sur une personne pour voir ses runs enregistrés.", "Tutti i tuoi atleti e le tue atlete. Clicca su una persona per vedere i suoi run salvati."], ["Athlet:innen", "Athletes", "Athlètes", "Atleti e atlete"], ["Runs gespeichert", "Runs saved", "Runs enregistrés", "Run salvati"], ["Noch keine Athlet:innen. Sobald Athlet:innen das Tool öffnen und einen Run speichern, erscheinen sie hier. Sie benötigen dafür Zugriff als Contributor.", "No athletes yet. As soon as athletes open the tool and save a run, they appear here. They need contributor access for this.", "Pas encore d'athlètes. Dès que des athlètes ouvrent l'outil et enregistrent un run, ils apparaissent ici. Il leur faut pour cela un accès en tant que contributeur/contributrice.", "Ancora nessun/a atleta. Appena atleti e atlete aprono lo strumento e salvano un run, compaiono qui. Per farlo servono i permessi di contributor."], ["Noch kein Run gespeichert", "No run saved yet", "Aucun run enregistré", "Nessun run salvato"], ["gespeichert {d}", "saved {d}", "enregistré le {d}", "salvato il {d}"], ["zuletzt {d}", "last {d}", "dernier : {d}", "ultimo: {d}"], ["{n} gespeicherter Run", "{n} saved run", "{n} run enregistré", "{n} run salvato"], ["{n} gespeicherte Runs", "{n} saved runs", "{n} runs enregistrés", "{n} run salvati"], ["{n} Wettkampf", "{n} competition", "{n} compétition", "{n} competizione"], ["{n} Wettkämpfe", "{n} competitions", "{n} compétitions", "{n} competizioni"], ["Klicke einen Run an, um ihn im Detail zu prüfen.", "Click a run to check it in detail.", "Clique sur un run pour le vérifier en détail.", "Clicca su un run per controllarlo nel dettaglio."], ["Klicke einen Wettkampf an, um die Runs zu sehen.", "Click a competition to see the runs.", "Clique sur une compétition pour voir les runs.", "Clicca su una competizione per vedere i run."], ["{x} hat noch keinen Run gespeichert.", "{x} has not saved a run yet.", "{x} n'a pas encore enregistré de run.", "{x} non ha ancora salvato nessun run."], ["Feedback an {x}", "Feedback to {x}", "Feedback à {x}", "Feedback a {x}"], ["Letzter Run: {x}", "Last run: {x}", "Dernier run : {x}", "Ultimo run: {x}"], ["Gesendet am {d}. Der/die Athlet:in sieht es im eigenen Run.", "Sent on {d}. The athlete sees it in their run.", "Envoyé le {d}. L'athlète le voit dans son run.", "Inviato il {d}. L'atleta lo vede nel suo run."], ["Noch kein Feedback gesendet.", "No feedback sent yet.", "Aucun feedback envoyé pour l'instant.", "Nessun feedback inviato finora."], ["Noch nicht gesendet. Der/die Athlet:in sieht das Feedback erst nach dem Senden.", "Not sent yet. The athlete only sees the feedback after you send it.", "Pas encore envoyé. L'athlète ne voit le feedback qu'après l'envoi.", "Non ancora inviato. L'atleta vede il feedback solo dopo l'invio."], ["Sendet …", "Sending …", "Envoi …", "Invio …"], ["Senden fehlgeschlagen. Bitte versuche es erneut.", "Sending failed. Please try again.", "Échec de l'envoi. Réessaie.", "Invio non riuscito. Riprova."], ["Das prüft der Run-Check. Notwendige Kriterien müssen erfüllt sein, damit der Run komplett ist. Bonuskriterien erhöhen die Schwierigkeit und Variety.", "This is what the run check looks at. Required criteria must be met for the run to be complete. Bonus criteria add difficulty and variety.", "Voici ce que contrôle le Run-Check. Les critères obligatoires doivent être remplis pour que le run soit complet. Les critères bonus augmentent la difficulté et la variété.", "Questo è ciò che controlla il Run-Check. I criteri obbligatori devono essere soddisfatti perché il run sia completo. I criteri bonus aumentano difficoltà e varietà."]];
TR.push.apply(TR,[["Coach:in-Ansicht: Dieser Stand ist nur zum Ansehen. Athlet:innen bearbeiten ihre Runs selbst unter «Meine Runs».", "Coach view: this version is read-only. Athletes edit their runs themselves under “My runs”.", "Vue coach : cette version est en lecture seule. Les athlètes modifient eux-mêmes leurs runs sous « Mes runs ».", "Vista coach: questa versione è solo di lettura. Atleti e atlete modificano i propri run sotto «I miei run»."], ["Noch keine Athlet:innen. Sobald Athlet:innen einen Run für Coach:in speichern, erscheinen sie hier.", "No athletes yet. As soon as athletes save a run for the coach, they appear here.", "Pas encore d'athlètes. Dès que des athlètes enregistrent un run pour le coach, ils apparaissent ici.", "Ancora nessun/a atleta. Appena atleti e atlete salvano un run per il coach, compaiono qui."]]);
var LANG='de';try{var _l=localStorage.getItem('swissski-lang');if(_l&&['de','en','fr','it'].indexOf(_l)>=0)LANG=_l}catch(e){}
TR.push.apply(TR,[["Wichtiger Hinweis", "Important note", "Remarque importante", "Nota importante"], ["Die Kriterien sind Coach- und Athlet:innenempfehlungen auf Basis des FIS Judges Handbook (Weltcup-Niveau). An jedem Wettkampf können sie sich leicht unterscheiden oder anders gewichtet werden. Das Tool dient nur dazu, auf fehlende Punkte hinzuweisen. Es ist keine Garantie für eine gute Punktzahl, und es müssen nicht zwingend alle Punkte erfüllt werden.", "The criteria are recommendations from coaches and athletes based on the FIS Judges Handbook (World Cup level). They can differ slightly at each competition or be weighted differently. The tool is only meant to point out what is missing. It is no guarantee of a good score, and not all points necessarily have to be met.", "Les critères sont des recommandations de coachs et d'athlètes basées sur le FIS Judges Handbook (niveau Coupe du monde). Ils peuvent différer légèrement d'une compétition à l'autre ou être pondérés différemment. L'outil sert uniquement à signaler ce qui manque. Il ne garantit pas un bon score, et tous les points ne doivent pas forcément être remplis.", "I criteri sono raccomandazioni di coach e di atleti e atlete basate sul FIS Judges Handbook (livello Coppa del Mondo). A ogni gara possono differire leggermente o essere ponderati in modo diverso. Lo strumento serve solo a segnalare ciò che manca. Non garantisce un buon punteggio e non è necessario soddisfare per forza tutti i punti."]]);
TR.push.apply(TR,[["Landung und nächste Anfahrt passen zusammen", "Landing and next approach match", "La réception et l'approche suivante correspondent", "Atterraggio e successivo avvicinamento coincidono"], ["Wer Switch landet, fährt das nächste Feature ebenfalls Switch an (und umgekehrt). Alles andere ist in einem Slopestyle-Run nicht erlaubt.", "If you land switch, you also approach the next feature switch (and the other way round). Anything else is not allowed in a slopestyle run.", "Si tu te réceptionnes en switch, tu abordes aussi le feature suivant en switch (et inversement). Tout autre cas n'est pas autorisé dans un run de slopestyle.", "Se atterri switch, affronti anche il feature successivo switch (e viceversa). Qualsiasi altra combinazione non è consentita in un run di slopestyle."], ["{a} landet {x}, aber {b} wird {y} angefahren.", "{a} lands {x}, but {b} is approached {y}.", "{a} se réceptionne en {x}, mais {b} est abordé en {y}.", "{a} atterra {x}, ma {b} viene affrontato {y}."], ["Fehler: Anfahrt passt nicht zur Landung von {x}", "Error: approach does not match the landing of {x}", "Erreur : l'approche ne correspond pas à la réception de {x}", "Errore: l'avvicinamento non coincide con l'atterraggio di {x}"], ["Anfahrt (optional, wenn kein Spin rein)", "Approach (optional, if no spin in)", "Approche (optionnel, si pas de spin d'entrée)", "Avvicinamento (opzionale, se nessuno spin in ingresso)"]]);
TR.push.apply(TR,[["Gesamtrichtung: {x}", "Overall direction: {x}", "Direction globale : {x}", "Direzione complessiva: {x}"]]);
TR.push.apply(TR,[["Verschiedene Gesamtrichtungen auf den Rails", "Different overall directions on the rails", "Directions globales différentes sur les rails", "Direzioni complessive diverse sui rail"], ["Bei 2 Rails: mindestens ein Rail mit Gesamtrichtung Right oder Switch Right und ein Rail mit Left oder Switch Left (einmal nach rechts und einmal nach links gedreht). Bei 3 oder 4 Rails: Jedes Rail hat eine andere Gesamtrichtung (Left, Right, Switch Left, Switch Right), zum Beispiel Switch Right, Switch Left, Right.", "With 2 rails: at least one rail with overall direction Right or Switch Right and one rail with Left or Switch Left (spun to the right once and to the left once). With 3 or 4 rails: every rail has a different overall direction (Left, Right, Switch Left, Switch Right), for example Switch Right, Switch Left, Right.", "Avec 2 rails : au moins un rail avec la direction globale Right ou Switch Right et un rail avec Left ou Switch Left (une fois tourné vers la droite et une fois vers la gauche). Avec 3 ou 4 rails : chaque rail a une direction globale différente (Left, Right, Switch Left, Switch Right), par exemple Switch Right, Switch Left, Right.", "Con 2 rail: almeno un rail con direzione complessiva Right o Switch Right e un rail con Left o Switch Left (una volta ruotato a destra e una a sinistra). Con 3 o 4 rail: ogni rail ha una direzione complessiva diversa (Left, Right, Switch Left, Switch Right), ad esempio Switch Right, Switch Left, Right."], ["Es fehlt ein Rail mit Gesamtrichtung Left oder Switch Left.", "A rail with overall direction Left or Switch Left is missing.", "Il manque un rail avec la direction globale Left ou Switch Left.", "Manca un rail con direzione complessiva Left o Switch Left."], ["Es fehlt ein Rail mit Gesamtrichtung Right oder Switch Right.", "A rail with overall direction Right or Switch Right is missing.", "Il manque un rail avec la direction globale Right ou Switch Right.", "Manca un rail con direzione complessiva Right o Switch Right."], ["{list} haben dieselbe Gesamtrichtung ({x}).", "{list} have the same overall direction ({x}).", "{list} ont la même direction globale ({x}).", "{list} hanno la stessa direzione complessiva ({x})."], ["Noch nicht verwendet: {list}.", "Not used yet: {list}.", "Pas encore utilisé : {list}.", "Non ancora usate: {list}."]]);
TR.push.apply(TR,[["Coach:in", "Coach", "Coach", "Coach"]]);
TR.push.apply(TR,[["Einfahrt-Variante (optional, auch zwei kombinierbar)", "Entry variation (optional, two can be combined)", "Variante d'entrée (optionnel, deux combinables)", "Variante d'ingresso (opzionale, anche due combinabili)"]]);
var DICT={en:{},fr:{},it:{}};TR.forEach(function(r){DICT.en[r[0]]=r[1];DICT.fr[r[0]]=r[2];DICT.it[r[0]]=r[3]});
var LOC={de:'de-CH',en:'en-GB',fr:'fr-CH',it:'it-CH'};
function _(k,v){var s=(LANG!=='de'&&DICT[LANG][k])||k;if(v)s=s.replace(/\{(\w+)\}/g,function(m,n){return v[n]!=null?v[n]:m});return s}
function trNode(root){
  if(!root)return;
  var w=document.createTreeWalker(root,NodeFilter.SHOW_TEXT,null),n,list=[];
  while(n=w.nextNode()){var p=n.parentNode&&n.parentNode.nodeName;if(p==='TEXTAREA'||p==='SCRIPT'||p==='STYLE')continue;list.push(n)}
  list.forEach(function(n){var o=n.__de;if(o===undefined){o=n.__de=n.nodeValue}var t=o.trim();if(!t)return;var tr=LANG==='de'?null:DICT[LANG][t];n.nodeValue=tr!=null?o.replace(t,function(){return tr}):o});
  var els=[root].concat(Array.prototype.slice.call(root.querySelectorAll('[placeholder],[aria-label],[title]')));
  els.forEach(function(el){['placeholder','aria-label','title'].forEach(function(a){if(el.hasAttribute&&el.hasAttribute(a)){var k='__de_'+a;if(el[k]===undefined)el[k]=el.getAttribute(a);var tr=LANG==='de'?null:DICT[LANG][el[k]];el.setAttribute(a,tr!=null?tr:el[k])}})})}
function renderLang(){var el=$('#rc-langsw');if(el)el.innerHTML=['de','en','fr','it'].map(function(l){return '<button class="rbtn'+(LANG===l?' on':'')+'" data-act="lang" data-v="'+l+'" lang="'+l+'">'+l.toUpperCase()+'</button>'}).join('')}
function trHeader(){trNode($('.rc-hd'));trNode($('nav.tabs'))}

var newId=function(){return Math.random().toString(36).slice(2,8)+Date.now().toString(36).slice(-4)};

/* ---------- Katalog (hier lassen sich Begriffe und Regeln anpassen) ---------- */
var DEGS=[0,180,360,540,720,900,1080,1260,1440,1620,1800,1980,2160,2340];
var AX={cork:'Cork',bio:'Bio / Misty',flatspin:'Flatspin',flat:'Flat'};
var GR={safety:'Safety',rsafety:'Rev Safety',mute:'Mute',rmute:'Rev Mute',blunt:'Blunt',rtail:'Rev Tail',stale:'Stale / Cuban',rstale:'Rev Stale / Cuban',japan:'Japan',rjapan:'Rev Japan',djapan:'Double Japan',nose:'Nose',truck:'Truckdriver',guitar:'Guitar',esco:'Esco',bow:'Bow & Arrow',inout:'In-N-Out',seaman:'Screamin\' Seaman',buick:'Buick',octo:'Octo',none:'Kein Grab'};
var FL={0:'Kein Flip',1:'Single Flip',2:'Double Flip',3:'Triple Flip',4:'Quadruple Flip'};
var SUL={fs:'Frontside Swap',fs360:'Frontside 360 Swap',bs:'Backside Swap',bs360:'Backside 360 Swap'};
var HD=function(v){return _(v==='L'?'Linke Hand':v==='R'?'Rechte Hand':'Beide Hände')};
function suArr(x){return Array.isArray(x.su)?x.su:[]}
function turned(x){
  var u=suArr(x),d=spinOn(x)&&x.on?x.on.slice(-1):null;
  var a=!!(d&&spinOff(x)&&x.rd&&d!==x.rd);
  var sw=stanceIn(x)==='S';
  var b=!!(spinOn(x)&&(x.od===90||x.od===450)&&u.length&&((!sw&&u[0][0]==='f')||(sw&&u[0][0]==='b')));
  var c=false;for(var i=0;i+1<u.length;i++){if((u[i]==='fs'&&u[i+1]==='fs')||(u[i]==='bs'&&u[i+1]==='bs'))c=true}
  return a||b||c}
var HN={L:'linke Hand',R:'rechte Hand',B:'beide Hände'};
var TO={std:'Standard',nbutter:'Nose Butter',tbutter:'Tail Butter',tokyo:'Tokyo Drift',blender:'Blender'};
var FEAT={down:'Down',flat:'Flat',fdown:'Flat-Down',up:'Up-Flat',updown:'Up-Down',kink:'Kink',dkink:'Double Kink',rainbow:'Rainbow',crail:'C-Rail',cannon:'Cannon Rail',transfer:'Transfer Rail',gap:'Gap Rail',box:'Box',wall:'Wallride'};
var ENT={lip:'Lip',nbutter:'Nosebutter',slip:'Switch Lip',stail:'Switch Tails',tbutter:'Tailbutter'};
function entArr(x){return Array.isArray(x.ent)?x.ent:(x.ent?[x.ent]:[])}
function entOpts(on){return (on==='L'||on==='R')?['lip','nbutter']:(on==='SL'||on==='SR')?['slip','stail','tbutter']:[]}
var SLD={slide:'Normal Slide',s5050:'50-50',back:'Backslide',front:'Frontslide / Fastslide'};
var DISC={ss:{name:'Slopestyle',sub:'Rails und Jumps',tpl:[['r',3],['j',3]],lim:{r:[0,5],j:[0,4]},jn:'Jump',jp:'J',jg:'Jumps'}};
var DL=function(v){return v==='L'?'Links':'Rechts'};
var FT=function(v){return _(v==='L'?'Linker Fuss':'Rechter Fuss')};
var DIRN={L:'Left',R:'Right',SL:'Switch Left',SR:'Switch Right'};
function landing(x){return (x.deg/180)%2===1?(x.st==='R'?'S':'R'):x.st}
function railSide(x){
  var inDir=(spinOn(x)&&x.on)?x.on.slice(-1):null,inDeg=x.od||0;
  if(inDir&&inDeg>0&&(stanceIn(x)==='S'||inDeg>90))return inDir;
  var L=0,R=0;
  if(inDir){if(inDir==='L')L+=inDeg;else R+=inDeg}
  if(x.ft){var ft=x.ft;suArr(x).forEach(function(k){var w=(k==='fs360'||k==='bs360')?360:180,fr=k[0]==='f';var left=(ft==='L')?fr:!fr;if(left)L+=w;else R+=w;if(k==='fs'||k==='bs')ft=(ft==='L')?'R':'L'})}
  if(spinOff(x)&&x.rd){var w2=x.fd||0;if(x.rd==='L')L+=w2;else R+=w2}
  if(L===0&&R===0)return null;
  if(L===R)return inDir||((spinOff(x)&&x.rd)?x.rd:null);
  return L>R?'L':'R'}
function railCombo(x){var s=railSide(x);if(!s)return null;return (stanceIn(x)==='S'?'S':'')+s}
function stanceIn(x){if(x.t==='r'){if(x.on==='SL'||x.on==='SR')return 'S';if(x.on==='L'||x.on==='R')return 'R';return x.ap||null}return x.st||null}
function stanceOut(x){if(x.t==='r')return x.ld||null;return (x.deg!=null&&x.st)?landing(x):null}
function stanceConf(run){var lb=labelsOf(run),sh=shortsOf(run),o=[];for(var i=0;i+1<run.items.length;i++){var a=stanceOut(run.items[i]),b=stanceIn(run.items[i+1]);if(a&&b&&a!==b)o.push({i:i,a:lb[i],b:lb[i+1],x:a==='S'?'Switch':'Forward',y:b==='S'?'Switch':'Forward',sa:sh[i],sb:sh[i+1]})}return o}
var CONF=[];
function spinOn(x){return x.on&&x.on!=='0'}
function offArr(x){return Array.isArray(x.off)?x.off:(x.off?[x.off]:[])}
function spinOff(x){return offArr(x).some(function(k){return k!=='0'})}
function isFilled(x){
  if(x.t==='r') return !!(x.ft&&x.f&&x.on&&(x.on==='0'||x.od!=null)&&x.sl&&offArr(x).length>0&&(!spinOff(x)||(x.fd&&x.rd))&&(!x.rg||x.rg==='none'||x.rh)&&x.ld);
  return !!(x.st&&x.deg!=null&&(x.deg===0||x.dir==='L'||x.dir==='R')&&x.ax&&x.gr&&(x.gr==='none'||x.hd));
}
function blank(t){return t==='r'?{t:'r',ft:null,f:null,on:null,od:null,sl:null,off:[],fd:null,flow:null,rd:null,rg:null,rh:null,ld:null,su:[],sp:''}:{t:'j',st:null,dir:null,deg:null,ax:null,gr:null,hd:null,fl:0,to:'std',bb:'n',sp:''}}
function template(){var o=[];DISC.ss.tpl.forEach(function(p){for(var i=0;i<p[1];i++)o.push(blank(p[0]))});return o}
function labelsOf(run){var rn=0,jn=0;return run.items.map(function(x){return x.t==='r'?'Rail '+(++rn):'Jump '+(++jn)})}
function shortsOf(run){var rn=0,jn=0;return run.items.map(function(x){return x.t==='r'?'R'+(++rn):'J'+(++jn)})}

/* ---------- Kriterien ---------- */
function dirCombo(st,dir){return (st==='S'?'S':'')+dir}
function grabList(c){var o=[];c.J.forEach(function(x){if(x.gr&&x.gr!=='none'&&x.hd)o.push({gr:x.gr,hd:x.hd})});c.R.forEach(function(x){if(x.rg&&x.rg!=='none'&&x.rh)o.push({gr:x.rg,hd:x.rh})});return o}
function swapNormal(x){return suArr(x).some(function(k){return k==='fs'||k==='bs'})}
var CR={ss:[
 {id:'stance',req:1,err:1,g:'b',app:function(c){return c.conf.length>0},label:'Landung und nächste Anfahrt passen zusammen',desc:'Wer Switch landet, fährt das nächste Feature ebenfalls Switch an (und umgekehrt). Alles andere ist in einem Slopestyle-Run nicht erlaubt.',
  fn:function(c){return {ok:false,have:[],miss:[],hint:c.conf.map(function(x){return _('{a} landet {x}, aber {b} wird {y} angefahren.',{a:x.a,x:x.x,b:x.b,y:x.y})}).join(' ')}}},
 {id:'foot',req:1,g:'r',app:function(c){return c.nR>=2},label:'Linker und rechter Fuss vorne auf dem Rail',desc:'Mindestens einmal linker Fuss vorne und einmal rechter Fuss vorne auf einem Rail. Ein normaler Swap (Frontside oder Backside, kein 360 Swap) auf einem Rail zählt als beide Füsse vorne. Gilt ab 2 Rails.',
  fn:function(c){var h=uniq(c.R.map(function(x){return x.ft}).filter(Boolean));var m=['L','R'].filter(function(v){return h.indexOf(v)<0});var sw=c.R.some(swapNormal);
    return {ok:!m.length||sw,have:h.map(FT).concat(sw&&m.length?[_('Beide Füsse durch Swap')]:[]),miss:sw?[]:m.map(FT),hint:(m.length&&!sw)?_(m[0]==='L'?'Es fehlt ein Rail mit linkem Fuss vorne.':'Es fehlt ein Rail mit rechtem Fuss vorne.'):''}}},
 {id:'rdirs',req:1,g:'r',app:function(c){return c.nR>=2},label:'Verschiedene Gesamtrichtungen auf den Rails',desc:'Bei 2 Rails: mindestens ein Rail mit Gesamtrichtung Right oder Switch Right und ein Rail mit Left oder Switch Left (einmal nach rechts und einmal nach links gedreht). Bei 3 oder 4 Rails: Jedes Rail hat eine andere Gesamtrichtung (Left, Right, Switch Left, Switch Right), zum Beispiel Switch Right, Switch Left, Right.',
  fn:function(c){var cm=c.R.map(railCombo).filter(Boolean),u=uniq(cm),all=['L','R','SL','SR'];
    if(c.nR===2){var sd=uniq(cm.map(function(k){return k.slice(-1)})),m=['L','R'].filter(function(v){return sd.indexOf(v)<0});
      return {ok:!m.length,have:u.map(function(k){return DIRN[k]}),miss:m.map(function(v){return v==='L'?'Left / Switch Left':'Right / Switch Right'}),hint:m.length?_(m[0]==='L'?'Es fehlt ein Rail mit Gesamtrichtung Left oder Switch Left.':'Es fehlt ein Rail mit Gesamtrichtung Right oder Switch Right.'):''}}
    var need=Math.min(c.nR,4),dups=[];
    u.forEach(function(k){var l=c.R.filter(function(x){return railCombo(x)===k}).map(function(x){return x.s});if(l.length>1)dups.push(_('{list} haben dieselbe Gesamtrichtung ({x}).',{list:l.join(', '),x:DIRN[k]}))});
    var unused=all.filter(function(k){return u.indexOf(k)<0}).map(function(k){return DIRN[k]});
    return {ok:u.length>=need,have:u.map(function(k){return DIRN[k]}),miss:[],count:[Math.min(u.length,need),need],hint:u.length>=need?'':dups.concat([_('Noch nicht verwendet: {list}.',{list:unused.join(', ')})]).join(' ')}}},
 {id:'pretzel',req:1,g:'r',app:function(c){return c.nR>=1},label:'Pretzel auf Rails',desc:'Mindestens ein Pretzel (Richtungswechsel) auf mindestens einem Rail. Ein Pretzel entsteht, wenn (1) Spin rein und Spin raus in verschiedene Richtungen gehen, (2) nach Left oder Right mit 90 oder 450 rein ein Frontside Swap oder Frontside 360 Swap folgt, bzw. nach Switch Left oder Switch Right mit 90 oder 450 rein ein Backside Swap oder Backside 360 Swap, oder (3) zwei normale Swaps derselben Art direkt nacheinander folgen (zweimal Frontside oder zweimal Backside, keine 360 Swaps). Frontside gefolgt von Backside (oder umgekehrt) ist kein Pretzel.',
  fn:function(c){var r=c.R.filter(turned).map(function(x){return x.s});
    return {ok:r.length>0,have:r.length?[_('Pretzel auf {list}',{list:r.join(', ')})]:[],miss:[],hint:r.length?'':_('Es fehlt ein Pretzel. Wähle bei einem Rail Spin rein und Spin raus in verschiedene Richtungen, mache nach 90 oder 450 rein den passenden Swap, oder füge zwei gleiche Swaps direkt nacheinander hinzu.')}}},
 {id:'axis',req:1,g:'j',app:function(c){return c.nJ>=2||(c.nJ>=1&&c.nR>=1)},label:'Mindestens 2 verschiedene Achsen auf dem ganzen Kurs',desc:'Mindestens 2 verschiedene Achsen, zum Beispiel Cork und Bio / Misty. Es zählen die Achsen der Jumps (Flat, Flatspin, Cork, Bio / Misty) und ein Spin raus vom Rail mit Cork oder Bio / Misty. Gerade beim Spin raus zählt nicht. Gilt ab 2 Features mit Achse.',
  fn:function(c){var h=c.J.filter(function(x){return x.ax}).map(function(x){return x.ax});
    c.R.forEach(function(x){var o=offArr(x);if(o.indexOf('C')>=0)h.push('cork');if(o.indexOf('M')>=0)h.push('bio')});h=uniq(h);
    return {ok:h.length>=2,have:h.map(function(a){return AX[a]}),miss:[],count:[Math.min(h.length,2),2],hint:h.length<2?_('Es fehlt eine weitere Achse, zum Beispiel {x}.',{x:(h.indexOf('bio')<0?'Bio / Misty':'Cork')}):''}}},
 {id:'dirs',req:1,g:'j',app:function(c){return c.nJ>=2},label:'Alle 4 Drehrichtungen (Left, Right, Switch Left, Switch Right)',desc:'Bei 4 Jumps kommen alle 4 Drehrichtungen auf den Jumps vor. Bei nur 3 Jumps sind es 3 verschiedene Drehrichtungen auf den Jumps, und die übrige Richtung wird irgendwo auf einem Rail gemacht. Die Gesamtrichtung eines Rails ist die Richtung des Spins rein. Ausnahme: Bei Anfahrt vorwärts (Forward) mit nur 90 Grad rein zählt die gesamte Drehung (Spin rein, Swaps und Spin raus). Bei Switch-Anfahrt zählt der Spin rein immer, auch bei 90 Grad. Bei den Swaps wechselt der Fuss vorne nach jedem normalen Swap (kein 360 Swap), das bestimmt die Richtung des nächsten Swaps.',
  fn:function(c){var all=['L','R','SL','SR'];
    var jc=uniq(c.J.filter(function(x){return x.deg>0&&x.st&&(x.dir==='L'||x.dir==='R')}).map(function(x){return dirCombo(x.st,x.dir)}));
    var rc=uniq(c.R.map(railCombo).filter(Boolean));
    var have=jc.map(function(k){return DIRN[k]}),miss=[],ok,hint='';
    if(c.nJ>=4){miss=all.filter(function(k){return jc.indexOf(k)<0}).map(function(k){return DIRN[k]});ok=!miss.length;if(!ok)hint=_('Es fehlt auf den Jumps: {list}.',{list:miss.join(', ')})}
    else if(c.nJ<3){ok=jc.length>=c.nJ;if(!ok){miss=[_('Verschiedene Drehrichtungen')];hint=_('Es fehlen verschiedene Drehrichtungen (Left, Right, Switch Left, Switch Right).')}}
    else{var left=all.filter(function(k){return jc.indexOf(k)<0});
      if(jc.length<3){ok=false;miss=left.map(function(k){return DIRN[k]});hint=_('Es fehlt: {list}.',{list:miss.join(', ')})}
      else{var r=left[0],onR=rc.indexOf(r)>=0;ok=onR;if(onR)have.push(DIRN[r]);else{miss=[DIRN[r]];hint=_('Es fehlt: {list}.',{list:DIRN[r]})}}}
    return {ok:ok,have:have,miss:miss,hint:hint}}},
 {id:'grab',req:1,g:'j',app:function(c){return c.nJ>=2},label:'Verschiedene Grabs',desc:'Mindestens 3 verschiedene Grabs. Grabs nach dem Rail (Spin raus) zählen mit. Derselbe Grab mit linker und mit rechter Hand zählt als zwei verschiedene Grabs, ebenso mit beiden Händen. «Kein Grab» zählt nicht.',
  fn:function(c){var n=Math.min(3,c.nJ);var h=uniq(grabList(c).map(function(x){return x.gr+'|'+x.hd}));
    return {ok:h.length>=n,have:h.map(function(g){var p=g.split('|');return (GR[p[0]]||p[0])+' ('+_(HN[p[1]])+')'}),miss:[],count:[Math.min(h.length,n),n],hint:h.length<n?_('Noch {n} weitere(r) Grab nötig.',{n:n-h.length}):''}}},
 {id:'hand',req:1,g:'j',app:function(c){return c.nJ>=2},label:'Grabs mit beiden Händen',desc:'Mindestens ein Grab mit der linken und eines mit der rechten Hand, nicht immer dieselbe Hand. Grabs nach dem Rail zählen mit. Ein Grab mit beiden Händen zusammen deckt beide Seiten ab.',
  fn:function(c){var h=uniq(grabList(c).map(function(x){return x.hd}));var m=['L','R'].filter(function(v){return h.indexOf(v)<0&&h.indexOf('B')<0});
    return {ok:!m.length,have:h.map(HD),miss:m.map(HD),hint:m.length?_(m[0]==='L'?'Es fehlt ein Grab mit der linken Hand (oder mit beiden Händen).':'Es fehlt ein Grab mit der rechten Hand (oder mit beiden Händen).'):''}}},
 {id:'bb',req:0,g:'j',app:function(c){return c.nJ>=1},label:'Bringback/Hold-Trick',desc:'Mindestens ein Jump mit Bringback/Hold.',
  fn:function(c){var n=c.J.filter(function(x){return x.bb==='y'}).length;return {ok:n>0,have:n?['Bringback/Hold × '+n]:[],miss:[],hint:n?'':_('Markiere bei einem Jump «Bringback/Hold».')}}},
 {id:'to',req:0,g:'j',app:function(c){return c.nJ>=1},label:'Andere Take-off-Variante',desc:'Mindestens ein Jump mit anderem Take-off, zum Beispiel Nose Butter, Tail Butter, Tokyo Drift oder Blender.',
  fn:function(c){var h=uniq(c.J.filter(function(x){return x.to&&x.to!=='std'}).map(function(x){return x.to}));return {ok:h.length>0,have:h.map(function(k){return TO[k]}),miss:[],hint:h.length?'':_('Wähle bei einem Jump einen besonderen Take-off.')}}}
]};
var GN=function(d,g){return g==='r'?'Rails':'Jumps'};

function evaluate(run){
  var d='ss',lb=labelsOf(run),sh=shortsOf(run);
  var its=run.items.map(function(x,i){var o=Object.assign({},x);o.F=isFilled(x,d);o.lbl=lb[i];o.s=sh[i];return o});
  var J=its.filter(function(x){return x.t==='j'}),R=its.filter(function(x){return x.t==='r'});
  var c={J:J,R:R,conf:stanceConf(run),nJ:J.length,nR:R.length,lastJ:J[J.length-1]};
  var filled=its.filter(function(x){return x.F}).length,open=its.filter(function(x){return !x.F}).map(function(x){return x.lbl});
  var base={id:'fill',req:1,g:'b',label:'Alle Elemente ausgefüllt',desc:'Jedes Element ist vollständig eingetragen.',ok:filled===its.length,have:[],miss:[],count:[filled,its.length],
    hint:open.length?_('Noch offen: {list}.',{list:open.join(', ')}):''};
  var defs=CR[d].filter(function(df){return !df.app||df.app(c)}),skipped=CR[d].filter(function(df){return df.app&&!df.err&&!df.app(c)}).map(function(df){return df.label});
  var list=[base].concat(defs.map(function(df){var r=df.fn(c);return Object.assign({},df,r)}));
  var req=list.filter(function(x){return x.req}),pl=list.filter(function(x){return !x.req});
  var reqOk=req.filter(function(x){return x.ok}).length,plOk=pl.filter(function(x){return x.ok}).length;
  var complete=reqOk===req.length;
  var pct=Math.round(100*reqOk/req.length);if(!complete)pct=Math.min(pct,99);
  return {list:list,req:req.length,reqOk:reqOk,pl:pl.length,plOk:plOk,filled:filled,total:its.length,complete:complete,pct:pct,skipped:skipped,openN:req.length-reqOk};
}


/* ---------- Zustand ---------- */
// Athlet:innen und Coaches kommen aus dem Login der App (ATHLETE_NAME, IS_ADMIN in kern.js).
var S={runName:'',evSel:'',evNew:'',eSel:null,draft:{},delArm:null,course:[],tab:'runs',runs:[],cur:null,athlete:null,coach:false,sync:'',
  loading:false,loaded:false,shut:{},dirty:{},ath:[],aSel:null,rSel:null,timer:null,wq:Promise.resolve()};
function vis(){return S.runs.filter(function(r){return !r.del})}
function pubState(r){if(!r.pub)return 'none';return JSON.stringify([r.name||'',r.event||'',r.items])===JSON.stringify([r.pub.name||'',r.pub.event||'',r.pub.items])?'saved':'dirty'}
function pubRun(r){return Object.assign({},r,{name:r.pub.name,event:r.pub.event,items:r.pub.items,upd:r.pub.at})}
function curRun(){return vis().find(function(r){return r.id===S.cur})||null}
function newRun(course){return {id:newId(),name:'Slopestyle Run',event:'',disc:'ss',upd:Date.now(),items:(course||['r','r','r','j','j','j']).map(function(t){return blank(t)})}}
function courseCheck(c){var r=c.filter(function(t){return t==='r'}).length,j=c.length-r,L=DISC.ss.lim;
  if(!c.length)return _('Wähle mindestens ein Feature.');
  if(r<L.r[0])return _('Mindestens {n} Rails nötig.',{n:L.r[0]});if(r>L.r[1])return _('Höchstens {n} Rails.',{n:L.r[1]});
  if(j<L.j[0])return _('Mindestens {n} Jumps nötig.',{n:L.j[0]});if(j>L.j[1])return _('Höchstens {n} Jumps.',{n:L.j[1]});return ''}

/* ---------- Speichern (Supabase, Tabelle run_checks) ---------- */
function setSync(s){S.sync=s;var el=$('#rc-sync');if(el){el.className='sync '+s;el.innerHTML='<b></b>'+syncText();trNode(el)}}
function syncText(){return {saved:'Entwurf gesichert',saving:'Sichert …',error:'Speichern fehlgeschlagen'}[S.sync]||'Verbunden'}
function touch(run){run.upd=Date.now();S.dirty[run.id]=1;setSync('saving');clearTimeout(S.timer);S.timer=setTimeout(function(){S.wq=S.wq.then(flush)},700)}
function rowOf(r){return {id:r.id,athlet:S.athlete,draft:{name:r.name||'',event:r.event||'',disc:r.disc||'ss',items:r.items,upd:r.upd||Date.now()},pub:r.pub||null,deleted:!!r.del}}
function flush(){
  var ids=Object.keys(S.dirty);S.dirty={};if(!ids.length||!S.athlete)return Promise.resolve();
  var rows=ids.map(function(id){return S.runs.find(function(x){return x.id===id})}).filter(Boolean).map(rowOf);
  if(!rows.length)return Promise.resolve();
  return db.from('run_checks').upsert(rows,{onConflict:'id'}).then(function(res){if(res.error)throw res.error;setSync('saved')})
    .catch(function(e){console.error('Run-Check:',e);ids.forEach(function(id){S.dirty[id]=1});setSync('error')})}
function runOf(row){var d=row.draft||{};
  return {id:row.id,name:d.name||'',event:d.event||'',disc:d.disc||'ss',items:Array.isArray(d.items)?d.items:[],upd:d.upd||Date.parse(row.updated_at)||0,
    pub:row.pub||undefined,coachNote:row.coach_note||'',coachTs:row.coach_ts?Date.parse(row.coach_ts):null}}
function loadData(){
  if(S.athlete){
    if(Object.keys(S.dirty).length)return Promise.resolve();   // ungespeicherte Aenderungen nicht ueberschreiben
    return db.from('run_checks').select('id,draft,pub,coach_note,coach_ts,updated_at').eq('deleted',false).then(function(res){
      if(res.error)throw res.error;
      S.runs=res.data.map(runOf);if(!curRun()){var v=vis().slice().sort(function(a,b){return b.upd-a.upd});S.cur=v.length?v[0].id:null}
      if(!S.sync)S.sync='saved'}).catch(function(e){console.error('Run-Check:',e);setSync('error')})}
  // Coaches: nur fuer Coach:in gespeicherte Runs, gefiltert nach der Gruppe oben rechts
  var keep=GROUP_FILTER==='all'?null:CFG.athletes.map(function(a){return a.name});
  return db.from('run_checks').select('id,athlet,pub,coach_note,coach_ts,updated_at').eq('deleted',false).not('pub','is',null).then(function(res){
    if(res.error)throw res.error;var by={};
    res.data.forEach(function(row){if(keep&&keep.indexOf(row.athlet)<0)return;
      var a=by[row.athlet]||(by[row.athlet]={uid:row.athlet,name:row.athlet,runs:{}});a.runs[row.id]=runOf(row)});
    S.ath=Object.keys(by).map(function(k){return by[k]})})
    .catch(function(e){console.error('Run-Check:',e);setSync('error')})}

/* ---------- Darstellung: Run-Karten ---------- */
function pills(f,i,opts,cur,ro,num){return '<div class="opts">'+opts.map(function(o){
  return '<button class="pill'+(String(cur)===String(o[0])?' on':'')+'" data-act="set" data-i="'+i+'" data-f="'+f+'" data-v="'+o[0]+'"'+(num?' data-n="1"':'')+(ro?' disabled':'')+'>'+esc(o[1])+'</button>'}).join('')+'</div>'}
function fld(label,html){return '<div class="fld"><div class="k">'+label+'</div>'+html+'</div>'}
function objOpts(o){return Object.keys(o).map(function(k){return [k,o[k]]})}
function summary(x){
  if(x.t==='r'){var t=[];if(x.f)t.push(FEAT[x.f]);
    var tn={F:'Frontside',B:'Backside',C:'Cork',M:'Bio / Misty'};
    var on=x.on?(x.on==='0'?_('Gerade rein'):DIRN[x.on]+(x.od?' '+x.od:'')+' '+_('rein')):'';
    var oa=offArr(x),off=oa.length?(oa.map(function(k){return k==='0'?_('Gerade'):tn[k]}).join(' + ')+(spinOff(x)?(x.fd?' '+x.fd:'')+(x.rd?' '+DIRN[x.rd]:''):'')+' '+_('raus')):'';
    var tg=[];var rcmb=railCombo(x);if(rcmb)tg.push(_('Gesamtrichtung: {x}',{x:DIRN[rcmb]}));
    if(x.ft)tg.push(_('{x} vorne',{x:FT(x.ft)}));
    if(turned(x))tg.push('Pretzel');
    if(x.sp)tg.push(_('Spezielles: {x}',{x:x.sp}));
    if(x.ld)tg.push(x.ld==='S'?_('Switch-Landung'):_('Forward-Landung'));
    return {title:[t.join(' · '),entOpts(x.on).filter(function(k){return entArr(x).indexOf(k)>=0}).map(function(k){return ENT[k]}).join(' + '),on,(x.sl&&x.sl!=='slide'?(SLD[x.sl]||x.sl):''),suArr(x).map(function(k){return SUL[k]}).join(' → '),off,(x.rg&&x.rg!=='none'?'Grab '+(GR[x.rg]||x.rg)+(x.rh?' ('+_(HN[x.rh])+')':''):'')].filter(Boolean).join(' · '),tags:tg}}
  var parts=[];
  if(x.deg>0&&(x.dir==='L'||x.dir==='R')&&x.st)parts.push(DIRN[dirCombo(x.st,x.dir)]);else if(x.st==='S')parts.push('Switch');
  var fw=x.fl?['','Single','Double','Triple','Quadruple'][x.fl]:'';
  if(x.ax)parts.push(x.ax==='flat'?(fw?fw+' Flip':'Flat'):(fw?fw+' ':'')+AX[x.ax]);else if(fw)parts.push(fw+' Flip');
  if(x.deg!=null)parts.push(x.deg===0?'Straight':String(x.deg));
  var tg2=[];if(x.gr)tg2.push(x.gr==='none'?_('Kein Grab'):(GR[x.gr]||x.gr)+(x.hd?' ('+_(HN[x.hd])+')':''));
  if(x.deg!=null&&x.st)tg2.push(_('Landung {x}',{x:(landing(x)==='S'?'Switch':'Forward')}));
  if(x.to&&x.to!=='std')tg2.push(TO[x.to]);
  if(x.bb==='y')tg2.push('Bringback/Hold');
  if(x.sp)tg2.push(_('Spezielles: {x}',{x:x.sp}));
  return {title:parts.join(' '),tags:tg2}}
function itemCard(run,x,i,ro,lbl,sh){
  var s=summary(x);var ce=CONF.filter(function(c){return c.i+1===i})[0];if(ce)s.tags.push({err:_('Fehler: Anfahrt passt nicht zur Landung von {x}',{x:ce.a})});
  var isR=x.t==='r',ac=isR?'var(--blue)':'var(--purp)';
  var key=(ro?'c:':'')+run.id+':'+i,shut=!!S.shut[key];
  var h='<div class="card item'+(shut?' shut':'')+'" style="--ac:'+ac+'" data-key="'+key+'"><div class="item-hd" data-act="fold" data-key="'+key+'" role="button" tabindex="0" aria-expanded="'+(!shut)+'">'+
   '<span class="item-no">'+sh+'</span><div class="item-t"><h4'+(s.title?'':' class="empty"')+'>'+(s.title?esc(s.title):esc(lbl)+' '+_('noch leer'))+'</h4>'+
   (s.tags.length?'<div class="tags">'+s.tags.map(function(t){return typeof t==='object'?'<span class="tg err" style="--ac:var(--red)">'+esc(t.err)+'</span>':'<span class="tg">'+esc(t)+'</span>'}).join('')+'</div>':'')+'</div>'+
   (isFilled(x)?'<span class="chip ok" style="padding:2px 8px">Komplett</span>':'')+'<span class="chev">▼</span></div><div class="item-bd">';
  if(isR){
    h+=fld('Feature',pills('f',i,objOpts(FEAT),x.f,ro));
    h+=fld('Spin rein aufs Feature',pills('on',i,[['0','Kein Spin'],['L','Left'],['R','Right'],['SL','Switch Left'],['SR','Switch Right']],x.on,ro));
    if(entOpts(x.on).length)h+=fld('Einfahrt-Variante (optional, auch zwei kombinierbar)','<div class="opts">'+entOpts(x.on).map(function(k){return '<button class="pill'+(entArr(x).indexOf(k)>=0?' on':'')+'" data-act="ent-tog" data-i="'+i+'" data-v="'+k+'"'+(ro?' disabled':'')+'>'+ENT[k]+'</button>'}).join('')+'</div>');
    if(x.on==='0')h+=fld('Anfahrt (optional, wenn kein Spin rein)',pills('ap',i,[['R','Forward'],['S','Switch']],x.ap,ro));
    if(spinOn(x))h+=fld('Rotation rein',pills('od',i,[[0,'0'],[90,'90'],[270,'270'],[450,'450'],[630,'630'],[810,'810']],x.od,ro,1));
    h+=fld('Slide',pills('sl',i,objOpts(SLD),x.sl,ro));
    h+=fld('Fuss vorne',pills('ft',i,[['L','Links'],['R','Rechts']],x.ft,ro));
    var sq=suArr(x);
    h+=fld('Swaps auf dem Rail (optional, mehrere nacheinander möglich)','<div class="opts">'+Object.keys(SUL).map(function(k){return '<button class="pill" data-act="su-add" data-i="'+i+'" data-v="'+k+'"'+(ro?' disabled':'')+'>+ '+SUL[k]+'</button>'}).join('')+'</div>'+
      (sq.length?'<div class="tags" style="margin-top:8px">'+sq.map(function(k,j){return '<span class="tg" style="--ac:var(--blue)">'+(j+1)+'. '+SUL[k]+(ro?'':' <button class="xbtn" data-act="su-rm" data-i="'+i+'" data-j="'+j+'" aria-label="Entfernen">×</button>')+'</span>'}).join('')+'</div>':''));
    var oa2=offArr(x);
    h+=fld('Spin raus vom Feature (eine oder zwei Optionen)','<div class="opts">'+[['F','Frontside'],['B','Backside'],['C','Cork'],['M','Bio / Misty']].map(function(o){return '<button class="pill'+(oa2.indexOf(o[0])>=0?' on':'')+'" data-act="off-tog" data-i="'+i+'" data-v="'+o[0]+'"'+(ro?' disabled':'')+'>'+o[1]+'</button>'}).join('')+'</div>');
    if(spinOff(x)){h+=fld('Rotation raus',pills('fd',i,[[90,'90'],[180,'180'],[270,'270'],[360,'360'],[450,'450'],[540,'540'],[630,'630'],[810,'810']],x.fd,ro,1));
      h+=fld('Seite raus',pills('rd',i,[['L','Left'],['R','Right']],x.rd,ro));
      h+=fld('Grab nach dem Rail (optional)',pills('rg',i,objOpts(GR),x.rg||'none',ro));
      if(x.rg&&x.rg!=='none')h+=fld('Grab mit Hand',pills('rh',i,[['L','Linke Hand'],['R','Rechte Hand'],['B','Beide Hände']],x.rh,ro))}
    h+=fld('Landung',pills('ld',i,[['R','Forward'],['S','Switch']],x.ld,ro));
    h+=fld('Spezielles (optional)','<input class="inp" data-f="sp" data-i="'+i+'" value="'+esc(x.sp||'')+'" maxlength="120" placeholder="Eigene Beschreibung, z. B. besonderer Trick"'+(ro?' disabled':'')+'>');
  }else{
    h+=fld('Absprung',pills('st',i,[['R','Forward'],['S','Switch']],x.st,ro));
    h+=fld('Drehrichtung','<div class="opts">'+[['L','Links'],['R','Rechts']].map(function(o){return '<button class="pill'+(x.dir===o[0]?' on':'')+'" data-act="set" data-i="'+i+'" data-f="dir" data-v="'+o[0]+'"'+(ro||x.deg===0?' disabled':'')+'>'+o[1]+'</button>'}).join('')+'</div>');
    h+=fld('Take-off',pills('to',i,objOpts(TO),x.to||'std',ro));
    h+=fld('Flips',pills('fl',i,[[0,'Kein Flip'],[1,'Single'],[2,'Double'],[3,'Triple'],[4,'Quadruple']],x.fl||0,ro||x.ax==='flat',1));
    h+=fld('Achse',pills('ax',i,objOpts(AX),x.ax,ro));
    h+=fld('Rotation (Grad)',pills('deg',i,DEGS.map(function(v){return [v,v===0?'0 (Straight)':String(v)]}),x.deg,ro,1));
    h+=fld('Grab',pills('gr',i,objOpts(GR),x.gr,ro));
    if(x.gr&&x.gr!=='none')h+=fld('Grab mit Hand',pills('hd',i,[['L','Linke Hand'],['R','Rechte Hand'],['B','Beide Hände']],x.hd,ro));
    h+=fld('Bringback/Hold',pills('bb',i,[['y','Ja'],['n','Nein']],x.bb||'n',ro));
    h+=fld('Spezielles (optional)','<input class="inp" data-f="sp" data-i="'+i+'" value="'+esc(x.sp||'')+'" maxlength="120" placeholder="Eigene Beschreibung, z. B. besonderer Trick"'+(ro?' disabled':'')+'>');
  }
  if(!ro){var cnt=run.items.filter(function(y){return y.t===x.t}).length,mn=DISC.ss.lim[x.t][0];
    h+='<div class="addrow">'+(run.items.length>1?'<button class="btn sm dng" data-act="del-item" data-i="'+i+'">Element entfernen</button>':'')+'</div>'}
  return h+'</div></div>'}

function checkPanel(run,ev,id){
  var d=run.disc,cls=ev.complete?'ok':'open';
  var vt=ev.complete?_('Run komplett'):(ev.openN===1?_('Noch 1 Punkt offen'):_('Noch {n} Punkte offen',{n:ev.openN}));
  var vs=ev.complete?(ev.plOk===ev.pl?_('Alle Kriterien erfüllt, auch die Bonuskriterien.'):_('Alle notwendigen Kriterien erfüllt. {n} Bonuskriterium/-kriterien möglich.',{n:ev.pl-ev.plOk})):_('Erfüllt: {a} von {b} notwendigen Kriterien.',{a:ev.reqOk,b:ev.req});
  var h='<div id="'+id+'"><div class="verdict '+cls+'"><div class="k">Run-Check · Slopestyle</div><div class="vt">'+vt+'</div><div class="vs">'+vs+'</div><div class="bar"><i style="width:'+ev.pct+'%"></i></div>'+(ev.skipped.length?'<div class="vs" style="margin-top:8px">'+esc(_('Bei diesem Kurs entfallen: {list}.',{list:ev.skipped.map(function(l){return _(l)}).join(', ')}))+'</div>':'')+'</div>';
  h+='<div class="mini"><div><div class="k">Notwendig</div><div class="v">'+ev.reqOk+'/'+ev.req+'</div></div><div><div class="k">Bonus</div><div class="v">'+ev.plOk+'/'+ev.pl+'</div></div><div><div class="k">Elemente</div><div class="v">'+ev.filled+'/'+ev.total+'</div></div></div>';
  var last='';
  ev.list.forEach(function(c){
    if(c.g!==last){h+='<div class="grp-h">'+(c.g==='b'?'Run-Aufbau':GN(d,c.g))+'</div>';last=c.g}
    h+='<div class="crit '+(c.ok?'ok':(c.err?'err':(c.req?'no':'plus')))+'"><span class="ic" aria-hidden="true">'+(c.ok?'✓':(c.req?'✕':'+'))+'</span><div><div class="ct"><b>'+esc(c.label)+'</b><span class="rq">'+(c.req?'Notwendig':'Bonus')+'</span>'+(c.count?'<span class="cnt">'+c.count[0]+'/'+c.count[1]+'</span>':'')+'</div>'+
     ((c.have.length||c.miss.length)?'<div class="tags">'+c.have.map(function(t){return '<span class="tg">'+esc(t)+'</span>'}).join('')+c.miss.map(function(t){return '<span class="tg soon">'+esc(_('fehlt: {x}',{x:_(t)}))+'</span>'}).join('')+'</div>':'')+
     (!c.ok&&c.hint?'<div class="hint">'+esc(c.hint)+'</div>':'')+'</div></div>'});
  return h+'</div>'}

function runBody(run,ro,idp){
  var ev=evaluate(run),lb=labelsOf(run),sh=shortsOf(run),d=run.disc;CONF=stanceConf(run);
  var cards=run.items.map(function(x,i){return itemCard(run,x,i,ro,lb[i],sh[i])}).join('');
  var add='';
  if(!ro){DISC.ss.tpl.forEach(function(p){var t=p[0],cnt=run.items.filter(function(y){return y.t===t}).length,mx=DISC.ss.lim[t][1];
    if(cnt<mx)add+='<button class="btn" data-act="add-item" data-t="'+t+'">'+esc(_('+ {x} hinzufügen',{x:(t==='r'?'Rail':'Jump')}))+'</button>'})}
  return {ev:ev,html:'<div class="layout"><div><div class="items">'+cards+'</div>'+(add?'<div class="addrow" style="margin-top:14px">'+add+'</div>':'')+
    '<div class="addrow" style="margin-top:12px"><button class="btn sm" data-act="fold-all" data-v="1">Alle einklappen</button><button class="btn sm" data-act="fold-all" data-v="0">Alle ausklappen</button></div></div>'+
    '<aside class="checkcol">'+checkPanel(run,ev,idp)+'</aside></div>'}}

/* ---------- Ansichten ---------- */
function viewBuild(){
  var run=curRun();
  if(!run)return '<div class="empty-st">Noch kein Run vorhanden. Wechsle zu «Meine Runs» und lege einen neuen Run an.</div>';
  var h='<div class="sec-h"><h2>Run zusammenstellen</h2><span class="dtag">'+esc(DISC[run.disc].name)+'</span></div><p class="sec-sub">Wähle bei jedem Element die Merkmale aus. Der Run-Check zeigt sofort, was dir zu einem vollständigen Run noch fehlt.</p>';
  h+='<div class="runbar plain"><div class="row"><button class="btn" data-act="goto-runs">← Alle Runs</button><button class="btn" data-act="dup-run">Duplizieren</button></div>'+
   '<div class="row"><div class="grow"><div class="k" style="margin-bottom:4px">Name des Runs</div><input class="inp" id="runName" value="'+esc(run.name)+'" maxlength="60"></div>'+
   '<div class="grow"><div class="k" style="margin-bottom:4px">Wettkampf (Contest)</div><input class="inp" id="runEvent" list="evList" value="'+esc(run.event||'')+'" maxlength="80" placeholder="z. B. Weltcup Laax"><datalist id="evList">'+contestNames().map(function(n){return '<option value="'+esc(n)+'"></option>'}).join('')+'</datalist></div>'+
   '</div></div>';
  var ps=pubState(run),pcls=ps==='saved'?'ok':'open';
  h+='<div class="plain savebar"><div><div class="k">Sichtbar für Coach:in</div><div style="font-weight:700;color:var(--char)">'+(ps==='none'?_('Noch nicht gespeichert. Dein:e Coach:in sieht diesen Run erst, wenn du ihn speicherst.'):ps==='saved'?_('Gespeichert am {d}. Dein:e Coach:in sieht diesen Stand.',{d:fmtDate(run.pub.at)}):_('Änderungen noch nicht gespeichert. Dein:e Coach:in sieht den Stand vom {d}.',{d:fmtDate(run.pub.at)}))+'</div></div><button class="btn pri" data-act="pub-run"'+(ps==='saved'?' disabled':'')+'>'+(ps==='saved'?'Gespeichert':'Run speichern')+'</button></div>';
  if(run.coachNote)h+='<div class="coachnote"><div class="k">'+_('Coach:in-Feedback')+(run.coachTs?' · '+fmtDate(run.coachTs):'')+'</div>'+esc(run.coachNote).replace(/\n/g,'<br>')+'<div class="rmeta" style="margin-top:6px">Du kannst den Run weiter bearbeiten. Speichere ihn danach erneut, damit dein:e Coach:in die Änderungen sieht.</div></div>';
  var b=runBody(run,false,'check');
  return h+b.html}
function runStatus(run){var ev=evaluate(run);return {ev:ev,chip:'<span class="chip '+(ev.complete?'ok':'open')+'">'+(ev.complete?_('Komplett'):_('{n} offen',{n:ev.openN}))+'</span>'}}
function fmtDate(t){if(!t)return '';var d=new Date(t);return d.toLocaleDateString(LOC[LANG],{day:'2-digit',month:'2-digit',year:'numeric'})+' '+d.toLocaleTimeString(LOC[LANG],{hour:'2-digit',minute:'2-digit'})}
function contestNames(){var m={},o=[];vis().slice().sort(function(a,b){return (b.upd||0)-(a.upd||0)}).forEach(function(r){var k=(r.event||'').trim().toLowerCase();if(k&&!m[k]){m[k]=1;o.push((r.event||'').trim())}});return o}
function currentEv(){var cn=contestNames();return (cn.length===0||S.evSel==='__new__')?S.evNew:S.evSel}
function viewRuns(){
  var cn=contestNames(),evOk=currentEv().trim()!=='';
  var cerr=courseCheck(S.course);
  var h='';
  h+='<div class="plain newbox"><div class="k">Neuer Run: Kurs zusammenstellen</div><p class="rmeta" style="margin:0">Wähle die Features in der Reihenfolge, in der sie im Kurs dieses Contests vorkommen.</p>'+
    '<div class="tags">'+S.course.map(function(t,i){return '<span class="tg" style="--ac:'+(t==='r'?'var(--blue)':'var(--purp)')+';display:inline-flex;gap:4px;align-items:center">'+(i+1)+'. '+(t==='r'?'Rail':'Jump')+'<button class="xbtn" data-act="c-mv" data-i="'+i+'" data-d="-1" aria-label="Nach vorne"'+(i===0?' disabled':'')+'>‹</button><button class="xbtn" data-act="c-mv" data-i="'+i+'" data-d="1" aria-label="Nach hinten"'+(i===S.course.length-1?' disabled':'')+'>›</button><button class="xbtn" data-act="c-rm" data-i="'+i+'" aria-label="Entfernen">×</button></span>'}).join('')+(S.course.length?'':'<span class="rmeta">Noch keine Features gewählt.</span>')+'</div>'+
    '<div class="opts"><button class="pill" data-act="c-add" data-t="r">+ Rail</button><button class="pill" data-act="c-add" data-t="j">+ Jump</button></div>'+
    (cerr?'<div class="rmeta"'+(S.course.length?' style="color:var(--oranget);font-weight:700"':'')+'>'+cerr+'</div>':'')+
    '<div class="k" style="margin-top:4px">Wettkampf</div>'+
    (cn.length?'<select id="evSel" class="inp"><option value="">Wettkampf wählen …</option>'+cn.map(function(n){return '<option value="'+esc(n)+'"'+(S.evSel===n?' selected':'')+'>'+esc(n)+'</option>'}).join('')+'<option value="__new__"'+(S.evSel==='__new__'?' selected':'')+'>+ Neuen Wettkampf erstellen …</option></select>':'')+
    ((!cn.length||S.evSel==='__new__')?'<input id="evNew" class="inp" maxlength="80" value="'+esc(S.evNew)+'" placeholder="Name des neuen Wettkampfs, z. B. Slopestyle Weltcup Laax">':'')+
    (!evOk?'<div class="rmeta">Wähle einen Wettkampf oder erstelle einen neuen, damit der Run zugeordnet wird.</div>':'')+
 '<div class="k" style="margin-top:4px">Name des Runs (optional)</div><input id="newRunName" class="inp" maxlength="60" value="'+esc(S.runName)+'" placeholder="z. B. Quali Run 1">'+
    '<button class="btn pri" id="startBtn" data-act="new-run" style="justify-self:start"'+((cerr||!evOk)?' disabled':'')+'>Run mit diesem Kurs starten</button></div>';
  var rs=vis().slice().sort(function(a,b){return b.upd-a.upd});
  h+='<div class="sec-h" style="margin-top:26px"><h2>Meine Runs</h2></div><p class="sec-sub">Alle deine Runs. Dein:e Coach:in sieht sie ebenfalls und kann dir Feedback hinterlassen.</p>';
  if(!rs.length)return h+'<div class="empty-st">Noch keine Runs. Stelle oben den Kurs zusammen, um zu starten.</div>';
  h+='<div class="grid">'+rs.map(function(r){var st=runStatus(r);
    return '<div class="card rcard" style="--ac:'+(r.id===S.cur?'var(--red)':'var(--char)')+'" data-act="open-run" data-id="'+r.id+'"><h4>'+esc(r.name||'Run')+'</h4>'+
     '<div class="rmeta">'+esc(r.event||_('Kein Contest'))+' · '+fmtDate(r.upd)+'</div><div>'+st.chip+' <span class="rmeta">'+_('Notwendig {a}/{b}',{a:st.ev.reqOk,b:st.ev.req})+'</span></div>'+
     '<div><span class="chip '+(pubState(r)==='saved'?'ok':'dash')+'">'+({none:'Nicht gespeichert',saved:'Für Coach:in gespeichert',dirty:'Ungespeicherte Änderungen'})[pubState(r)]+'</span></div>'+
     (r.coachNote?'<div class="rmeta"><b>Coach:in-Feedback vorhanden</b></div>':'')+
     '<div class="acts"><button class="btn sm" data-act="open-run" data-id="'+r.id+'">Bearbeiten</button><button class="btn sm" data-act="dup-run" data-id="'+r.id+'">Duplizieren</button><button class="btn sm dng" data-act="del-run" data-id="'+r.id+'">'+(S.delArm===r.id?'Wirklich löschen?':'Löschen')+'</button></div></div>'}).join('')+'</div>';
  return h}
function athRows(){
  return S.ath.map(function(a){var runs=Object.keys(a.runs||{}).map(function(k){return a.runs[k]}).filter(function(r){return r&&!r.del&&r.pub}).map(pubRun).sort(function(x,y){return y.upd-x.upd});
    return {uid:a.uid,name:a.name,runs:runs,last:runs[0]}}).sort(function(a,b){return (b.last?b.last.upd:0)-(a.last?a.last.upd:0)})}
function evKey(r){return (r.event||'').trim().toLowerCase()||'_'}
function evName(r){return (r.event||'').trim()||_('Ohne Contest')}
function eventsOf(runs){var m={},o=[];runs.forEach(function(r){var k=evKey(r);if(!m[k]){m[k]={key:k,name:evName(r),runs:[],last:0};o.push(m[k])}m[k].runs.push(r);m[k].last=Math.max(m[k].last,r.upd||0)});return o.sort(function(x,y){return y.last-x.last})}
function noteVal(r){return S.draft[r.id]!==undefined?S.draft[r.id]:(r.coachNote||'')}
function noteState(r,v){return v===(r.coachNote||'')?(r.coachNote?_('Gesendet am {d}. Der/die Athlet:in sieht es im eigenen Run.',{d:fmtDate(r.coachTs)}):_('Noch kein Feedback gesendet.')):_('Noch nicht gesendet. Der/die Athlet:in sieht das Feedback erst nach dem Senden.')}
function cntRuns(n){return n===1?_('{n} gespeicherter Run',{n:n}):_('{n} gespeicherte Runs',{n:n})}
function viewCoach(){
  if(!S.coach)return '<div class="empty-st">Diese Ansicht ist nur für Coach:innen.</div>';
  var rows=athRows();
  if(S.aSel&&S.rSel){var a=rows.find(function(r){return r.uid===S.aSel}),run=a&&a.runs.find(function(r){return r.id===S.rSel});
    if(run){var b=runBody(run,true,'check');
      return '<button class="btn back" data-act="coach-back">'+esc(_('← Zurück zu {x}',{x:evName(run)}))+'</button><div class="sec-h"><h2>'+esc(run.name||'Run')+'</h2></div><p class="sec-sub">'+esc(a.name)+' · '+esc(run.event||_('Kein Contest'))+' · '+esc(_('zuletzt {d}',{d:fmtDate(run.upd)}))+'</p>'+
       '<div class="exnote" style="margin-bottom:14px;display:flex;gap:10px;align-items:center;justify-content:space-between;flex-wrap:wrap"><span>Coach:in-Ansicht: Dieser Stand ist nur zum Ansehen. Athlet:innen bearbeiten ihre Runs selbst unter «Meine Runs».</span></div>'+
       '<div class="plain" style="margin-bottom:18px"><div class="k" style="margin-bottom:6px">'+esc(_('Feedback an {x}',{x:a.name}))+'</div><textarea class="inp" id="coachNote" placeholder="Notiz oder Feedback zu diesem Run">'+esc(noteVal(run))+'</textarea><div class="savebar" style="margin:10px 0 0"><div class="rmeta" id="cnState">'+noteState(run,noteVal(run))+'</div><button class="btn pri" id="cnBtn" data-act="send-note"'+(noteVal(run).trim()===''||noteVal(run)===(run.coachNote||'')?' disabled':'')+'>Feedback senden</button></div></div>'+b.html}}
  var sel=S.aSel&&rows.find(function(r){return r.uid===S.aSel});
  if(sel){
    var evs=eventsOf(sel.runs),ev=S.eSel&&evs.filter(function(e){return e.key===S.eSel})[0];
    if(ev){
      return '<button class="btn back" data-act="coach-ath-back">← '+esc(sel.name)+'</button><div class="sec-h"><h2>'+esc(ev.name)+'</h2></div><p class="sec-sub">'+esc(sel.name)+' · '+esc(cntRuns(ev.runs.length))+'. '+esc(_('Klicke einen Run an, um ihn im Detail zu prüfen.'))+'</p><div class="grid">'+ev.runs.map(function(r){var st=runStatus(r);
        return '<div class="card rcard" style="--ac:var(--char)" data-act="coach-run" data-id="'+r.id+'"><h4>'+esc(r.name||'Run')+'</h4><div class="rmeta">'+esc(_('gespeichert {d}',{d:fmtDate(r.upd)}))+'</div><div>'+st.chip+' <span class="rmeta">'+_('Notwendig {a}/{b}',{a:st.ev.reqOk,b:st.ev.req})+'</span></div>'+(r.coachNote?'<div class="rmeta"><b>Feedback gegeben</b></div>':'')+'</div>'}).join('')+'</div>'}
    var hh='<button class="btn back" data-act="coach-all">← Alle Athlet:innen</button><div class="sec-h"><h2>'+esc(sel.name)+'</h2></div><p class="sec-sub">'+esc(evs.length===1?_('{n} Wettkampf',{n:1}):_('{n} Wettkämpfe',{n:evs.length}))+'. '+esc(_('Klicke einen Wettkampf an, um die Runs zu sehen.'))+'</p>';
    if(!evs.length)return hh+'<div class="empty-st">'+esc(_('{x} hat noch keinen Run gespeichert.',{x:sel.name}))+'</div>';
    return hh+'<div class="grid">'+evs.map(function(e){
      return '<div class="card rcard" style="--ac:var(--char)" data-act="coach-ev" data-e="'+esc(e.key)+'"><h4>'+esc(e.name)+'</h4><div class="rmeta">'+esc(cntRuns(e.runs.length))+' · '+esc(_('zuletzt {d}',{d:fmtDate(e.last)}))+'</div></div>'}).join('')+'</div>'}
  var all=[];rows.forEach(function(r){r.runs.forEach(function(x){all.push(x)})});
  var h='<div class="sec-h"><h2>Coach:in-Übersicht</h2></div><p class="sec-sub">Alle deine Athlet:innen. Klicke eine Person an, um ihre gespeicherten Runs zu sehen.</p>';
  h+='<div class="kpis"><div class="kpi"><div class="k">Athlet:innen</div><div class="v">'+rows.length+'</div></div></div>';
  if(!rows.length)return h+'<div class="empty-st">Noch keine Athlet:innen. Sobald Athlet:innen einen Run für Coach:in speichern, erscheinen sie hier.</div>';
  return h+'<div class="grid">'+rows.map(function(r){var l=r.last;
    return '<div class="card rcard" style="--ac:var(--char)" data-act="coach-ath" data-u="'+esc(r.uid)+'"><h4>'+esc(r.name)+'</h4><div class="rmeta">'+(r.runs.length?esc(cntRuns(r.runs.length))+' · '+esc(_('zuletzt {d}',{d:fmtDate(l.upd)})):_('Noch kein Run gespeichert'))+'</div>'+
      (l?'<div class="rmeta">'+esc(_('Letzter Run: {x}',{x:l.name||'Run'}))+'</div>':'')+'</div>'}).join('')+'</div>'}
function viewRules(){
  var h='<div class="sec-h"><h2>Kriterien</h2><span class="dtag">Slopestyle</span></div><p class="sec-sub">Das prüft der Run-Check. Notwendige Kriterien müssen erfüllt sein, damit der Run komplett ist. Bonuskriterien erhöhen die Schwierigkeit und Variety.</p><div class="notice"><b>Wichtiger Hinweis</b><p>Die Kriterien sind Coach- und Athlet:innenempfehlungen auf Basis des FIS Judges Handbook (Weltcup-Niveau). An jedem Wettkampf können sie sich leicht unterscheiden oder anders gewichtet werden. Das Tool dient nur dazu, auf fehlende Punkte hinzuweisen. Es ist keine Garantie für eine gute Punktzahl, und es müssen nicht zwingend alle Punkte erfüllt werden.</p></div><div class="rules">';
  var last='';[{g:'b',label:'Alle Elemente ausgefüllt',req:1,desc:'Jedes Element des Runs ist vollständig eingetragen.'}].concat(CR.ss).forEach(function(c){
    if(c.g!==last){h+='<div class="grp-h">'+(c.g==='b'?'Run-Aufbau':GN('ss',c.g))+'</div>';last=c.g}
    h+='<div class="crit '+(c.req?'no':'plus')+'" style="grid-template-columns:minmax(0,1fr)"><div><div class="ct"><b>'+esc(c.label)+'</b><span class="rq">'+(c.req?'Notwendig':'Bonus')+'</span></div><div class="hint" style="color:var(--muted);font-weight:400">'+esc(c.desc)+'</div></div></div>'});
  return h+'</div>'}

function tabsHtml(){
  var t=S.coach?[['coach','Coach:in'],['rules','Kriterien']]:[['runs','Meine Runs'],['rules','Kriterien']];
  return t.map(function(x){return '<button class="tab-btn'+((S.tab===x[0]||(x[0]==='runs'&&S.tab==='build'))?' on':'')+'" data-tab="'+x[0]+'">'+x[1]+'</button>'}).join('')+'<span class="sync '+S.sync+'" id="rc-sync"><b></b>'+syncText()+'</span>'}
function dockHtml(){
  var run=curRun();if(!run||S.tab!=='build')return null;var ev=evaluate(run);
  return {cls:ev.complete?'ok':'open',html:'<div class="dt">'+(ev.complete?_('Run komplett'):_('Noch {n} offen',{n:ev.openN}))+'<small>'+esc(_('Notwendig {a}/{b} · Tippen für Details',{a:ev.reqOk,b:ev.req}))+'</small></div><span class="pc">'+ev.pct+'%</span>'}}
function render(){
  $('#rc-tabs').innerHTML=tabsHtml();
  var v=S.loading?'<div class="loading"><span class="spinner"></span></div>':S.tab==='build'?viewBuild():S.tab==='runs'?viewRuns():S.tab==='coach'?viewCoach():viewRules();
  var y=window.scrollY;$('#rc-view').innerHTML=v;
  var dk=dockHtml(),el=$('#rc-dock');
  if(dk){el.hidden=false;el.className='dock '+dk.cls;el.innerHTML=dk.html;root.classList.add('hasdock')}else{el.hidden=true;root.classList.remove('hasdock')}
  trNode($('#rc-tabs'));trNode($('#rc-view'));trNode($('#rc-dock'));trHeader();
  window.scrollTo(0,y)}

/* ---------- Ereignisse ---------- */
function onClick(e){
  var tb=e.target.closest('[data-tab]');if(tb){S.tab=tb.dataset.tab;if(S.tab!=='coach'){S.rSel=null}render();window.scrollTo(0,0);return}
  var t=e.target.closest('[data-act]');if(!t)return;var a=t.dataset.act,run=curRun();if(a!=='del-run')S.delArm=null;
  if(a==='set'&&run){var it=run.items[+t.dataset.i],f=t.dataset.f,v=t.dataset.v;if(t.dataset.n)v=Number(v);
    if(f==='al')v=v;
    var prev=it[f];it[f]=v;
    if(f==='deg'){if(v===0)it.dir='0';else if(it.dir==='0')it.dir=null}
    if(f==='gr'&&v==='none')it.hd=null;
    if(f==='ax'&&v==='flat')it.fl=0;
    if(f==='rg'&&v==='none')it.rh=null;
    if(f==='on'){if(true)it.ent=entArr(it).filter(function(k){return entOpts(v).indexOf(k)>=0});if(v==='0')it.od=0;else{it.ap=null;if(prev==='0'||prev==null)it.od=null}}
    if(it.t==='r'&&f==='on'){it.flow=null}
    touch(run);render();return}
  if(a==='ent-tog'&&run){var qe=run.items[+t.dataset.i],ea=entArr(qe).slice(),k0=t.dataset.v,ei=ea.indexOf(k0);if(ei>=0)ea.splice(ei,1);else{if(k0==='slip')ea=ea.filter(function(k){return k!=='stail'});if(k0==='stail')ea=ea.filter(function(k){return k!=='slip'});ea.push(k0)}qe.ent=ea;touch(run);render();return}
  if(a==='off-tog'&&run){var q3=run.items[+t.dataset.i],k=t.dataset.v,o3=offArr(q3).slice(),ix=o3.indexOf(k);
    if(ix>=0)o3.splice(ix,1);else{o3.push(k);if(o3.length>2)o3.shift()}
    q3.off=o3;if(!spinOff(q3)){q3.fd=0;q3.rd=null;q3.rg=null;q3.rh=null}else if(!q3.fd)q3.fd=null;touch(run);render();return}
  if(a==='pub-run'&&run){run.pub={name:run.name,event:run.event||'',items:JSON.parse(JSON.stringify(run.items)),at:Date.now()};touch(run);render();return}
  if(a==='su-add'&&run){var q=run.items[+t.dataset.i];q.su=suArr(q).concat([t.dataset.v]);touch(run);render();return}
  if(a==='su-rm'&&run){e.stopPropagation();var q2=run.items[+t.dataset.i];q2.su=suArr(q2).filter(function(_,j){return j!==+t.dataset.j});touch(run);render();return}
  if(a==='fold'){var k=t.dataset.key;S.shut[k]=!S.shut[k];render();return}
  if(a==='fold-all'){var fr=run,pre='';if(S.tab==='coach'&&S.rSel){var fa=athRows().filter(function(x){return x.uid===S.aSel})[0];fr=fa&&fa.runs.filter(function(x){return x.id===S.rSel})[0];pre='c:'}
    if(fr){fr.items.forEach(function(x,i){S.shut[pre+fr.id+':'+i]=t.dataset.v==='1'});render()}return}
  if(a==='add-item'&&run){run.items.push(blank(t.dataset.t));
    touch(run);render();return}
  if(a==='del-item'&&run){run.items.splice(+t.dataset.i,1);touch(run);render();return}
  if(a==='c-add'){S.course.push(t.dataset.t);render();return}
  if(a==='c-rm'){S.course.splice(+t.dataset.i,1);render();return}
  if(a==='c-mv'){var i0=+t.dataset.i,i1=i0+ +t.dataset.d;if(i1>=0&&i1<S.course.length){var tmp=S.course[i0];S.course[i0]=S.course[i1];S.course[i1]=tmp}render();return}
  if(a==='new-run'){var evn=currentEv().trim();if(courseCheck(S.course)||!evn)return;var ex2=contestNames().filter(function(n){return n.toLowerCase()===evn.toLowerCase()})[0];if(ex2)evn=ex2;var r=newRun(S.course.slice());r.event=evn;var cnt2=vis().filter(function(x){return (x.event||'').trim().toLowerCase()===evn.toLowerCase()}).length;r.name=S.runName.trim()||('Run '+(cnt2+1));S.runName='';S.evSel=evn;S.evNew='';S.runs.push(r);S.cur=r.id;S.course=[];S.tab='build';touch(r);render();window.scrollTo(0,0);return}
  if(a==='goto-runs'){S.tab='runs';render();return}
  if(a==='dup-run'){var src=t.dataset.id?S.runs.filter(function(x){return x.id===t.dataset.id})[0]:run;if(!src)return;var c=JSON.parse(JSON.stringify(src));c.id=newId();c.name=(src.name||'Run')+' '+_('(Kopie)');c.ex=false;delete c.coachNote;delete c.coachTs;delete c.pub;delete c.del;S.runs.push(c);S.cur=c.id;S.tab='build';touch(c);render();window.scrollTo(0,0);return}
  if(a==='open-run'){if(e.target.closest('[data-act="del-run"]'))return;S.cur=t.dataset.id;S.tab='build';render();window.scrollTo(0,0);return}
  if(a==='del-run'){e.stopPropagation();var r2=S.runs.find(function(x){return x.id===t.dataset.id});if(!r2)return;
    if(S.delArm!==r2.id){S.delArm=r2.id;render();return}
    S.delArm=null;
    r2.del=true;r2.ex=false;touch(r2);if(S.cur===r2.id){var v2=vis();S.cur=v2.length?v2[0].id:null}render();return}
  if(a==='lang'){LANG=t.dataset.v;try{localStorage.setItem('swissski-lang',LANG)}catch(e){}renderLang();trHeader();render();return}
  if(a==='coach-ev'){S.eSel=t.dataset.e;S.rSel=null;render();window.scrollTo(0,0);return}
  if(a==='coach-ath-back'){S.eSel=null;S.rSel=null;render();window.scrollTo(0,0);return}
  if(a==='coach-ath'){S.aSel=t.dataset.u;S.eSel=null;S.rSel=null;render();window.scrollTo(0,0);return}
  if(a==='coach-run'){S.rSel=t.dataset.id;var ca=athRows().filter(function(x){return x.uid===S.aSel})[0],cr=ca&&ca.runs.filter(function(x){return x.id===S.rSel})[0];
    if(cr)cr.items.forEach(function(x,i){S.shut['c:'+cr.id+':'+i]=true});render();window.scrollTo(0,0);return}
  if(a==='send-note'&&S.aSel&&S.rSel){var aid=S.aSel,rid2=S.rSel,v2=S.draft[rid2];if(v2===undefined||v2.trim()==='')return;
    var stt=$('#cnState');if(stt)stt.textContent=_('Sendet …');t.disabled=true;
    db.from('run_checks').update({coach_note:v2}).eq('id',rid2).select('coach_note,coach_ts').then(function(res){
      if(res.error||!res.data||!res.data.length)throw res.error||new Error('not saved');
      delete S.draft[rid2];var ad=S.ath.filter(function(x){return x.uid===aid})[0];
      if(ad&&ad.runs&&ad.runs[rid2]){ad.runs[rid2].coachNote=res.data[0].coach_note;ad.runs[rid2].coachTs=Date.parse(res.data[0].coach_ts)}render()
    }).catch(function(){var s2=$('#cnState');if(s2)s2.textContent=_('Senden fehlgeschlagen. Bitte versuche es erneut.');t.disabled=false});return}
  if(a==='coach-back'){S.rSel=null;render();return}
  if(a==='coach-all'){S.aSel=null;S.eSel=null;S.rSel=null;render();window.scrollTo(0,0);return}
}
function onKey(e){if((e.key==='Enter'||e.key===' ')&&e.target.matches&&e.target.matches('[data-act="fold"]')){e.preventDefault();e.target.click()}}
function onInput(e){var id=e.target.id,run=curRun();
  if(id==='newRunName'){S.runName=e.target.value;return}
  if(id==='evNew'){S.evNew=e.target.value;var sb=document.getElementById('startBtn');if(sb)sb.disabled=!!courseCheck(S.course)||currentEv().trim()==='';return}
  if(e.target.dataset&&e.target.dataset.f==='sp'&&run){run.items[+e.target.dataset.i].sp=e.target.value;touch(run)}
  else if(id==='runName'&&run){run.name=e.target.value;touch(run)}
  else if(id==='runEvent'&&run){run.event=e.target.value;touch(run)}
  else if(id==='coachNote'&&S.aSel&&S.rSel){var rid=S.rSel,v=e.target.value;S.draft[rid]=v;
    var rr=athRows().filter(function(x){return x.uid===S.aSel})[0],ru=rr&&rr.runs.filter(function(x){return x.id===rid})[0];
    if(ru){var st=$('#cnState'),bt=document.getElementById('cnBtn');if(st)st.textContent=noteState(ru,v);if(bt)bt.disabled=v.trim()===''||v===(ru.coachNote||'')}}}
function onChange(e){if(e.target.id==='evSel'){S.evSel=e.target.value;render()}else if(e.target.id==='runName'||e.target.id==='runEvent'||(e.target.dataset&&e.target.dataset.f==='sp')){render()}}

/* ---------- Start ---------- */
function typing(){var a=document.activeElement;return a&&(a.tagName==='INPUT'||a.tagName==='TEXTAREA')}
// Einmal beim Boot (boot.js): Reiter einblenden und Grundgeruest aufbauen. Nur wo CFG.runCheck gesetzt ist.
function runCheckBoot(){
  if(!CFG.runCheck)return;
  root=document.getElementById('page-runcheck');if(!root)return;
  S.athlete=ATHLETE_NAME||null;S.coach=!S.athlete;S.tab=S.coach?'coach':'runs';
  root.innerHTML='<div class="rc-hd"><div><h2>Run-Check<span class="dot">.</span></h2><div class="sub">Freeski | Slopestyle. Trage deinen Run ein und sieh sofort, ob er alle Judge-Kriterien abdeckt.</div></div>'+
    '<div class="langsw" id="rc-langsw" role="group" aria-label="Sprache"></div></div>'+
    '<nav class="tabs" aria-label="Bereiche"><div class="tabs-in" id="rc-tabs"></div></nav><div class="rc-main" id="rc-view"></div><div class="dock" id="rc-dock" hidden></div>';
  root.addEventListener('click',onClick);root.addEventListener('keydown',onKey);root.addEventListener('input',onInput);root.addEventListener('change',onChange);
  $('#rc-dock').addEventListener('click',function(e){e.stopPropagation();var c=$('#check');if(c)c.scrollIntoView({behavior:'smooth',block:'start'})});
  ['nav-tab-runcheck','mobile-nav-runcheck'].forEach(function(id){var el=document.getElementById(id);if(el)el.style.display=''});
}
// Bei jedem Oeffnen des Reiters (showPage): Daten frisch laden
function loadRunCheck(){
  if(!root)return;renderLang();
  if(!S.loaded){S.loading=true;render()}
  loadData().then(function(){S.loading=false;S.loaded=true;if(!typing())render()})}
window.runCheckBoot=runCheckBoot;window.loadRunCheck=loadRunCheck;
})();
