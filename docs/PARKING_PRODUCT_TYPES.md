# Parking Product Types and Guidance

ParkNQuik presents four distinct parking data types: host listings, external facility previews, crowdsourced circling guidance, and verified partner occupancy. They have different actions and different evidence, so product copy and APIs must keep them distinct.

## Owner-listed spaces

Spaces listed by a ParkNQuik host are bookable. Drivers can review listing details, pricing, and requested time availability, then create a reservation through the marketplace. A listing's availability is tied to its booking schedule and reservation state.

## Commercial facility guidance

Commercial facilities discovered from external sources are previews for wayfinding. They are not ParkNQuik listings and cannot be booked, priced, or represented as having a confirmed open space or occupancy through discovery. OSM capacity/access tags may be shown as source-provided attributes; they do not establish current vacancy.

Verified facilities linked to a ParkNQuik zone may show crowdsourced parking-search guidance. The estimate describes circling time only. Show the estimate, sample count, and freshness only when the latest completed hourly window contains at least three completed sessions. If that threshold is not met, show no current estimate. Candidate previews without a verified linked zone do not collect or receive guidance.

## Language and routing

- Use **available to book** only for owner-listed spaces whose requested time is available.
- Describe commercial previews as **parking guidance** or **circling-time estimates**, never as available parking spaces.
- Do not infer an open-space count, capacity, occupancy, or price from circling-time reports.
- Route questions about a user's current booking, account, payment, or live listing availability to live application data. Static documentation can explain how these systems work, but cannot establish current state.

See [the system architecture](PARKPAL_SYSTEM_ARCHITECTURE.md) for the analytics and marketplace flows, and [production knowledge retrieval](../backend/docs/KNOWLEDGE_RETRIEVAL.md) for runtime retrieval and citation behavior.

## Verified partner occupancy

A verified operator can report facility-level available and occupied counts through an authenticated feed. Verification, discovery status, and feed freshness are independent. Show counts only within the configured freshness window, alongside partner identity and source update time. Expired feeds yield no counts. Never derive these counts from circling guidance or OSM capacity.

See [regional directory operations](REGIONAL_PARKING_DIRECTORY.md) for configuration, imports, partner mapping, and API contracts.
