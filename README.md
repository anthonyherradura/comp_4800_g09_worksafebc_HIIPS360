# HIIPS360
An officer support/guidance tool.

> **Read this first.** HIIPS360 is a prototype built to learn whether officers would use a digitized version of the HIIPS sheets. It does not connect to WorkSafeBC systems, it does not write the inspection report, and everything it shows is a suggestion the officer confirms, edits or sets aside. It supports the officer's judgement. It does not replace it, and it does not change the inspection process, the officer's authority or the regulation.

---

## Table of contents

1. [The problem](#the-problem)
2. [What HIIPS360 does](#what-hiips360-does)
3. [A walk through a site visit](#a-walk-through-a-site-visit)
4. [How it fits with the inspection report](#how-it-fits-with-the-inspection-report)
5. [Scope: MVP and what comes later](#scope-mvp-and-what-comes-later)
6. [Who it is for](#who-it-is-for)
7. [Design principles](#design-principles)
8. [Technical overview](#technical-overview)
9. [Getting started](#getting-started)
10. [Content and ownership](#content-and-ownership)
11. [How we will know whether it worked](#how-we-will-know-whether-it-worked)
12. [Risks and known limitations](#risks-and-known-limitations)
13. [Project documents](#project-documents)

---



## The problem

Prevention Field Services officers produce roughly 50,000 inspection reports a year, about a quarter of them in construction. On every visit the officer has to establish two things: what hazards the work carries, and whether the employer has identified and controlled them.

WorkSafeBC already has the answers written down.

- The **Hazard Identification Inspection Protocol Sheets (HIIPS)** are organized by classification unit. Each one pairs a hazard with the control expected and the regulation that governs it, and sets out the officer's own protective equipment and on-site practices.
- The **OHS Regulation app** searches the law by keyword.

Neither is reachable in the way an inspection needs:

- Each sheet is a PDF of twenty pages or more.
- The library cannot be searched as a set.
- The sheets are not linked to the regulation text they cite.
- The OHS Regulation app knows nothing about the hazards of a particular site.

So the officer bridges the two from memory. That works for familiar work and less well for everything else. A newer officer, or one assigned outside their usual area, has no accumulated pattern to draw on. Hazards that cross into other parts of the regulation are the hardest to catch. A wood framing site brings machine and equipment lockout through saw blade changes and temporary power, and an officer would not think to look for that under framing.

**The cost shows up as uneven inspection quality, not as a visible failure.** A hazard that is passed is a control the employer is never asked about.

## What HIIPS360 does

HIIPS360 makes what the sheets already contain available at the moment it is needed. It connects four things the officer currently holds together from memory:

```
  Type of work  ──▶  Hazards  ──▶  Controls expected  ──▶  Governing regulation
  (from a photo)     (incl. those      (with questions        (Act, OHS Regulation,
                     crossing in        to ask and the         policies, guidelines,
                     from other         order to consider      standards)
                     parts of the       them)
                     regulation)
```

| Capability | What the officer gets |
|---|---|
| **Identify the work** | Photograph the site and be offered the protocol sheet that applies. Confirm it or change it. |
| **Hazard guidance** | A list of the hazards for that work to walk the site against, including cross-over hazards that are easy to walk past. Detail stays out of the way until a hazard is opened. |
| **Controls and risk** | For an opened hazard: questions for the employer and workers, the controls that should be present, the order controls should be considered in, and what raises or lowers the risk. |
| **Regulation reference** | Move from a hazard directly to the wording of the requirement that governs it, without searching the law separately. |
| **Evidence and summary** | Attach photos to a hazard, or mark it not applicable to this site. Review a summary showing every hazard on the sheet was addressed before leaving. |

The hierarchy is where the value sits. Recognizing that a ladder carries a fall risk is the easy part. What follows is the order of consideration (aerial lift, then scaffold or work platform, then ladder) with the requirements for inspection, training and safe access. The sheets hold that reasoning. HIIPS360 delivers it at the site, so a hazard the officer can name becomes an inspection they can defend.

## A walk through a site visit

An officer pulls up to a residential construction site. It was booked as framing, but the crew is also forming concrete and there is a scaffold up the side of the building.

1. **Arrive and photograph.** HIIPS360 offers the protocol sheet for framing or residential forming and flags scaffolds as related work. The officer accepts both.
2. **Glance at the plan.** The sheet lists the protective equipment for this kind of site, which the officer already has, and raises questions about engineered drawings and fall protection.
3. **Walk the site.** Perimeter fall protection is in place, so the officer records a photo showing it was reviewed.
4. **Open a hazard that looks wrong.** A ladder to the second floor is not secured and sits at the wrong angle. The sheet shows the questions to ask, the controls that should be there, the angle and extension requirements, and the regulation behind them. The officer photographs it from two angles.
5. **Mark what does not apply.** Confined space does not arise, so the officer marks it not applicable.
6. **Catch the hazard that crosses in.** Table saws are running without guarding. The sheet raised this under lockout and safeguarding even though the site was booked as framing. The officer would not have looked for it. Another photo goes against that hazard.
7. **Review before leaving.** In the truck, the summary shows every hazard on the sheet is either reviewed with evidence attached or marked not applicable. Nothing was missed.
8. **Write the report as usual.** The officer moves on and writes the inspection report in the usual way, outside HIIPS360.

## How it fits with the inspection report

HIIPS360 sits *before and alongside* the report, not in it. The sample inspection report in this project (a fall protection stop-work inspection at a two-storey townhouse under construction with roofing underway) shows the chain of reasoning HIIPS360 is meant to support:

| Officer's observation | Governing requirement cited |
|---|---|
| Workers on a 5:12 sloped roof with no fall protection, exposed to a 24 ft fall onto hard ground | OHS Regulation 11.2(1)(a): a fall protection system is required when a fall of 3 m (10 ft) or more may occur |
| Damaged or untagged equipment, workers unable to inspect a harness, a supervisor who did not correct unsafe conditions | Workers Compensation Act 21(2)(e): instruction, training and supervision |
| High risk of serious injury or death | Workers Compensation Act 90(1)(a): stop-work order |

That hazard-to-control-to-requirement reasoning is what HIIPS360 makes reachable on site. The observations, the judgement and the orders remain entirely the officer's, and the report is still written in the usual way.

## Scope: MVP and what comes later

The MVP is the smallest version worth using. It runs from arrival to leaving the site, and an officer can start an inspection, work through it and finish it without leaving the tool.

**First release (MVP)**

- [x] Identify the work from a photo taken on site, and confirm or change the sheet offered
- [x] Show the hazards for that work, including those that cross in from other parts of the regulation
- [x] Show the controls expected for each hazard, and the regulation that governs it
- [x] Attach one or more photos to a hazard, or mark it not applicable
- [x] Review the summary before leaving the site

**Left for later**

- Inspection preparation before the officer leaves: the plan, the protective equipment and site practices, and describing a job in words (typed or spoken) instead of photographing it
- Wider legal search across the Act, the Regulation, policies and guidelines together
- Employer conversation features: plain-language explanations of requirements, showing the employer a photo, and pointing to where a requirement is published

Each is useful, and none is needed to prove the concept holds.

## Who it is for

**Prevention officer.** Inspects workplaces across the range of work their region covers. Some of it they see constantly and know without thinking. Some they meet a few times a year, or for the first time. On any inspection they need the hazards that belong to the work in front of them, the controls that should be there, and the regulation behind both. The tool most helps a newer officer or one working outside their usual area, and it narrows the distance between an officer's strongest area and their least familiar one.

**Employers benefit indirectly.** Employers carry no written hazard assessment requirement, so the officer's ability to discuss hazards, controls and requirements is what moves their practice. An officer holding the hazard, the control and the requirement together can explain why something matters, not just cite the rule. That supports consult, educate and enforce.

## Design principles

- **Suggestion, not decision.** Every result can be confirmed, edited or set aside by the officer.
- **Reachable without the photo.** Identifying work from a photograph is the least certain part of the technology, so the guidance must be reachable by browsing the sheet library even when photo matching fails.
- **The site is the context.** Detail stays out of the way until the officer opens a hazard, and the officer should never be searching while standing in front of the work.
- **Works where the work is.** Field sites have poor or no connectivity. The prototype stores inspection state locally first and treats any network as optional.
- **Follows the WorkSafeBC design system.** See [UI and design system](#ui-and-design-system).
- **Says what it is.** The prototype states plainly, at every showing, that it is a prototype and not a product.

## Technical overview

> Section below describes the intended prototype approach. Adjust it to match what the team actually builds.

| Layer | Choice | Why |
|---|---|---|
| Front end | React | Component-based UI, and the design system's classes work with React (`react-bootstrap` or plain markup) |
| On-device storage | Dexie.js (IndexedDB) | Inspection state and photos are saved locally first, so the tool keeps working with no signal |
| Content and sync | MongoDB behind a small API | Holds the structured HIIPS content and receives synced inspections when a connection is available |
| Styling | `wsbc.css` (Bootstrap 5.3 plus the WorkSafeBC layer) | Keeps the prototype visually and behaviourally consistent with WorkSafeBC applications |

### Data flow

```
 Site photo ─▶ Work matcher ─▶ Suggested sheet ─▶ Officer confirms / changes
                                                        │
                                                        ▼
  HIIPS content (MongoDB) ◀── sync when online ──▶ Dexie (on device)
                                                        │
                        Hazard list ─▶ Hazard detail ─▶ Regulation text
                                                        │
                                      Photos / "not applicable" per hazard
                                                        │
                                                        ▼
                                              Inspection summary
```

### Core data (illustrative)

**Sheet content** (read-mostly, synced down to the device)

```js
// Dexie store definition (illustrative)
db.version(1).stores({
  sheets:      'id, classificationUnit, workType',
  hazards:     'id, sheetId, name',          // includes cross-over hazards
  controls:    'id, hazardId, order',        // order = hierarchy of controls
  regulations: 'id, citation',               // e.g. "OHS 11.2(1)(a)"
  inspections: 'id, sheetId, status, updatedAt',
  hazardRecords: '[inspectionId+hazardId], inspectionId, state',
  photos:      'id, inspectionId, hazardId'
});
```

**Per-hazard state** on an inspection is one of: *not yet addressed*, *reviewed with evidence attached*, or *not applicable to this site*. The summary is a view over these states, and any hazard still "not yet addressed" is listed so nothing is left behind.

### Where content comes from

All hazard, control, and regulation content comes from the existing HIIPS sheets and the published Act, Regulation, policies and guidelines. HIIPS360 does not author safety guidance.

### UI and design system

Built against the [WorkSafeBC UX/UI Design System](https://ux-static.online.dv.worksafebc.com/) (`wsbc.css` and Font Awesome 4.7).

- **Templates:** use one of the three provided (fixed, fluid or mixed). A mobile-first inspection flow will lean on the MobileSafe component set (action and tab bars, sliding cards, half and full modals, collapse lists, snackbars).
- **Typography and colour:** Halis headings with Verdana body text, and the warm grey palette. Do not change fonts or colours.
- **Buttons:** one primary per page, secondary buttons outlined, sentence-case action labels.
- **Feedback:** the autosave snackbar for save confirmation, and alerts at the top of the page with the alert icon.
- **Accessibility:** target WCAG 2.1 AA. Note that some default palette pairings (for example white text on the standard blue button, and orange H2 text on white) fall short of AA contrast, so review these with the UX team before release.

## Getting started

> These commands are a template. Replace them with the real repository details.

```bash
# 1. Clone the repository
git clone <repository-url>
cd hiips360

# 2. Install dependencies
npm install

# 3. Configure environment
cp .env.example .env        # set API base URL and any keys

# 4. Load sample HIIPS content
npm run seed                # loads the sample sheets into the content store

# 5. Start the app
npm run dev
```

**Prerequisites:** Node.js (current LTS), a modern mobile or desktop browser with IndexedDB, and access to the sample HIIPS sheets to build against.

**Try the demo scenario:** Start a new inspection, choose (or photograph) a residential framing site, accept the suggested sheet, open the ladder hazard, attach a photo, mark confined space not applicable, then open the summary.

## Content and ownership

- **The content is WorkSafeBC's.** The tool makes existing HIIPS guidance reachable. It does not create or change it.
- **Named owner needed.** A production tool needs a business area to run it and a named owner and maintenance cycle for the content. Guidance that is quietly out of date is worse than a PDF an officer knows to check.
- **Every sheet names the type of work it covers.** That is what makes matching a photo or description to a sheet possible.

| Role | Name |
|---|---|
| Sponsor | _To be confirmed_ |
| Content owner | _To be confirmed_ |
| Prototype author | Stewart Rogers, Innovation Strategy & Services |
| Build team | BCIT Industry Sponsored Student Projects, Fall 2026 |

## How we will know whether it worked

The prototype exists to prompt a decision, not to prove a hypothesis. Three signals tell us whether it worked:

1. **The idea reads without explanation.** Officers follow the flow from work type to hazard to control to regulation unprompted. A demonstration that needs a preamble has not shown anything.
2. **Officers recognize their own work in it.** The signal that the concept holds is an officer naming a hazard they would otherwise have passed. Hearing that it only shows them what they already know is the signal that it does not.
3. **It attracts an owner.** A named sponsor or a request for a pilot is the outcome worth having. Polite enthusiasm that goes nowhere is a finding too.

## Risks and known limitations

- **The uncertainty is need, not technology.** Officers manage without this tool today, and the sheets are already written. Whether they would use a digitized version often enough, in the moments that matter, cannot be answered from a desk.
- **Most likely failure:** a tool that is useful in principle and unused in practice. If officers say it only shows them what they know, the value is in the content, not the delivery. That is worth learning early and cheaply.
- **Photo identification is uncertain.** Guidance must remain reachable without it.
- **A prototype can be mistaken for a product.** Say so plainly at every showing.
- **A convincing wrong answer would undermine the idea** in front of the people whose support it needs, so officers should review the demonstration scenarios first.
- **Cost beyond the prototype is unknown.** The student program carries the build. What a production version would cost and save cannot be estimated until the shape of the thing is known.
- **Ownership is unresolved.** See [Content and ownership](#content-and-ownership).

## Project documents

| Document | Purpose |
|---|---|
| Innovation Intake: HIIPS360 (September 2026) | The problem, value proposition, validation plan, risks and recommendation |
| Product Requirements Document (V11) | Personas, the site-visit scenario, MVP scope, and user stories by capability |
| Sample inspection report: fall protection stop-work | Example of the reasoning (observation, control, requirement) HIIPS360 supports |
| WorkSafeBC UX/UI Design System | Components, tokens and usage rules the UI must follow |

---

*HIIPS360 supports the officer's judgement and does not replace it. Prevention officers enforce the Workers Compensation Act and the OHS Regulation. This tool helps them connect what they see to the rule that governs it, and does not make that connection for them.*
