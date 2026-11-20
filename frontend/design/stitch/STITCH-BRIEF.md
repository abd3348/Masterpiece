# Campus Mate — Stitch generation brief

Status: prepared; generation awaits Google sign-in.

Read DESIGN.md first. Create a Web project named Campus Mate. Produce two collections, Mockups and Wireframes, covering all 42 views below (84 screens total). Work in role-sized batches; preserve the same navigation, shared components, field labels and product rules across batches. Do not silently omit screens or claim completion before all are present. English UI; Jordanian names, areas, dates and JD currency.

Mockups: use the documented warm green identity, complete content and realistic apartment photos.

Wireframes: matching structure and actions, grayscale, plain sans-serif, generic copy lines, outlined crossed media rectangles. Absolutely no images or decorative styling.

## Batch: public

- `public-index`: A place to live. A place to belong. — Find a home and people who fit your next chapter. Source: `public/index.html`.
- `public-properties`: Find a place that feels like you. — Explore homes around Amman and your daily destination. Source: `public/properties.html`.
- `public-property`: Apartment #124 — Jubeiha, Amman · A space for your next chapter. Source: `public/property.html`.
- `public-market`: A little perspective on the market — Compare illustrative rents and activity across your areas. Source: `public/market.html`.
- `public-about`: Good spaces. Better company. — A home is where your next chapter begins. Source: `public/about.html`.
- `public-support`: How can we help? — A little guidance for your next move. Source: `public/support.html`.
- `public-faq`: Frequently asked questions — Answers about homes, people and your rental journey. Source: `public/faq.html`.
- `public-privacy`: Privacy in this preview — How your information and media are handled. Source: `public/privacy.html`.
- `public-terms`: Using the project preview — Clear expectations for the Campus Mate demonstration. Source: `public/terms.html`.
- `state-video-analysis`: Apartment #124 — Video analysis · Expanded report state Source: `public/property.html · analysis result`. Show the expanded video analysis result only after the AI action.
- `public-partial-offers`: Partial offers — Published private/shared rooms; area/type filters; JD 12/day and JD 7/day examples. Source: `public/partial-offers.html`.

Generate this batch in Mockups, then matching Wireframes. Keep each view separately named.

## Batch: auth

- `auth-login`: Good to have you back. — Your next chapter. Unlocked. Source: `auth/login.html`.
- `auth-register`: Create your account. — Your place. Your people. Your next chapter. Source: `auth/register.html`.

Generate this batch in Mockups, then matching Wireframes. Keep each view separately named.

## Batch: tenant

- `tenant-home`: Welcome back, Sara. — Your next chapter, all in one place. Source: `tenant/home.html`.
- `tenant-preferences`: Your space. Your preferences. — Tell us what makes a place feel like home. Source: `tenant/preferences.html`.
- `tenant-roommates`: Find your kind of people — Compare shared routines. Choose who feels right for you. Source: `tenant/roommates.html`.
- `tenant-favorites`: Your saved places — Keep the spaces you like together while exploring. Source: `tenant/favorites.html`.
- `tenant-request`: Make your next move — Send the landlord your dates and rental preferences. Source: `tenant/request.html`.
- `tenant-requests`: My requests — Follow the journey from landlord review to move-in. Source: `tenant/requests.html`.
- `tenant-rentals`: My rentals & arrangements — Accepted requests, agreements and rental stays in one place. Source: `tenant/rentals.html`.
- `tenant-inspection`: A first look at your new home — Review the apartment condition before handover. Source: `tenant/inspection.html`.
- `tenant-payment`: Confirm your arrangement — Agree rent, deposit and payment directly with the landlord. Source: `tenant/payment.html`.
- `tenant-sublets`: Partial rentals — Offer a room for a fixed date range and manage requests yourself. Source: `tenant/sublets.html`.
- `tenant-meetings`: Meetings — Meet your future roommate or landlord by video. Jordan time. Source: `tenant/messages.html`.
- `tenant-profile`: Your profile — Your contact details, housing life and agreed rental price. Source: `tenant/profile.html`.
- `tenant-condition`: Every detail, documented — Move-in and move-out walkthroughs for Apartment #124. Source: `tenant/condition.html`.
- `state-edit-offer`: Edit your offer — Partial rental · Edit dialog state Source: `tenant/sublets.html · edit dialog`.

Generate this batch in Mockups, then matching Wireframes. Keep each view separately named.

## Batch: landlord

- `landlord-dashboard`: Manage your properties — Publish each property for JD 20. Rent is paid directly to you. Source: `landlord/dashboard.html`.
- `landlord-requests`: Your rental requests — Review tenant requests, their roommates and proposed rent. Source: `landlord/requests.html`.
- `landlord-bookings`: Rental arrangements — Follow tenant arrangements and rental dates. Source: `landlord/bookings.html`.
- `landlord-add`: A new space. A new beginning. — Tell future tenants what makes your property feel like home. Source: `landlord/add-property.html`.
- `landlord-meetings`: Meetings — Invite tenants and arrange your property conversations. Source: `landlord/messages.html`.
- `landlord-profile`: Your profile — Your contact details and rent proposals awaiting confirmation. Source: `landlord/profile.html`.
- `landlord-condition`: Every detail, documented — Review move-in and move-out reports for your rental. Source: `landlord/condition.html`.

Generate this batch in Mockups, then matching Wireframes. Keep each view separately named.

## Batch: admin

- `admin-overview`: A thoughtful view of the community — Review people, spaces, reports and platform activity. Source: `admin/dashboard.html`.
- `admin-users`: Community members — Manage account access and community participation. Source: `admin/dashboard.html?tab=users`.
- `admin-properties`: Property review — Review listings, fees and rule-based risk. Source: `admin/dashboard.html?tab=properties`.
- `admin-reports`: Community reports — Review concerns and resolve submitted reports. Source: `admin/dashboard.html?tab=reports`. Include direct Delete listing, Mark solved and Inspect details actions.
- `admin-analysis`: Listing analysis — Rule-based checks on prices and listing completeness. Source: `admin/dashboard.html?tab=ai`.
- `admin-activity`: Platform activity — A record of community and property actions. Source: `admin/dashboard.html?tab=activity`.
- `admin-profile`: Your profile — Your administrative account and contact details. Source: `admin/profile.html`.
- `admin-listing-inspection`: Inspect reported listing — Report context, saved demo analysis, Delete listing and Mark solved. No tenant rental actions. Source: `public/property.html · admin role`.

Generate this batch in Mockups, then matching Wireframes. Keep each view separately named.

## Verification before delivery

Check every listed ID exists in both collections; wireframes have no image fills; admin inspection has no Request to rent; AI star matches the reference; report initially hidden; Partial offers navigation exists; merged Rentals & arrangements exists; owner removal notice and negotiated price confirmation are shown. Review desktop and mobile layouts for clipping and legibility.
