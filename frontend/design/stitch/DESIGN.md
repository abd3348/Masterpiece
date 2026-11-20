# Design System: Campus Mate

## 1. Visual theme and atmosphere

A warm, composed student housing service for Amman. Preserve the Campus Mate identity and existing rental journey. Density 4 for public pages, 6 for administration; variance 5 for marketing and 3 for workflows; restrained motion 3. Public pages feel editorial and welcoming. Operational screens prioritize clear records, decisions and next actions.

Create two separate collections with matching screen names: `Mockups` and `Wireframes`. Every screen in the inventory needs both versions. These documents are preparation for generation, not evidence of completed Stitch screens.

## 2. Color palette and roles

- Paper `#F7F3EA`: warm page canvas.
- Surface `#FFFCF7`: elevated panels and forms.
- Deep Green `#173D36`: the single accent, primary actions and selected navigation.
- Ink `#1D302B`: primary text.
- Muted `#6D7972`: secondary labels; use stronger ink for small text where necessary for contrast.
- Border `#E3DED2`: subtle structural dividers.
- Sage `#E8EEE3`: quiet explanatory surfaces.
- White `#FFFFFF`: text on green buttons.

Use this warm palette consistently. Status meanings must have explicit text and icons, not color alone. Avoid pure black, neon, gradients and additional decorative accents.

## 3. Typography

DM Sans for body, navigation, forms and all dashboard headings. Public editorial headings may use Instrument Serif for a distinctive equivalent of the source's editorial character. Use 48px desktop public titles, 32px mobile titles, 28px section headings, 16px body with 1.5 leading, 14px labels, and 12px nonessential metadata. Limit paragraphs to about 65 characters per line. Dashboard headings use DM Sans at 28–32px. Use tabular numerals for JD amounts and dates.

## 4. Components

Primary buttons are deep green, 16px radius, at least 44px tall; secondary buttons use a subtle border. One dominant action per workflow section. AI actions use the approved small eight-ray asterisk/star with the `AI` label, matching the supplied reference. Do not replace it with an emoji, magic wand or glowing decoration.

Inputs have visible labels above, helper text and errors below, 12px corners and clear focus. Panels use 24px corners, 32px padding and a restrained warm shadow only where hierarchy benefits. Dense admin records use dividers and tables. Include selected, disabled, focus, loading, error and empty states where relevant.

Listing photos belong only in mockups. Use realistic Amman apartment imagery rather than unrelated stock scenery. Video regions have a play control, duration/label and a meaningful missing-video state.

## 5. Layout and navigation

Use a 1440px desktop canvas with content constrained to 1280px, 24px gutters, spacing 8/12/16/24/32/48/64px. Marketing uses a left-aligned asymmetric hero; never overlap text and photographs. Catalogs use two spacious listing columns. Property details use a broad content column and narrower summary. Admin uses a 264px left sidebar and structured workspace. Do not force every page into identical cards.

Public/tenant navigation includes `Partial offers`, which opens published offers; `Partial rentals` is the tenant's management screen. Tenant navigation contains a single `Rentals & arrangements` destination. Do not restore a separate Arrangements page. Preserve homes, roommates, favorites, meetings, requests and profile as appropriate to the role.

Below 768px, collapse content columns into one, replace wide navigation with a labeled menu and keep actions at least 44px. No horizontal page overflow. Desktop tables become readable stacked records.

## 6. Motion and interactions

Use subtle 160–240ms opacity/transform feedback and short staggered reveals. Active processing may use a contained skeleton shimmer. No perpetual decorative motion in reports or rental forms. Respect reduced motion. Static mockups must clearly convey selected and expanded states without relying on animation.

## 7. Product behavior that must remain visible

- Video analysis starts only from `AI · Analyze property video`. Its report is initially hidden. Disable it with an explanation when no video exists. Show processing, success and retry states. Current demo results must say no real video AI analysis was performed.
- Accepted requests, agreements, active rentals, keys and condition reports share the Rentals & arrangements journey.
- Tenant profile separates advertised rent, proposed negotiated rent and landlord-confirmed rent. Landlord profile offers confirm/decline. Do not present a pending proposal as agreed.
- Edit partial offer is a labeled modal with dates, daily price, notes, save and cancel. Accepted reservations lock affected dates and price.
- Admin report review presents `Delete listing` and `Mark solved`. Admin listing inspection contains moderation controls instead of tenant rent/meeting/request controls.
- Delete requires a reason and explanatory note; show owner notification with that reason. Mark solved closes the report while preserving the listing. Display an audit record.
- Include prepared examples: pending suspicious listing #9901, JD 20, illustrative risk 90/100; previously removed #9902; owner removal notice; two published partial offers at JD 12/day and JD 7/day. Clearly label these as demonstration data.
- Campus Mate does not collect or verify rent. Listing publication fee is JD 20. Rent and deposit are arranged directly with the landlord.

## 8. Wireframe rules

Wireframes are low fidelity, grayscale only: canvas `#F5F5F5`, panels `#FFFFFF`, lines `#C8C8C8`, text `#333333`. Use one plain sans-serif font. No photos, illustrations, image fills, gradients, brand colors or decorative shadows. Use outlined rectangles crossed diagonally for image/video space and gray lines for descriptive copy. Keep short navigation, field labels, statuses and action labels readable. Preserve the mockup's structure and action placement, but leave visual styling deliberately unspecified.

## 9. Avoid

No emojis, Inter, generic serif faces, pure black, neon glows, oversized gradient headlines, overlapping content, equal three-card feature rows, custom cursors, fake metrics, broken image links or promotional filler. Do not invent real AI findings, payment processing, email delivery or backend persistence that the demo does not implement.
