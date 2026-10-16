# Notebuddy · Your little companion on Anna

[한국어](README.md) · **English** · [Full feature gallery](../README.en.md)

Meet a friend from your own drawing, offer them a meal, tell them about your day and take a walk together. Notebuddy is a game about **growing alongside one companion through everyday care and little adventures**.

<p align="center">
  <img src="store/02-companion-and-care.png" width="900" alt="Mori, created from a drawing, beside conversation and feed, play, train and walk controls">
</p>

## What is available today?

Owner test update **1.4.2** uses game tool **0.9.1**. The store candidate remains **1.0.0 pending review**, not publicly released.

Since 1.2.0, each final guardian clear grants one unowned regional item: three standard rewards, then the rare reward. Open **My inventory** to see owned items. There are no duplicate or retroactive grants; after all four regional items, clears retain their coin rewards. Common collectible items and equipment are deferred. The home furniture shop is available in 1.4.0. Collection and browsing make no AI requests.

## Your first meeting

1. Open **Notebuddy** in the installed Anna test app. English is the default; choose **한국어** in the header for Korean.
2. Name your companion and choose **Surprise me** or **From a drawing or photo**.
3. For a reference-based friend, draw or select an image, then choose Meet. AI analyzes its features and creates a portrait.
4. Offer your new friend some food and say hello. Open the personality panel to learn about their voice and habits.

<p align="center">
  <img src="store/04-draw-your-companion.png" width="850" alt="The drawing editor with the sprout sketch used to create Mori above">
</p>

**The sprout in this editor became the Mori shown above.** Drawing supports colors, an eraser and undo; uploads support PNG, JPEG and WebP. Selecting or previewing an image does not call AI. Uncertain interpretations ask for confirmation, and generated appearances can differ from the reference.

## What would you like to do today?

| Activity | What you can do |
| --- | --- |
| **Care for your friend** | Feed, treat, play, train and rest. Watch fullness and bond, collect a daily gift, and claim daily quest rewards. |
| **Have a conversation** | Replies use personality, recent conversation and shared experience. Care also receives a short reaction. |
| **Get to know their personality** | Inspect curiosity, warmth, energy and caution as actual care and adventure experiences accumulate and inform replies and stories. |
| **Keep a growth album** | Reach new stages at levels 10, 30 and 50, then choose when to draw and save a new portrait. |
| **Take a walk** | Find XP, meet creatures or choose a story outcome. Six three-chapter arcs carry earlier choices and experiences forward. |
| **Explore a dungeon** | Discover Hellgate, Ice Kingdom, Dream Forest, Sunken Palace or Forgotten Clockwork City during walks, then enjoy automatic movement, room choices and battles. |
| **Browse little treasures** | Open **Browse items** for twenty-four illustrations with lore, rarity, planned rewards and fit requirements. |

Walk charges recover **one every five minutes, up to five**. Each discovered dungeon lasts **24 hours**, and another will not appear until it is cleared or expires. Each stage costs one charge; the first clear of each region per day awards 10 coins. Daily rules reset at midnight Korea time.

## A twenty-four-item book

Everyday adventures and the five dungeon collections each offer one head, neck, back and surrounding-effect design. Filter by region or type, search for a name, and open an item to take a closer look.

<p align="center">
  <img src="../docs/screenshots/items-catalog-112-ko.png" width="900" alt="All twenty-four items in the Korean item book; the same interface also supports English">
</p>

In 1.2.0, each final guardian clear grants one unowned regional item: three standard rewards, then the rare reward. Open **My inventory** to see owned items. There are no duplicate or retroactive grants; after all four regional items, clears retain their coin rewards. Common collectible items and equipment are deferred. The home furniture shop is available in 1.4.0. Collection and browsing make no AI requests.

## Return to your friend

Growth, recent conversation and artwork are stored separately for each user. Resume a pending story with **Continue walk**. Reopening the app does not require creating your companion again.

Chat, care reactions, personality, walk stories, drawing/photo analysis and new portraits use **the signed-in Anna account's AI allowance**. Random companions also use AI for initial personality creation. Browsing the book and converting a portrait to pixels make no additional AI calls. Existing companions without a personality can use **Meet your personality**.

Switching between English and Korean changes the interface and new replies while keeping names and previous conversations intact. To create a different companion, use **Start over** and confirm what will be deleted. Deleted companions and records cannot be recovered. [Privacy and data guide](PRIVACY.md)

---

[Full feature gallery](../README.en.md) · [Development and setup](DEVELOPMENT.en.md) · [Technical documents](docs/README.md) · [Deployment history](releases/README.md) · [Review history](reviews/README.md) · [Handoff](HANDOFF.md)

Screenshots show the real UI with separate test data. Mori is an actual Anna-generated result; the item book is from 1.1.2. [Screenshot sources](../docs/screenshots/README.md)

<p align="center"><img src="../docs/screenshots/inventory-120-ko.png" width="280" alt="1.2.0 Korean inventory with isolated test ownership"></p>

## My home

Open **My home**, buy furniture with game coins, then choose **Decorate**. Your companion chooses among validated layouts using its saved personality and carries the furniture into place. One room includes a free resting nest and eleven purchasable objects; each request places at most three stored objects. Undo restores the previous layout while keeping your purchases.

Decorate makes one bounded layout-selection request. Purchases, room visits, movement, idle life, undo and save-only retries use no AI. Room geometry, furniture and the companion are rendered separately.

In **1.4.2**, the home becomes a large pixel garden and separate indoor room. Your friend automatically follows paths through the door, changes poses with direction, and passes behind objects. Follow the camera, zoom in or pause to watch. Furniture opens in a separate panel.

Choose **Create movement** to generate directional poses from your own companion's current portrait. This explicitly uses one image AI request; the saved sheet is reused when walking or reopening. A different companion, growth stage or replacement portrait cannot reuse an old sheet. **Retry saving** reuses a received result without another AI call while the page remains open. This is separate from the existing free dungeon pixel conversion. An unavailable sheet is never replaced with another user's sample character.
