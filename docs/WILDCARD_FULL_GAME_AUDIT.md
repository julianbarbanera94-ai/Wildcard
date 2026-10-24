# Wildcard --- Full Game Design Audit & Improvement Plan

**Purpose:** Identify what makes the best Pokémon games compelling,
compare those principles with Wildcard's current direction, and provide
a practical audit and prioritised improvement plan covering world
structure, travel, exploration, creatures, battles, progression, quests,
UI, settings, controls, accessibility, audio, visual identity, technical
quality and testing.

**Prepared:** 25 October 2026\
**Reference build discussed:** Wildcard 3.17--3.19, including the 3.19.0
APK referenced in recent work\
**Audience:** Game owner, designer, engineer and implementation partner
(including Claude)

------------------------------------------------------------------------

## 1. Executive summary

Wildcard has a promising foundation: a recognisable adventure structure,
a journal with **Story, Quests, Finds, People, Creatures, Home and
Rep**, a battle scene worth investing in, caves and mines, settlements
with functional buildings, and a world that can support discovery and
collection. Recent work has also identified opportunities to give caves
distinct layouts and stories, make buildings visually specific to their
purpose, and strengthen battle presentation.

The concern is that Wildcard may be accumulating features and assets
without a single, consistent world-and-gameplay logic connecting them. A
game can have attractive battles, lots of quests, many buildings and a
large map yet still feel less satisfying than Pokémon if the player
cannot form a clear mental map, understand why they are travelling,
anticipate what might be found, or feel that exploration naturally leads
to growth.

**The key recommendation is not to copy Pokémon feature-for-feature. It
is to recover the design principles underneath its strongest games:**

1.  **A legible journey:** places connect in a way players can
    understand and remember.
2.  **A strong adventure loop:** prepare, travel, discover, encounter,
    make a choice, return or push onward, and gain something meaningful.
3.  **Curiosity with payoff:** visible landmarks, rumours, unusual
    creatures, hidden routes, and optional discoveries reward attention.
4.  **Clear progression:** the player understands what they are working
    towards and why a new area or challenge is now achievable.
5.  **A world that feels inhabited:** people, buildings, creatures,
    shops and environmental details belong to the place and have useful
    roles.
6.  **Low-friction interaction:** menus, controls, saving, inventory,
    party management and settings support play instead of interrupting
    it.
7.  **Depth through meaningful choices:** creatures and battles
    encourage team-building and tactics, not simply higher numbers.
8.  **A consistent identity:** art, writing, sound, interface and
    mechanics feel like parts of the same game.

### The highest-priority risk

**Travel and world topology should be audited before more content is
added.** If the route between places is arbitrary, confusing,
excessively menu-driven, or disconnected from geography and progression,
additional quests and visual assets will amplify the inconsistency
rather than fix it.

### Important scope note

This is a **design audit and evidence-led improvement plan**, informed
by the Wildcard details and prior APK-related work available in the
project context, including the journal categories, repeated cave-room
patterns, building variety concerns, battle-scene work and Backbone
controller requirement. It is not a claim that every screen, code path,
setting or control has been exhaustively re-tested in a live playthrough
of the current APK. Sections distinguish known observations from
hypotheses and items that must be verified against the current build.
Use the audit checklist in Section 14 to turn it into a verified
build-by-build review.

------------------------------------------------------------------------

## 2. What to learn from Pokémon --- without cloning it

Pokémon is not successful just because it has creatures or turn-based
battles. Its best entries combine a small number of systems into a clear
and repeatable adventure.

### 2.1 The core adventure loop

A strong baseline loop looks like this:

1.  **Receive a reason to go somewhere** --- a story beat, character
    request, rumour, map clue or visible landmark.
2.  **Prepare** --- choose a party, heal, buy supplies, check objectives
    and decide whether to take a detour.
3.  **Travel through a readable place** --- routes, terrain, landmarks,
    NPCs, wild encounters and optional paths communicate what the area
    is.
4.  **Discover something** --- a new creature, item, character,
    shortcut, hidden room, puzzle, story clue or unusual encounter.
5.  **Make a decision** --- battle, catch, flee, use a resource,
    investigate, help someone or continue onwards.
6.  **Earn a meaningful outcome** --- knowledge, a creature, an item, a
    relationship, a new ability, reputation or access.
7.  **Recover and reflect** --- return to a settlement, use a service,
    update the journal, change the party or choose the next destination.
8.  **See the next possibility** --- a route opens, a rumour becomes
    actionable, a creature entry gains context, or a new objective
    becomes available.

The loop should work at multiple time scales: a 30-second discovery, a
five-minute side trip, a 20-minute expedition and a multi-hour story
arc.

### 2.2 The design lessons that matter most

  --------------------------------------------------------------------------------
  Reference                What it does well   Lesson for        What not to copy
                                               Wildcard          blindly
  ------------------------ ------------------- ----------------- -----------------
  **Pokémon Red/Blue and   Compact routes,     Build a coherent  Old-fashioned
  later classic            clear exits,        chain of places.  friction, opaque
  route-based entries**    memorable towns, a  Make each route   hidden
                           readable sequence   distinct and give requirements or
                           of challenges and a players a reason  excessive
                           strong sense of     to remember it    backtracking
                           getting somewhere                     

  **Pokémon Gold/Silver /  A sense of a larger Let the world     Requiring
  HeartGold/SoulSilver**   connected world,    evolve as the     excessive travel
                           revisiting familiar player            over
                           places with new     progresses.       already-cleared
                           abilities, and      Revisited routes  ground
                           discoveries that    should offer new  
                           change the meaning  opportunities,    
                           of earlier areas    not just repeated 
                                               chores            

  **Pokémon Ruby/Sapphire  Strong regional     Give each region  Gating everything
  / Emerald**              identity, terrain   a visual and      behind arbitrary
                           variety, routes     mechanical        obstacles
                           that introduce new  identity. Use     
                           traversal problems  terrain to shape  
                           and environmental   travel and        
                           themes              discovery         

  **Pokémon Black/White**  Strong thematic     Give important    Long stretches of
                           focus, memorable    people            exposition that
                           characters, a clear motivations and   stop play
                           narrative argument  give major        
                           and creatures       locations a       
                           integrated into the narrative purpose 
                           story                                 

  **Pokémon X/Y and        Distinctive         Introduce systems Overlong
  Sun/Moon**               locations,          in context and    tutorials or
                           approachable        make the world    frequent
                           onboarding and      easy to read      interruptions
                           strong character                      
                           presentation in                       
                           places                                

  **Pokémon Sword/Shield** A central journey,  Use a             Corridors that
                           readable major      hub-and-spoke     feel like narrow
                           landmarks and a     structure where   connectors
                           dedicated wild area appropriate; make without
                                               open spaces       discoveries
                                               purposeful        

  **Pokémon Legends:       Field research,     Make discovery    Repetitive
  Arceus**                 visible creatures,  itself valuable.  research tasks or
                           direct interaction  The creature      grinding that
                           with the            catalogue can     blocks the story
                           environment and a   record player     
                           strong              knowledge, not    
                           expedition/return   just ownership    
                           rhythm                                

  **Pokémon                Freedom to choose   Give players      Unclear objective
  Scarlet/Violet**         objectives and      agency and        order, weak
                           visible creatures   several viable    landmarks, poor
                           in the world        goals, while      difficulty
                                               communicating     signalling or an
                                               danger and        open world that
                                               challenge clearly feels empty
  --------------------------------------------------------------------------------

The lesson from the series' more open entries is especially important:
**more freedom is not automatically better navigation**. Reviews of
*Scarlet/Violet* praised the freedom and branching story paths while
also criticising confusing progression, weak environmental specificity
and technical problems. *Legends: Arceus* made discovery and field
research central, but its progression gates could become grindy.
Wildcard should take the strengths and deliberately avoid the known
weaknesses.

### 2.3 The "Pokémon feeling" checklist

A player should regularly feel:

-   "I know where I am."
-   "I understand why I am going there."
-   "I wonder what is over that hill / through that door / down that
    tunnel."
-   "I found something I could not have found if I had rushed."
-   "That creature is interesting for more than its power level."
-   "My team or choices helped me overcome this challenge."
-   "This town has a personality."
-   "I can take a break, manage my party, save and understand my next
    step."
-   "The world remembers what I have done."
-   "I want to see what is next."

If Wildcard's systems do not reliably create these feelings, adding more
content is unlikely to solve the core problem.

------------------------------------------------------------------------

## 3. Wildcard: current strengths and likely gaps

### 3.1 Strengths to preserve

Based on the current project context, Wildcard already has useful
foundations:

-   **A journal organised around the world:** Story, Quests, Finds,
    People, Creatures, Home and Rep can become a strong player-facing
    record of progress.
-   **A broad adventure vocabulary:** towns, homes, services,
    caves/mines, creatures, people, quests, battles and reputation can
    reinforce one another.
-   **Room for environmental storytelling:** prior cave analysis
    identified repeated room templates and an opportunity for more
    distinctive chambers, branches, shortcuts, puzzles and habitats.
-   **An opportunity for strong settlement identity:** prior building
    work identified that homes and functional buildings need to look
    different, with clear visual cues for services such as healing,
    trade, crafting, lodging and governance.
-   **A dedicated battle-scene investment:** the battle UI work creates
    an opportunity to make combat clearer, more dramatic and more
    consistent with the rest of the game.
-   **Controller support is a real requirement:** Backbone support
    should be treated as a first-class input mode, not an afterthought.
-   **A rich setting for long-term progression:** the journal and
    Rep/Home concepts could provide persistent reasons to return to
    places and care about the world.

These are foundations, not proof that the player experience is already
cohesive. The audit should test whether each system contributes to the
same adventure loop.

### 3.2 Main risks to investigate

  -----------------------------------------------------------------------
  Risk                    Why it matters          Audit status
  ----------------------- ----------------------- -----------------------
  Travel between places   Players lose their      **Priority hypothesis**
  lacks clear             mental map and          based on the user's
  geographical or         destinations feel like  stated concern; verify
  narrative logic         disconnected screens    in-game

  Too much content is     The world can feel like Verify
  represented as menus,   a content browser       
  lists or isolated       rather than a place     
  destinations                                    

  Routes and caves reuse  Exploration becomes     **Known concern:**
  too many layouts or     predictable and less    prior APK analysis
  lack distinct           memorable               found repeated 14×10
  identities                                      cave-room templates

  Buildings look alike    Settlements become      **Known concern:**
  despite different       visually generic and    building variety was
  functions               services are harder to  explicitly identified
                          recognise               as a problem

  The journal is broad    Categories can store    Verify
  but may not guide the   information without     
  next action             helping players make    
                          decisions               

  Quests may be task      Objectives feel         Verify
  lists rather than       transactional instead   
  journeys                of embedded in the      
                          world                   

  Creature collection may Creatures become        Verify
  be separate from        inventory entries       
  exploration, story and  instead of reasons to   
  combat                  explore                 

  Battle presentation may Spectacle alone cannot  Verify
  be improving faster     create satisfying       
  than battle readability combat                  
  and balance                                     

  Settings and controls   Navigation friction     Verify
  may not consistently    damages every play      
  support touch and       session                 
  Backbone                                        

  Feature growth may be   New assets or mechanics Verify
  outpacing consistency   may break established   
  and regression testing  patterns                
  -----------------------------------------------------------------------

### 3.3 Design principle

**Every major system should support at least two others.** For example,
a mine should not only be a battle location. It could reveal a rare
creature habitat, contain a local character's quest, produce a crafting
resource, reveal a shortcut and add knowledge to the journal. The
connections should be natural, not forced.

------------------------------------------------------------------------

## 4. World structure and travel --- the highest-priority audit

Travel is not dead time between content. It is one of the main ways a
role-playing adventure builds anticipation, teaches geography, creates
risk and makes the player feel they are progressing.

### 4.1 Choose a coherent world model

Wildcard should explicitly choose and document its world topology. Avoid
an accidental mixture of map screens, teleporting, corridors and open
areas with inconsistent rules.

A good default is a **hybrid connected world**:

-   **Settlements** act as safe, memorable hubs with healing, shops,
    crafting, lodging, characters, rumours and services.
-   **Routes** connect settlements and landmarks. They should have a
    clear direction, visual identity, optional branches and a reason to
    exist.
-   **Wilderness zones** offer more open exploration, creature habitats,
    resource gathering and optional discoveries.
-   **Dungeons, caves and mines** are focused spaces with internal
    logic, distinct room identities, risk, shortcuts and a meaningful
    reward.
-   **Fast travel** unlocks as a convenience after discovery, not as a
    replacement for understanding the world.
-   **Story gates** use understandable fiction: a blocked bridge, a
    dangerous pass, a missing boat, a local permit, a character's help
    or a traversal ability. Avoid arbitrary invisible walls.

A high-level model might be:

`Home / Starting Settlement → Route A → Small Landmark → Town B → Route B → Mine / Forest → Town C`

With optional branches:

`Route A → Hidden Grotto → Reward / Creature Habitat → reconnect to Route A`

The map can be nonlinear later, but the player should first learn a few
dependable spatial rules.

### 4.2 Create a world graph, not just a list of destinations

For every location, document:

-   Unique location ID and display name
-   Location type (settlement, route, wilderness, dungeon, landmark,
    interior)
-   Direct connections to other locations
-   Entry and exit points
-   Whether the connection is one-way, gated or reversible
-   Unlock condition and the reason for it
-   Expected challenge level and recommended preparation
-   Travel time or effort
-   Services available
-   Creatures, resources, people, quests and discoveries
-   Shortcuts and fast-travel status
-   What changes after key story events

**Rule:** If two places are connected in the UI, the fiction and
navigation should explain why. If a place is only reachable through a
menu, the interface should make clear whether that represents
teleportation, travel planning, a world map selection or a chapter
transition.

### 4.3 Travel rules to establish

1.  **No unexplained teleporting.** A transition should communicate what
    happened: walking through a gate, taking a road, boarding transport
    or fast-travelling.
2.  **Show the next landmark.** Whenever possible, the player should see
    or hear about a destination before reaching it.
3.  **Use signposts and environmental clues.** Signage, road shape,
    terrain, NPC dialogue, map labels and silhouettes should reinforce
    one another.
4.  **Make routes memorable.** Each major route needs a distinct shape,
    colour palette, landmark, encounter pattern or mechanic.
5.  **Keep backtracking purposeful.** Revisit areas for a new ability, a
    changed story state, an optional reward or a shortcut---not simply
    because the game needs more time.
6.  **Respect player time.** Once a route has been learned, avoid
    forcing the player to repeat every empty section.
7.  **Make danger legible.** Signal dangerous areas through creature
    behaviour, environmental effects, NPC warnings, visual composition
    or optional challenge indicators.
8.  **Let travel reveal the world.** A journey should contain small
    events, not just a loading screen or a sequence of empty steps.
9.  **Preserve orientation.** The player should know the current place,
    how to leave, and how to get back.
10. **Never punish experimentation with unclear navigation.** A wrong
    turn should teach something or be easy to recover from.

### 4.4 Build a travel decision matrix

  -----------------------------------------------------------------------
  Situation               Preferred behaviour     Avoid
  ----------------------- ----------------------- -----------------------
  First trip to a new     Travel through a route  Instant unlock with no
  settlement              with a landmark,        context, unless
                          encounter and arrival   deliberately
                          moment                  story-driven

  Return to a known       Use a map or fast       Replaying a long empty
  settlement              travel if previously    route every time
                          discovered and safe     

  A route is blocked      Explain why and hint at Invisible collision or
                          the solution or         a generic "cannot go
                          alternate route         there" message

  A player enters a       Signal risk and offer a Silent difficulty spike
  high-risk area early    meaningful choice       that looks like a bug

  A quest asks for a      Show the region, clues  Vague text that forces
  distant item            and plausible route     aimless searching

  A cave contains         Give the layout a       Repeated rooms that
  multiple chambers       spatial logic,          feel interchangeable
                          landmarks and shortcuts 

  A story event changes   Update NPCs, route      A journal update with
  the world               access, ambience or     no visible world
                          available services      response
  -----------------------------------------------------------------------

### 4.5 Recommended travel UX

The world map should answer five questions at a glance:

-   Where am I?
-   What places have I discovered?
-   What is nearby?
-   What do I know about the destination?
-   What will I be committing to if I go there?

Show discovered locations, routes and meaningful landmarks. Distinguish
unknown territory from discovered but inaccessible areas. Use objective
markers sparingly and allow them to be hidden. If the game has a compass
or minimap, it should support orientation rather than replace the world
itself.

**Acceptance criteria:**

-   A new player can explain how to reach the next main destination
    without guessing.
-   A returning player can navigate to a previously visited settlement
    in a few seconds.
-   Every major route has at least one memorable feature beyond
    connecting two endpoints.
-   Every locked route communicates a reason, a hint or an alternate
    option.
-   Fast travel never makes the world map less coherent.
-   No critical quest depends on an undocumented assumption about where
    the player should go.

------------------------------------------------------------------------

## 5. Exploration, routes, caves and landmarks

### 5.1 Give each area a clear identity

For every route, forest, ruin, mine or cave, define:

-   **Fantasy:** what this place is supposed to feel like.
-   **Silhouette:** the shape or landmark a player remembers.
-   **Gameplay verb:** what players do here that is different.
-   **Creature ecology:** why these creatures live here.
-   **Environmental story:** what happened here or what is happening
    now.
-   **Reward:** what makes exploration worthwhile.
-   **Navigation signature:** how the player recognises the way through.
-   **Return value:** what changes when the player comes back later.

A route can be short and still memorable. It does not need dozens of
assets; it needs a strong identity.

### 5.2 Cave and mine audit

Prior APK analysis identified repeated **14×10 cave-room templates**.
Reuse is not automatically bad, but players should not feel that a new
cave is the same room with different decoration.

Use a mix of authored room roles:

-   Entrance and orientation chamber
-   Main traversal chamber
-   Split-path decision chamber
-   Creature habitat
-   Resource chamber
-   Puzzle or environmental obstacle
-   Story discovery chamber
-   Dangerous encounter arena
-   Hidden grotto or optional branch
-   Shortcut / return route
-   Exit or culmination chamber

Do not put every room role in every cave. Choose three or four that suit
the location's identity.

For each major cave, vary at least three of these: overall silhouette,
room sequence, verticality, light source, material, hazards, creature
behaviour, puzzle language, landmark, soundscape or shortcut structure.
Avoid relying on colour swaps alone.

**Mine example:** A mine could begin with a familiar entrance and
abandoned equipment, descend into a noisy working shaft, branch into a
crystal seam where creatures nest, and end at a collapsed tunnel that
can later become a shortcut. The story, creatures, resources and layout
should all support the same theme.

### 5.3 Discovery density

Each meaningful area should contain a mix of:

-   Main-path progress
-   Optional side path
-   Environmental clue
-   Resource or collectible
-   Creature encounter or habitat behaviour
-   NPC, note or story trace
-   Reward that changes a later decision

Not every screen needs all seven. The aim is to avoid long stretches
where the player only walks forward without making decisions.

### 5.4 Make revisiting worthwhile

When a new ability, story event or reputation level unlocks something,
revisit an earlier location with a visible change: a previously
inaccessible ledge, a new NPC, a changed creature habitat, a repaired
bridge, a new service, a different quest outcome or a shortcut. Tell the
player through a clue or journal update that something may now be
possible.

------------------------------------------------------------------------

## 6. Creatures, collection and attachment

Creatures should be more than battle stats or catalogue completion. The
strongest collection games make players curious about a creature, help
them understand it, and then let them form a relationship or strategic
plan around it.

### 6.1 Creature identity checklist

Each creature should ideally have:

-   A memorable silhouette and readable visual identity
-   A habitat that makes sense
-   Distinct behaviour, even outside combat where feasible
-   A clear combat role or strategic niche
-   At least one interesting strength, limitation or trade-off
-   A reason it matters to the setting, story or local ecology
-   Useful information in the Creatures journal
-   A discovery, evolution or mastery moment that feels earned

Avoid a roster where creatures differ mainly by appearance and numerical
strength.

### 6.2 The collection loop

A satisfying loop could be:

`Notice a clue → find a habitat → encounter the creature → learn its behaviour → battle / befriend / capture (as Wildcard rules allow) → record it in Creatures → use or study it → unlock new insight`

The journal should distinguish **seen**, **encountered**,
**understood**, **owned/collected** and **mastered** only if those
states are meaningful and easy to understand. Do not add status layers
just to make the system look deep.

### 6.3 Creature balance and team building

Audit whether:

-   Several team compositions can succeed.
-   A creature has a purpose beyond being an early-game placeholder.
-   A strong creature has a counter or opportunity cost.
-   New discoveries can be useful without making the existing team feel
    worthless.
-   Players understand the key properties of a creature before
    committing scarce resources.
-   The game avoids one dominant strategy that makes most of the roster
    irrelevant.

Make role and matchup information readable in battle. Surface important
information at the moment it helps the player decide, rather than
requiring them to memorise a large table.

### 6.4 Creature journal improvements

For each entry, consider a concise structure:

1.  Illustration / silhouette
2.  Name and classification
3.  Discovery status
4.  Habitat and time/condition clues, if relevant
5.  Observed behaviour
6.  Battle strengths and weaknesses
7.  Story, character or ecology connection
8.  Personal notes / notable encounter, if the game supports it

Keep unknown information mysterious, but make the next clue actionable.
"Unknown" is atmosphere; "rumoured near the flooded ruins after heavy
rain" is a useful lead.

------------------------------------------------------------------------

## 7. Battles and combat UX

Wildcard has already invested in battle-scene assets. The next step is
to ensure that the visual presentation supports tactical clarity,
responsiveness and emotional payoff.

### 7.1 Battle readability before spectacle

At all times, players should be able to answer:

-   Whose turn is it?
-   What can I do?
-   What is the current target?
-   What changed after the last action?
-   How much danger am I in?
-   What resources will this action consume?
-   Why did the result happen?

Use a strong hierarchy: combatants and current state first, available
actions second, detailed stats and logs third. Effects should not
obscure critical health, status, turn or selection information.

### 7.2 Battle flow audit

Test the full cycle:

1.  Encounter starts and establishes context.
2.  Player understands the opponent and available actions.
3.  Action selection is quick and controller-friendly.
4.  The action is confirmed with clear feedback.
5.  Animation communicates cause and effect without unnecessary delay.
6.  Damage, status and resource changes are readable.
7.  The next decision is immediately available.
8.  Victory/defeat has a clear conclusion and reward.
9.  Return to exploration is smooth and state-safe.

### 7.3 Battle design questions

-   Is every action choice meaningfully different?
-   Are status effects explained in plain language?
-   Can players recover from a mistaken selection before confirmation?
-   Are battle animations skippable or speed-adjustable where
    appropriate?
-   Are damage numbers and effects readable on small screens?
-   Does the battle UI handle long creature names, unusual stats and
    status combinations?
-   Can the entire battle be completed with Backbone without touching
    the screen?
-   Does the game explain why a move or action failed?
-   Are rewards and progression shown without interrupting the next
    encounter unnecessarily?

### 7.4 Avoid a common failure

Do not treat a battle UI redesign as proof that combat is improved.
Validate balance, pacing, action clarity, feedback, accessibility and
controller focus with real encounter scenarios. A beautiful interface
that requires too many inputs or hides important state is still a poor
battle experience.

------------------------------------------------------------------------

## 8. Story, quests, people, finds, home and Rep

Wildcard's journal categories are an opportunity to make the whole world
feel connected. They should not become seven unrelated databases.

### 8.1 Story

-   Show the current chapter / major goal.
-   Provide a concise recap after a long break.
-   Keep the next actionable step visible without spoiling discoveries.
-   Make completed story beats readable and searchable.
-   Ensure story progression changes the world where appropriate.

### 8.2 Quests

A quest should answer:

-   Who wants this and why?
-   What am I being asked to do?
-   Where should I start?
-   What evidence tells me I am making progress?
-   What happens when I complete it?
-   Does my choice matter?

Organise objectives into **Main**, **Side**, **Character**,
**Discovery** and **Repeatable** only if each category has a real use.
Display active objective, location clue, progress and reward. Allow the
player to pin one objective and optionally hide markers.

Prefer quest steps that reveal a place, person, creature or story over
repeated "collect X items" tasks. Collection tasks are fine when they
teach a system, reflect a character's needs or reward exploration.

### 8.3 People

NPCs should be memorable through a combination of appearance,
motivation, voice, routine and relationship to place.

Audit whether important NPCs:

-   Have a clear role in the world.
-   Say something useful or characterful.
-   Change after major events.
-   Offer more than a generic interaction.
-   Can be found again when their quest or service requires it.
-   Are represented consistently in the People journal.

A small cast with distinct motivations is better than many
interchangeable NPCs.

### 8.4 Finds

"Finds" should reward curiosity. It could contain discovered objects,
lore, landmarks, unusual events or clues. Make each entry explain why it
matters and link to a relevant place, person, quest or creature when
useful.

### 8.5 Home

If Home is a player-owned space or settlement system, make it
emotionally and mechanically worthwhile:

-   Give the player a clear reason to return.
-   Show visible progress as upgrades are earned.
-   Ensure upgrades have understandable effects.
-   Avoid making the system a disconnected resource sink.
-   Let the player personalise it without burying essential functions.
-   Make home services and navigation obvious.

### 8.6 Rep (reputation)

Reputation should represent how the world perceives the player, not just
a number that rises.

Possible outcomes include new dialogue, access to a service, a
character's trust, local discounts, new requests, invitations or changed
reactions. Avoid locking essential content behind an obscure grind.
Explain what actions affect reputation and show meaningful feedback when
it changes.

### 8.7 Cross-link the journal

When relevant, entries should connect naturally:

-   A creature discovery can update Creatures and Finds.
-   A character quest can update Quests and People.
-   A mine discovery can update Finds, Story and the map.
-   A home upgrade can change Home and unlock a service.
-   A reputation milestone can change NPC dialogue or access.

Do not duplicate long descriptions across tabs. Link the records and
show the most relevant summary in each context.

------------------------------------------------------------------------

## 9. Towns, buildings and services

Prior work identified that Wildcard's buildings risk looking too
similar, even when they serve different purposes. This is both an
art-direction issue and a usability issue: players should recognise a
healer, shop, inn, workshop or civic building before reading a label.

### 9.1 Building identity system

Each building type needs a recognisable silhouette, material language,
signage, colour accent and entrance treatment.

  -----------------------------------------------------------------------
  Building role           Visual cues to explore  Functional expectation
  ----------------------- ----------------------- -----------------------
  Healer / recovery       Medical or restorative  Heal or restore the
                          symbol, clean focal     party; explain cost and
                          point, welcoming light, outcome
                          recovery motif          

  Shop / trader           Display goods, crates,  Buy/sell; prices and
                          awning, visible         inventory are clear
                          merchandise, trade      
                          signage                 

  Inn / lodging           Warm windows,           Rest, recover, possibly
                          signboard, beds or      hear rumours
                          hospitality cues        

  Blacksmith / workshop   Chimney, forge glow,    Craft, repair or
                          tools, metalwork,       upgrade
                          sturdy materials        

  Guild / quest hub       Noticeboard, emblem,    Quest discovery,
                          public-facing entrance  contracts or
                                                  progression

  Farm / food producer    Crops, fences, tools,   Food, ingredients or
                          animals or produce      local story

  Warehouse / storage     Loading doors, stacked  Storage or logistics
                          goods, carts            

  Town hall / civic       Larger central mass,    Local leadership, town
  centre                  banners, formal entry   progression or permits

  Research / magic        Instruments, unusual    Research, lore,
  building                lighting, symbols,      crafting or system
                          study spaces            explanation

  Homes                   Multiple footprints,    Character identity and
                          rooflines, materials    settlement life
                          and personal details    
  -----------------------------------------------------------------------

Use these as a visual language, not a requirement that every town
contains every building.

### 9.2 Settlement composition

A town should feel designed around human needs:

-   A readable centre or main street
-   A clear route to important services
-   A few landmarks that aid orientation
-   Side streets or quiet spaces that reward curiosity
-   Residents who plausibly use the space
-   A local architectural theme
-   At least one memorable detail that distinguishes the settlement from
    others

A village, mining outpost, coastal port and research settlement should
not be the same layout with different props.

### 9.3 Interiors

Interiors should reinforce the building's role. Avoid reusing the same
room layout for every service. Reuse a base kit where sensible, but vary
focal point, furniture, NPC placement, lighting, props and interaction.

**Acceptance criteria:** a player can identify key services from the
exterior; every major settlement has a distinct identity; important
buildings have interiors that match their function; and repeated home
variations feel related but not identical.

------------------------------------------------------------------------

## 10. Interface, navigation and information architecture

A game UI should help the player act confidently without turning the
adventure into menu management.

### 10.1 Establish a clear hierarchy

A sensible top-level model could be:

-   **Explore** --- the active world, movement, interaction and local
    context.
-   **Party / Creatures** --- team, creature details, equipment or
    abilities as applicable.
-   **Journal** --- Story, Quests, Finds, People, Creatures, Home and
    Rep.
-   **Map** --- known locations, connections, destination details and
    travel.
-   **Inventory** --- usable items, materials, currency and key items.
-   **Settings** --- controls, audio, display, accessibility and
    gameplay options.

This is a proposed structure, not a mandate to add a new top-level menu
for every feature. Combine or rename items if that better matches the
current game. The key is to make the mental model stable and avoid
scattering related actions across unrelated screens.

### 10.2 Screen-level audit questions

For every screen, ask:

-   What is the primary user goal?
-   Is the main action visually obvious?
-   Can the player tell where they are in the hierarchy?
-   Is there a clear Back / Close behaviour?
-   Does selection persist when moving between tabs?
-   Is important information visible without scrolling?
-   Are empty, loading, error and success states designed?
-   Does the screen work on a small phone?
-   Does it work in landscape/portrait if both are supported?
-   Can it be used entirely with touch and entirely with controller?
-   Does it preserve game state if opened during or after an encounter?

### 10.3 Journal design

The journal has seven known categories, so the risk is that it becomes a
long, dense tab bar or a set of poorly differentiated pages.

Recommended behaviour:

-   Keep category labels and icons consistent.
-   Show unread/new information without excessive badges.
-   Make active objectives easy to reach.
-   Provide useful sorting and filtering only where volume justifies it.
-   Use consistent detail-page patterns.
-   Make relationships between entries clickable.
-   Preserve the last selected tab when returning, unless context
    suggests a better destination.
-   Do not hide urgent progression information inside a deep journal
    page.
-   Use clear states for discovered, completed, pinned and unavailable
    content.

### 10.4 Modal and menu rules

-   Use confirmation dialogs for destructive or expensive actions, not
    every action.
-   Keep button labels specific: "Leave mine" is clearer than "Confirm".
-   Ensure modal Back behaviour is predictable.
-   Avoid stacking multiple modals.
-   Do not let a modal hide the feedback needed to understand the
    action.
-   Return focus to the element that opened a modal after it closes.
-   Keep transitions quick and consistent.

### 10.5 HUD principles

The HUD should show only information that matters in the current
context. During exploration, prioritise location, nearby interaction,
current objective and essential resources. During battle, prioritise
combatants, turn state, available actions and critical status. Avoid
carrying every menu metric into every screen.

------------------------------------------------------------------------

## 11. Controls, Backbone and input consistency

Controls must be designed as a complete system. A game is not
controller-compatible merely because a joystick moves the character.

### 11.1 Define an input action map

Create one canonical action map shared by touch, keyboard (if supported)
and Backbone:

  -----------------------------------------------------------------------
  Action            Touch             Backbone /        Expected
                                      controller        behaviour
  ----------------- ----------------- ----------------- -----------------
  Move              Virtual stick /   Left stick /      Consistent
                    directional       D-pad             movement speed
                    control                             and diagonals

  Interact /        Context button /  Primary confirm   Interact with the
  confirm           tap               button            focused object or
                                                        confirm selection

  Cancel / back     Back button /     Cancel button     Closes current
                    close affordance                    layer before
                                                        leaving the
                                                        screen

  Open journal      HUD button        Dedicated button  Opens the same
                                      or mapped menu    journal entry
                                      action            point

  Open map          HUD button        Dedicated button  Opens map and
                                      or mapped menu    restores focus on
                                      action            close

  Navigate menus    Tap / swipe       D-pad / stick     Visible focus,
                                                        predictable
                                                        wrapping

  Select target     Tap target        D-pad / stick     Clear highlight
                                                        and confirm state

  Pause / settings  Pause affordance  Start / menu      Opens pause menu
                                      button            without losing
                                                        progress

  Quick action      Contextual HUD    Mapped shoulder / Only if the
                    button            face button       action is
                                                        important and
                                                        discoverable
  -----------------------------------------------------------------------

Final button assignments should follow platform conventions and the
physical controller's actual mapping. Do not hard-code an assumption
that every Android controller maps identically.

### 11.2 Controller requirements

-   Every interactive element must be reachable without touch.
-   Focus must be visible and must not disappear behind overlays.
-   Back/cancel must close the topmost layer first.
-   Opening and closing a screen should restore focus sensibly.
-   Stick and D-pad navigation must not double-trigger actions.
-   Repeated inputs need controlled repeat delay.
-   Long lists should scroll predictably.
-   Controller connection/disconnection should not corrupt state.
-   The game should show the current input mode where useful.
-   Touch UI should not remain in a confusing half-focused state after
    controller use.
-   Test the actual Backbone device, not only an emulator.

### 11.3 Control settings

At minimum, consider:

-   Control scheme / input hints
-   Vibration toggle and intensity, if supported
-   Stick sensitivity, if camera or cursor movement makes this useful
-   Button remapping, if feasible
-   Hold versus toggle for repeated actions, where relevant
-   Left-handed layout or HUD repositioning if touch layout warrants it

Do not expose settings that do not meaningfully change behaviour.

------------------------------------------------------------------------

## 12. Settings, accessibility and quality of life

Settings are part of the core product, not a final polish task. They are
especially important on mobile, where devices, environments and play
styles vary.

### 12.1 Recommended settings structure

**Gameplay** - Text speed - Battle animation speed / animation toggle
where appropriate - Auto-advance or confirmation options where safe -
Tutorial and hint controls - Objective marker visibility - Difficulty or
assistance options, if supported by the game's design - Save behaviour
explanation

**Controls** - Touch layout options - Controller support and button
guide - Vibration toggle - Remapping / sensitivity if supported

**Audio** - Master volume - Music volume - Sound effects volume -
Dialogue / ambience volume if separately mixed - Mute when backgrounded,
if appropriate

**Display** - Full-screen / aspect ratio behaviour - UI scale or text
size - Screen shake toggle - Flashing effects reduction - Brightness
only if the game can control it meaningfully

**Accessibility** - Text size and contrast - Reduced motion / screen
shake - Colour-independent status indicators - Clear status-effect icons
plus labels - Adjustable timing or hold requirements where possible -
Subtitles / dialogue presentation if voice is present - Haptic feedback
toggle - Avoid reliance on colour alone to signal danger, rarity or
selection

**Data** - Save status / last save - Cloud or local save status, if
applicable - Credits - Privacy / analytics disclosures if relevant -
Reset options with explicit warning and confirmation

### 12.2 Settings UX rules

-   Group settings by player intent, not by implementation detail.
-   Make changes apply immediately where safe and show feedback.
-   Distinguish "Reset this category" from "Reset all settings".
-   Never place destructive save/reset actions beside common actions
    without protection.
-   Use plain language and explain unusual options.
-   Persist settings across launches.
-   Keep controller navigation functional in Settings.
-   Ensure audio sliders can be changed without sudden jumps.
-   Test settings on small screens and with long translations if
    applicable.

### 12.3 Save and recovery

Audit saving early. Players need confidence that progress is safe.

-   Make it clear whether saving is automatic or manual.
-   Show a discreet save indicator when a save is in progress.
-   Avoid saving in a half-resolved battle or transition state.
-   Handle app backgrounding, force-close and device restart safely.
-   Test low-storage and interrupted-write scenarios where feasible.
-   Explain any restrictions on saving.
-   Never report "Saved" before the save operation has succeeded.
-   Provide a clear recovery path if a save cannot be loaded.

------------------------------------------------------------------------

## 13. Progression, difficulty and rewards

A good RPG lets players understand how they are growing and gives them
meaningful reasons to continue.

### 13.1 Progression layers

Keep the roles of these layers distinct:

-   **Story progression:** what major events and places become
    available.
-   **Player progression:** skills, capabilities or general advancement.
-   **Creature progression:** new moves, evolution, mastery or other
    game-specific growth.
-   **World progression:** new routes, services, NPC states and
    shortcuts.
-   **Collection progression:** new discoveries and catalogue knowledge.
-   **Home / Rep progression:** personal investment and social standing.

The layers should reinforce one another, but avoid requiring the player
to grind one unrelated system to advance another.

### 13.2 Reward quality

Audit rewards by asking what they change:

-   Does the reward solve a current problem?
-   Does it open a new strategy or route?
-   Does it deepen a character or location?
-   Does it make the world more understandable?
-   Does it support a personal goal?
-   Is it appropriately valuable for the effort?

Currency and generic experience are useful, but not every quest should
end with the same reward type.

### 13.3 Difficulty signalling

-   Introduce new mechanics in low-risk contexts.
-   Show danger through the world before punishing the player.
-   Make boss and major encounter expectations legible.
-   Allow preparation and strategy to matter.
-   Avoid requiring one specific creature or build unless the game has
    clearly taught that requirement.
-   If the player loses, explain what happened and offer a sensible
    retry path.
-   Do not make ordinary travel a repeated tax on failure.

### 13.4 Avoid meaningless grind

Repetition is acceptable when it supports mastery, collection, a
deliberate challenge or a satisfying routine. It is harmful when players
repeat a task only because the game withholds the next meaningful
activity behind an arbitrary counter.

Track where the player is asked to repeat content and ask whether the
repetition is enjoyable in itself.

------------------------------------------------------------------------

## 14. Full audit checklist

Use this section as the practical test plan. Mark each item **Pass**,
**Partial**, **Fail** or **Not tested** against a specific APK version
and device. Do not mark an item as passed based on intention or a
mock-up alone.

### A. World and travel

-   [ ] The player understands the overall world structure.
-   [ ] The current location is always identifiable.
-   [ ] Main routes connect places in a coherent, explainable way.
-   [ ] Every major destination has a clear reason to visit.
-   [ ] First-time travel contains orientation and discovery.
-   [ ] Return travel is efficient once the route is learned.
-   [ ] Fast travel only targets valid, discovered locations unless
    intentionally designed otherwise.
-   [ ] Locked paths explain the reason or provide a clue.
-   [ ] Map markers match actual entrances and exits.
-   [ ] The player cannot become permanently lost or trapped through
    normal play.
-   [ ] High-risk areas provide fair signals.
-   [ ] Story changes are reflected in the world.
-   [ ] Routes have distinct identities.
-   [ ] No quest depends on a hidden, undocumented travel rule.

### B. Exploration and environments

-   [ ] Every major area has a unique visual and gameplay identity.
-   [ ] Landmarks are visible and memorable.
-   [ ] Optional paths offer meaningful rewards.
-   [ ] Collectibles and resources are placed with intent.
-   [ ] Caves have understandable spatial layouts.
-   [ ] Cave rooms do not feel interchangeable.
-   [ ] Environmental storytelling supports the location's theme.
-   [ ] Revisited areas offer new opportunities when appropriate.
-   [ ] Navigation does not rely exclusively on UI markers.
-   [ ] Camera, collision and movement support precise navigation.
-   [ ] Entrances, exits and interactables are easy to recognise.
-   [ ] Performance remains stable while exploring.

### C. Creatures and collection

-   [ ] Creatures have distinct roles and identities.
-   [ ] Habitats make sense in the world.
-   [ ] New creatures are discoverable through clues or observation.
-   [ ] The collection journal explains useful information clearly.
-   [ ] Discovery and ownership states are unambiguous.
-   [ ] Team changes are easy to make.
-   [ ] Creature information is accessible before important decisions.
-   [ ] No single strategy dominates all ordinary encounters.
-   [ ] Weak or early creatures can retain a purpose.
-   [ ] Creature art, animation and effects are readable at device
    scale.

### D. Battles

-   [ ] Battle start clearly communicates the encounter.
-   [ ] Turn order and available actions are obvious.
-   [ ] Target selection is clear.
-   [ ] Status effects are explained.
-   [ ] Action outcomes are readable.
-   [ ] Animation timing respects player control.
-   [ ] Battle feedback is consistent.
-   [ ] Victory and defeat resolve correctly.
-   [ ] Rewards are clear and proportionate.
-   [ ] The player can complete every battle using Backbone only.
-   [ ] Battle UI scales to long names and unusual states.
-   [ ] Repeated battles do not become unnecessarily slow.

### E. Story and quests

-   [ ] The main objective is understandable.
-   [ ] Quest descriptions include useful location clues.
-   [ ] The journal records progress reliably.
-   [ ] Quest completion is clearly communicated.
-   [ ] NPCs have identifiable roles and motivations.
-   [ ] Characters and places respond to important events.
-   [ ] Side quests reveal something about the world or its systems.
-   [ ] Optional quests remain optional unless explicitly signalled.
-   [ ] Quest rewards are meaningful and varied.
-   [ ] The player can recover context after a long break.

### F. Towns and buildings

-   [ ] Important services are recognisable from the exterior.
-   [ ] Buildings match their functions.
-   [ ] Different settlements have distinct layouts and identities.
-   [ ] Homes vary without losing the game's visual language.
-   [ ] Interiors reinforce the service or character.
-   [ ] NPC placement and movement feel plausible.
-   [ ] Town navigation is clear.
-   [ ] Entering and leaving buildings is consistent.
-   [ ] Services explain cost, effects and requirements.
-   [ ] Important buildings are not visually hidden by clutter.

### G. UI and information architecture

-   [ ] Every screen has one clear primary purpose.
-   [ ] Back and close behaviour is consistent.
-   [ ] The player can always identify the current menu context.
-   [ ] Important actions are not buried in deep menus.
-   [ ] Journal categories are easy to distinguish.
-   [ ] Active objectives are easy to find.
-   [ ] Empty, loading, error and success states exist where needed.
-   [ ] Text remains readable on a phone.
-   [ ] UI scale and safe areas are handled.
-   [ ] Focus and selection are visible.
-   [ ] Modals do not stack unnecessarily.
-   [ ] UI transitions do not hide important feedback.

### H. Controls and Backbone

-   [ ] Movement is consistent across input methods.
-   [ ] All interactive screens can be used without touch.
-   [ ] Controller focus is always visible.
-   [ ] Back/cancel closes the topmost layer first.
-   [ ] Focus restores sensibly when menus close.
-   [ ] No action double-triggers through stick repeat.
-   [ ] Long lists scroll correctly.
-   [ ] Controller connection loss is handled safely.
-   [ ] On-screen prompts reflect the active input mode.
-   [ ] Settings can be fully navigated with the controller.
-   [ ] Battle, inventory, map and journal are controller-complete.
-   [ ] Actual Backbone hardware has been tested.

### I. Settings and accessibility

-   [ ] Settings are grouped by player intent.
-   [ ] Audio categories work and persist.
-   [ ] Text and interface scale are readable.
-   [ ] Reduced motion options exist where needed.
-   [ ] Status and selection are not communicated by colour alone.
-   [ ] Vibration can be disabled if supported.
-   [ ] Changes provide immediate feedback.
-   [ ] Reset actions are protected.
-   [ ] Settings persist after force-close and relaunch.
-   [ ] Accessibility options are tested, not merely present.

### J. Save, stability and performance

-   [ ] Save behaviour is clear.
-   [ ] Save state is not corrupted by interrupted transitions.
-   [ ] App backgrounding and resume work.
-   [ ] Force-close recovery works.
-   [ ] No softlocks after battle, dialogue or travel.
-   [ ] Loading and transition states are handled.
-   [ ] Memory use remains stable over a long session.
-   [ ] Asset loading does not cause missing or flickering visuals.
-   [ ] Repeated screens do not leak state or duplicate UI.
-   [ ] Low-storage and failed-save behaviour is understandable.
-   [ ] Progress is retained across app restart.
-   [ ] Performance is tested on representative Android devices.

### K. Audio and feedback

-   [ ] Locations have distinct ambience where appropriate.
-   [ ] Important actions have clear sound or visual feedback.
-   [ ] Music supports the mood and changes at meaningful moments.
-   [ ] Audio levels are balanced across exploration, dialogue and
    battle.
-   [ ] Important information is not conveyed by sound alone.
-   [ ] Repeated effects do not become irritating.
-   [ ] Music and effects settings persist.

### L. Content consistency

-   [ ] Terminology is consistent across UI, dialogue and journal.
-   [ ] Item, creature and location names match everywhere.
-   [ ] Art style is consistent across backgrounds, buildings, icons and
    battle screens.
-   [ ] Every new asset has a clear purpose and correct scale.
-   [ ] Reused assets do not erase location identity.
-   [ ] Text fits all supported screen sizes.
-   [ ] Tutorial language matches actual controls.
-   [ ] Content updates do not break old saves.

------------------------------------------------------------------------

## 15. Prioritised improvement roadmap

Do not attempt to fix everything at once. Stabilise the core loop, then
improve content depth, then polish.

### Phase 0 --- Establish a verified baseline

**Goal:** Know what the current build actually does before redesigning
it.

1.  Select the exact APK to audit and record its version/build hash.
2.  Play a complete first-time path from the opening through the first
    major progression milestone.
3.  Record every location transition and why it occurs.
4.  Capture screens for the world map, travel transitions, journal,
    inventory, battle, settings and every major service.
5.  Test touch and Backbone separately.
6.  Log bugs separately from design issues.
7.  Mark the Section 14 checklist with evidence.

**Deliverables:** baseline audit, route graph, screen inventory, control
map, issue log and a short list of the five highest-impact problems.

### Phase 1 --- Fix the adventure spine

**Goal:** Make the game feel like a coherent journey.

1.  Draw the world graph and document every major connection.
2.  Define the expected travel rules.
3.  Fix confusing or arbitrary location transitions.
4.  Improve destination clues, landmarks and route identity.
5.  Make the map and journal agree with the world.
6.  Ensure every main quest explains where to go and why.
7.  Add fast travel only where it supports the chosen world model.

**Exit criteria:** a new player can explain the route to the next main
destination; returning travel is not tedious; all major quest
destinations are reachable and understandable.

### Phase 2 --- Make exploration rewarding

**Goal:** Turn routes and interiors into places worth remembering.

1.  Give each major region a distinct visual identity.
2.  Rework the most repetitive cave and mine layouts.
3.  Add meaningful optional branches and shortcuts.
4.  Tie creatures, resources, finds and quests to local ecology.
5.  Make revisit opportunities clear and rewarding.
6.  Improve the environmental storytelling of major landmarks.

**Exit criteria:** each major area has a distinct identity and at least
one memorable discovery or decision.

### Phase 3 --- Connect the systems

**Goal:** Make the journal, quests, people, creatures, home and Rep
reinforce one another.

1.  Define what each journal category is for.
2.  Add cross-links between related entries.
3.  Ensure NPCs and locations respond to key story events.
4.  Make creature discoveries useful beyond catalogue completion.
5.  Make Home upgrades visibly change the player's experience.
6.  Make Rep produce understandable, worthwhile world reactions.
7.  Audit quest rewards and remove repetitive filler.

**Exit criteria:** major activities contribute to more than one
meaningful system without creating confusing duplication.

### Phase 4 --- Standardise UI and input

**Goal:** Remove friction from routine play.

1.  Audit every screen using Section 10.
2.  Standardise navigation, Back, focus and modal rules.
3.  Implement a canonical input action map.
4.  Complete Backbone-only navigation for all essential flows.
5.  Rework settings and accessibility categories.
6.  Improve save-state communication and recovery.
7.  Test on small screens and actual target devices.

**Exit criteria:** a player can complete the main loop without
accidental dead ends, forced touch input or confusing menu behaviour.

### Phase 5 --- Combat, balance and presentation

**Goal:** Make battles clear, tactically interesting and satisfying.

1.  Test battle readability at real device scale.
2.  Audit action economy, creature roles and dominant strategies.
3.  Tune animation speed and feedback.
4.  Make status, target and turn information clear.
5.  Validate victory, defeat, rewards and return-to-world transitions.
6.  Test the entire battle flow with Backbone.

**Exit criteria:** players understand outcomes, have meaningful
decisions and can complete battles with their preferred input method.

### Phase 6 --- Content and polish

**Goal:** Make the whole game feel intentionally authored.

1.  Improve building silhouettes and interiors.
2.  Refine music, ambience and action feedback.
3.  Remove redundant tutorials and repeated dialogue.
4.  Standardise naming, icons, typography and spacing.
5.  Run long-session, save/resume and regression tests.
6.  Re-audit the full checklist after each substantial release.

**Exit criteria:** visual, audio, interaction and narrative systems feel
consistent rather than separately bolted together.

------------------------------------------------------------------------

## 16. How to measure whether the redesign works

Use observed behaviour, not personal preference alone. A small test with
five players can reveal major navigation issues.

### Suggested playtest tasks

1.  Start a new game and reach the first major destination.
2.  Explain the route taken and why.
3.  Find a healing service without using trial and error.
4.  Locate a quest objective using only the journal and world clues.
5.  Discover an optional area.
6.  Identify a building's purpose from its exterior.
7.  Find information about a creature encountered earlier.
8.  Change a relevant setting.
9.  Complete a battle using Backbone only.
10. Save, close and relaunch the game; confirm progress.
11. Return to a known location.
12. Explain what the player is working towards next.

### Metrics and signals

-   Time to understand the next main objective
-   Number of wrong turns or unnecessary menu openings
-   Number of times a tester asks "Where do I go?"
-   Number of interactions that require a second input method
-   Percentage of testers who can identify important services
-   Percentage of testers who notice an optional discovery
-   Number of softlocks, lost states or unexplained transitions
-   Frequency of unnecessary backtracking
-   Player recall of locations after a short break
-   Whether players can describe a creature's role or a town's identity

Do not optimise purely for speed. A longer route can be good if it is
interesting. The goal is **intentional time**, not minimum time.

------------------------------------------------------------------------

## 17. Implementation rules for Claude or another coding partner

Use this as the engineering guardrail when implementing the audit.

### Required workflow

1.  **Inspect before changing.** Trace the current implementation and
    identify the relevant screens, state, routes, save data and input
    handling.
2.  **Report the current behaviour.** Explain what happens today and
    where it is implemented.
3.  **Propose a small change.** State the intended behaviour, affected
    files and risk.
4.  **Implement in a focused stage.** Avoid rewriting unrelated systems.
5.  **Test the full flow.** Test both the happy path and cancellation,
    failure, relaunch and controller cases.
6.  **Show evidence.** Provide screenshots, a short test report and the
    changed files.
7.  **Update the design record.** Keep the world graph, action map and
    audit checklist current.
8.  **Protect saves.** Do not change save schema or progression
    assumptions without migration and regression tests.

### Engineering principles

-   Use one source of truth for location connections and travel
    eligibility.
-   Use stable IDs for locations, creatures, quests, items and journal
    records.
-   Keep UI labels separate from internal IDs.
-   Make map, journal and quest destination data agree.
-   Centralise input actions so touch and Backbone trigger the same game
    actions.
-   Use reusable UI patterns without making every screen identical.
-   Make state transitions explicit; avoid hidden state changes tied to
    screen rendering.
-   Add logging for failed transitions, missing destinations and invalid
    save data.
-   Do not silently swallow errors.
-   Avoid adding settings that have no implemented effect.
-   Do not mark a feature complete until it has been tested in the
    actual APK.

### Suggested implementation prompt

> Review `WILDCARD_FULL_GAME_AUDIT.md` and the current Wildcard
> source/APK. Do not begin by changing code. First produce a verified
> baseline for Phase 0: map the current world/location graph, document
> how travel works, list every main screen and its navigation behaviour,
> identify the actual touch and Backbone input paths, and record
> save/settings behaviour. Separate verified facts from assumptions.
> Then recommend the five highest-impact fixes with evidence,
> dependencies, risks and acceptance criteria. Implement only after I
> approve the staged plan. Preserve existing working features and save
> compatibility. For every stage, include changed files, before/after
> screenshots where relevant, and tests for normal use, cancellation,
> errors, app resume and Backbone-only operation.

------------------------------------------------------------------------

## 18. Decisions to make before adding more features

Answer these as design decisions and document the outcomes:

1.  Is Wildcard primarily a route-based adventure, a hub-and-expedition
    game, or a seamless open world?
2.  What is the intended emotional promise: discovery, creature
    attachment, tactical battles, story, home-building, social
    reputation or a deliberate blend?
3.  What is the main 10-minute gameplay loop?
4.  What should a player usually be doing between major story events?
5.  How much freedom should players have to visit dangerous locations
    early?
6.  What is the role of the world map versus walking through the world?
7.  Which actions should be available instantly, and which should
    require a trip to a settlement?
8.  What makes a creature worth discovering beyond its combat strength?
9.  What makes a town memorable beyond the services it provides?
10. What does Rep change in the world?
11. What is the reason to return Home?
12. What must be possible with Backbone only?
13. What is the minimum acceptable save/recovery behaviour?
14. Which features are essential to the core game, and which can be
    deferred?

Do not add systems to answer all these questions at once. Establish the
core identity first.

------------------------------------------------------------------------

## 19. Final recommendation

Wildcard does not need to become a Pokémon clone. It needs the same
level of intentionality that makes a great creature adventure work.

**Fix the world before expanding it.** Make travel logical, routes
memorable, destinations understandable and returns purposeful. Then
connect exploration to creatures, people, quests, finds, home and
reputation. After that, standardise the interface, settings and controls
so the player can focus on the adventure instead of fighting the game.

The most useful first deliverable is a **verified world graph and
first-hour walkthrough**, followed by the top five issues ranked by
player impact. That will expose whether the central problem is
geography, quest direction, progression, interface friction or a
combination. Use those findings to guide staged implementation rather
than asking a coding assistant to "improve everything" in one pass.

------------------------------------------------------------------------

## 20. Reference notes

These public reviews and official materials informed the comparison
principles. They are references for design analysis, not claims that
Wildcard should reproduce Pokémon's exact systems.

-   **Official Pokémon Scarlet and Pokémon Violet overview** ---
    describes a freely explorable world with towns blending into the
    wilderness and visible creatures across environments:
    https://www.pokemon.com/uk/pokemon-video-games/pokemon-scarlet-and-pokemon-violet
-   **GameSpot --- Pokémon Legends: Arceus review** --- discusses field
    research, the centrality of discovery, flexible exploration and the
    downside of grind-heavy progression gates:
    https://www.gamespot.com/reviews/pokemon-legends-arceus-review-what-pokemon-is-evolving/1900-6417818/
-   **GameSpot --- Pokémon Scarlet & Violet review** --- highlights the
    freedom of branching progression and the strengths and weaknesses of
    open-world exploration:
    https://www.gamespot.com/reviews/pokemon-scarlet-violet-review-a-braviary-new-world/1900-6417994/
-   **Kotaku --- Pokémon Scarlet and Violet review** --- critiques the
    loss of specific, memorable route identities and the navigational
    weakness of a broad but less distinctive world:
    https://kotaku.com/pokemon-scarlet-and-violet-review-nintendo-switch-1849843125
-   **Nintendo Life --- Pokémon Legends: Arceus review** --- emphasises
    exploration, discovery, creature interactions and a compelling sense
    of scale:
    https://www.nintendolife.com/reviews/nintendo-switch/pokemon-legends-arceus

### How to interpret this audit

-   **Verified project context:** Wildcard has the named journal
    categories; prior work flagged repeated cave-room templates,
    visually repetitive buildings, battle-scene work and Backbone
    support as relevant concerns.
-   **User-reported concern:** travel between places feels logically
    off.
-   **Design hypotheses:** other gaps listed above must be confirmed in
    the current build.
-   **Recommended standard:** every issue should eventually have a
    reproducible example, severity, player impact, proposed fix and
    acceptance test.

------------------------------------------------------------------------

## 21. Recommendations for the current build (3.32.1)

This section checks the audit against what build 3.32.1 actually does, using the source, the automated tests and
`docs/STORY_AND_PROGRESSION.md` / `docs/WORLD.md`. **Verified** means the code and a passing test show it.
**Not verified** means it has only been checked in a desktop browser or not checked at all. Nothing here has been played on a
real phone with a real Backbone.

### 21.1 Where the build already meets the audit

| Audit item | Status in 3.32.1 | Evidence |
|---|---|---|
| World graph, one source of truth (4.2, 17) | **Verified** | `G.WORLD` (24 places, 36 land routes, 5 ferries); `docs/STORY_AND_PROGRESSION.md` is checked against the game by `tests/e2e-guide.js` |
| Locked paths explain why (4.3, 14A) | **Verified** | badges + chapter rule in `js/access.js`; the gate names the chapter or badge count; money cannot buy access |
| Routes between towns (4.1) | **Partly** | 4 wild roads added where towns touched directly; other links go straight into large wild regions |
| Fast travel after discovery (4.1) | **Verified** | flight and helicopter go only to visited places, and ferries respect the gate rule |
| Distinct caves (5.2) | **Partly** | Glimmer Mine rebuilt and four new caves with themes and puzzles; older rooms still share templates |
| Battle readability (7.1) | **Partly** | new HUD: status panels, one-row commands, move cards with type/power/PP, target ring, low-HP state; desktop screenshots only |
| Controller complete (11, 14H) | **Partly** | Gamepad API + Android native input, remapping, hide-touch-buttons; **real Backbone not tested** |
| Settings grouped, reduced motion, colour-friendly HP (12) | **Verified** | Settings screen and `docs/SETTINGS.md`; `tests/e2e-settings.js` |
| Save slots (12.3) | **Partly** | slots and CONTINUE tested; interrupted writes, backgrounding and low storage not tested |

### 21.2 Top five fixes, ranked by player impact

1. **Do the Phase 0 baseline on a real phone and the real Backbone (audit 15, Phase 0).**
   The biggest unknown is not design but the device. Play the opening to the Keystone Badge on your phone, touch only, then again with
   the Backbone only. Log every place where you had to touch the screen, every unclear exit and every softlock.
   *Acceptance:* checklist sections A, D, H and J marked Pass/Partial/Fail with screenshots.

2. **Make the next step obvious at every moment (4.5, 8.1, 14E).**
   The quest tracker shows the objective, but not *where* in words a player can act on. Add the destination's place name and direction
   to every main-quest step ("Go south from Lanternrest along Stonebridge Road"). Add a "where next" line to the map screen, and
   mark the destination on the map.
   *Acceptance:* a new player can reach each chapter's destination without asking "where do I go?".

3. **Give the new spaces a reason to exist (5.3, 5.4, 8.2).**
   The four roads and seven sea islands are walkable but only hold trainers, items and flavour lines. Give each one small beat that
   ties into the story or the journal: a Finds entry, a rare creature only found there, a character who appears again later, or a
   shortcut that opens after a chapter.
   *Acceptance:* every road and island has at least one discovery recorded in the journal.

4. **Make later chapters longer and harder by design, not just by level (13, audit item "harder or longer").**
   The step counts are 5, 5, 5, 6, 4, 5, 4, 3, so chapters 5 to 8 get *shorter*. Add two or three objectives to each of them, spread
   across the cities already open: a trust encounter, a cave visit, a person to find. Check that no story battle needs a specific
   creature the game has not taught.
   *Acceptance:* the step count rises chapter by chapter, and wild levels and Arena strength rise steadily (the guide already shows the levels).

5. **Battle flow speed and clarity on a phone (7.2, 7.3, 14D).**
   Test a full battle on the phone. Check that the cards are big enough to tap, that the message bar does not need too many A presses,
   and that status effects say what they do in plain words. Consider adding a short "why" to failed moves ("It doesn't affect..." already exists;
   add one for missed and immune cases). Fill the portrait sky above the arena with something better than a gradient, or move the scene
   down.
   *Acceptance:* a battle can be finished with the Backbone alone, and no state is hidden behind the HUD at phone size.

### 21.3 Next after those

- **Towns and buildings (9):** check that the heal, shop, forge and Arena buildings are recognisable before reading the label. This
  has not been audited since the building work.
- **Journal cross-links (8.7):** a creature or Finds entry should link to the place where it was found.
- **Rep (8.6):** say on screen what reputation changes (discounts, new dialogue, access) when a milestone is reached.
- **Save safety (12.3):** test force-close in the middle of a battle and during a map transition, and test resuming after the app is
  backgrounded.
- **Balance (6.3):** run a quick check that no single creature or move dominates ordinary battles.

### 21.4 Decisions only the owner can make (from section 18)

1. Route-based adventure, hub-and-expedition, or open world? The current build is route-based with an open sea. Keep that?
2. How much should a player be able to visit dangerous places early? The current rule is badges + chapter, with no way round it.
3. Should Test Mode keep NO BATTLES, FLY ANYWHERE and UNLOCK EVERYTHING in the shipped APK?
4. What is the reason to return Home? Farming and building exist, but no story beat sends you back.

### 21.5 Suggested order

Phase 0 baseline (item 1) → quest direction (2) → chapter length (4) → road/island beats (3) → battle on device (5) → section 21.3.
Each step should end with the full test suite green, an APK and a short evidence report, as section 17 asks.
