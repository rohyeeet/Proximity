export type KnowledgeScope = "flow" | "form" | "general";

export interface KnowledgeTopic {
  id: string;
  scope: KnowledgeScope;
  /** Groups topics into sections in the Guide's list view — topics with no category fall under "More". */
  category?: string;
  title: string;
  /** One line — shown in inline hover hints. */
  summary: string;
  /** Ordered how-to steps, when the topic is task-shaped. */
  steps?: string[];
  /** Explanatory paragraphs, when the topic is concept-shaped. */
  body?: string[];
  relatedTopicIds?: string[];
}

export const knowledgeBase: KnowledgeTopic[] = [
  // ---------- General ----------
  {
    id: "gs-entities",
    scope: "general",
    category: "Core concepts",
    title: "Entities, fields, and records",
    summary: "A form is an entity; its fields are columns; each submission is a record.",
    body: [
      "Every form you build is an \"entity\" — think of it like a database table. Each field on the form is a column on that table, and every time someone fills out the form, that's one row (a \"record\" or \"submission\").",
      "This matters because lookups and links don't point at vague labels — they point at real entities and real columns, the same way a foreign key points at another table's column.",
      "Example: \"Production Batch\" is an entity with columns like batch_id and reactor_temp_c. Every time a technician logs a batch, that's one record — B-2201, B-2202, and so on. When a Sampling form later needs to say \"this sample came from batch B-2201,\" it's pointing at that exact record, not retyping the batch number from memory.",
    ],
    relatedTopicIds: ["gs-pickers", "form-lookup-select", "form-linked-record"],
  },
  {
    id: "gs-pickers",
    scope: "general",
    category: "Core concepts",
    title: "Picking entities, fields, and values",
    summary: "Search boxes with a dropdown let you pick a real form, a real field, or a filter value.",
    steps: [
      "Click the picker — it opens a searchable list below it.",
      "Type to filter by name or code, or scroll the grouped list.",
      "Click a row to select it (or check multiple, for multi-pickers).",
      "Click the × on a chip, or the picker's own × icon, to clear a selection.",
    ],
    body: [
      "These pickers are used everywhere you'd otherwise have to type a hardcoded id: linking a flow node to a form, linking a lookup field to a source entity, choosing which field a validation rule checks, and narrowing a link down to a specific value on a specific column.",
      "In the field Collect app, a picker like this shows real prior submissions — e.g. picking which Production Batch a Sampling record belongs to shows actual batches like \"B-2201\", not a blank text box waiting for someone to type an ID correctly from memory.",
    ],
    relatedTopicIds: ["gs-entities"],
  },
  {
    id: "gs-publish",
    scope: "general",
    category: "Core concepts",
    title: "Drafts, versions, and publishing",
    summary: "Edits are saved automatically; Publish stamps a new version number.",
    body: [
      "Every change you make — dragging a node, editing a field, adding a rule — is saved immediately as you go, and survives closing the tab.",
      "Publishing doesn't discard anything; it just bumps the version number and marks the current state as the one live submitters/runs will see. You can keep editing after publishing — the button will offer to publish the next version once you've made a new change.",
      "For forms specifically: once a version is published, it's permanent — real submissions stay tied to the exact fields they were answered against, even after you publish a newer version with different fields. That's what lets old records keep making sense years later even as the form evolves.",
    ],
  },
  {
    id: "gs-export",
    scope: "general",
    category: "Core concepts",
    title: "Exporting records for reporting",
    summary: "\"Export to CSV\" on Records downloads every real submission, ready for a spreadsheet.",
    steps: [
      "Open Records for the form you want to report on.",
      "Click \"Export to CSV\" (visible to reviewers and admins).",
      "Open the downloaded file in Google Sheets, Excel, or Numbers.",
    ],
    body: [
      "Columns are the form's current fields, in order, using their labels as headers — plus Display ID, Review Status, Sync Status, Submitted By, Submitted At, and Version up front. If an older submission predates a field that's since been added, that cell is simply blank.",
      "Photo, document scan, and signature columns contain the real, working hosted URL for that file — click straight through from the spreadsheet. Geo point/boundary columns are written as plain \"lat, lng\" text.",
      "Test submissions (made from a form's Preview panel before publishing) are never included — only real field data.",
    ],
    relatedTopicIds: ["form-media-capture"],
  },

  // ---------- Flow ----------
  {
    id: "flow-getting-started",
    scope: "flow",
    category: "Start here",
    title: "Build your first flow, step by step",
    summary: "A worked example: turn a Start, two form steps, a review gate, and a milestone into a real process.",
    steps: [
      "Click \"Start\" in the module palette. This drops a Start node — every flow should have exactly one, marking where the process begins. It should never have anything pointing into it.",
      "With Start selected, click \"Form step\" — a connected step appears automatically. Link it to a real form, e.g. \"Feedstock Source Survey\", using the picker in the inspector.",
      "Select that new step and use \"Suggested next steps\" in the inspector (or the palette) to add a \"Review gate\" — e.g. \"Facility Manager Check\". This is where a reviewer approves or sends the submission back.",
      "Add a \"Correction loop\" node and drag a connection from the review gate back to it, then set that edge's kind to \"Correction\" in the edge inspector — this is the re-entry point a rejected submission goes back to for fixing.",
      "Keep chaining form steps and review gates for the rest of your real-world process (Transport, Intake, Production, Sampling...).",
      "Finish with a \"Milestone\" node (e.g. \"Cycle closeable\") connected from your last step, with nothing coming out of it — this marks the point the whole cycle is considered complete.",
      "Click \"Validate graph\" to catch anything disconnected, an unmarked loop, or a missing milestone before you publish.",
    ],
    body: [
      "This is exactly the shape of the seeded \"Isometric Biochar Standard Flow\": Facility Setup → Feedstock Source Survey → Facility Manager Check (review) → Transport Leg → Intake → Production Batch → Sampling → Lab COA (review) → Dispatch → End Use Confirmation → Cycle closeable (milestone), with a correction loop wired back from each review gate. Open that flow in fullscreen while following these steps to see a finished example side by side with what you're building.",
      "You don't have to build the backbone by hand at all if you've already set up Stages and Forms — \"Sync from stages\" (see that topic) generates the form-step chain for you, and you just add the review gates, branches, and milestone on top.",
    ],
    relatedTopicIds: ["flow-overview", "flow-node-types", "flow-sync"],
  },
  {
    id: "flow-overview",
    scope: "flow",
    category: "Start here",
    title: "What is a flow?",
    summary: "A flow is the sequence of steps, gates, and branches a project moves through.",
    body: [
      "A flow describes the lifecycle of one project or reporting cycle: which forms get filled out, in what order, who reviews what, where it can branch, and when it's \"closeable.\"",
      "Flows are built from modules (nodes) connected by lines (edges). This is the same modeling grammar used by BPMN process diagrams — sequence, parallel branches, conditional branches, and loops — kept intentionally simple here.",
      "Each domain pack has one flow, and its backbone is generated from your Stages — see \"Syncing a flow from stages.\" You still add review gates, branches, and milestones by hand on top of that skeleton.",
      "Concretely: the biochar domain pack's flow tracks one production cycle from a facility being set up all the way to proof the biochar reached its end use — every box on the canvas is one real step a real person or system does, and every arrow is \"this leads to that.\"",
    ],
    relatedTopicIds: ["flow-getting-started", "stages-overview", "flow-sync", "flow-node-types", "flow-connectors"],
  },
  {
    id: "flow-sync",
    scope: "flow",
    category: "Building your flow",
    title: "Syncing a flow from stages",
    summary: "\"Sync from stages\" turns your Stage → Form setup into connected steps automatically.",
    steps: [
      "Build out your stages and the forms inside them on the Forms & Stages page first.",
      "Open this domain pack's flow and click \"Sync from stages.\"",
      "A step is added for every form that doesn't have one yet, connected in stage order; steps for forms removed from a stage are taken out (their old connections are left for you to review, since something else may still point at them).",
      "The results panel lists exactly what changed.",
    ],
    body: [
      "Sync never touches anything you've customized: the moment you edit a connection — change its kind, add a condition, drag it to a different node — it stops being auto-managed, so your branches, review gates, and correction loops survive being synced again and again.",
      "Sync doesn't guess at branches. If two stages are really alternatives (e.g. two different packaging routes), sync still lays them out one after another — drop a Branch module and reconnect the auto-drawn edges into conditional ones to express the fork.",
      "Example: add a new \"Quality Recheck\" form to the Production stage, then click Sync — a new form-step node appears already wired into the chain right after the existing Production step, so you don't have to place and connect it by hand.",
    ],
    relatedTopicIds: ["flow-getting-started", "stages-overview", "flow-node-types", "flow-conditions"],
  },
  {
    id: "flow-node-types",
    scope: "flow",
    category: "Building your flow",
    title: "Module (node) types",
    summary: "Ten module types cover the start/end of the process, form steps, gates, branches, and automation.",
    body: [
      "Start — the single entry point of the flow. It should have no incoming edges; everything begins from here. Example: the very first box before \"Facility Setup.\"",
      "Form step — a submitter fills out a linked form. Example: \"Feedstock Source Survey\", where a field agent logs where the biomass came from.",
      "Branch — splits the flow into two or more conditional paths. Example: routing to a different packaging step depending on whether the output is \"bagged\" or \"bulk.\"",
      "Review gate — a reviewer approves or returns the previous step. Example: \"Facility Manager Check\" — a supervisor either approves the Feedstock Source Survey or sends it back.",
      "Correction loop — the re-entry point a returned submission goes back to. Example: \"Reopen Feedstock Source\", where a rejected survey lands so the field agent can fix and resubmit it.",
      "Automation — runs on its own, usually fed by a connector (a device or external system) rather than a person. Example: a \"Monitoring Report refresh\" that pulls the latest sensor readings automatically, with nobody filling out a form.",
      "Parallel group — marks concurrent steps that don't depend on each other. Example: lab testing and logistics paperwork happening at the same time after a batch is produced, instead of one waiting for the other.",
      "Wait — pauses until a condition or timer is met. Example: holding a batch for a 48-hour curing period before Sampling can start.",
      "Document — an auto-generated report or certificate, often the last computed step before a milestone. Example: a generated Certificate of Analysis once Lab COA is approved.",
      "Milestone — marks the point the cycle becomes \"closeable.\" Example: \"Cycle closeable\", the final box with nothing coming out of it — milestones should always be terminal.",
    ],
    relatedTopicIds: ["flow-getting-started", "flow-palette"],
  },
  {
    id: "flow-palette",
    scope: "flow",
    category: "Building your flow",
    title: "Building with the module palette",
    summary: "Click a module to add it — it auto-stacks onto whatever node you had selected.",
    steps: [
      "Click any node once to select it.",
      "Click a module in the left palette — a new node of that type appears, automatically connected from the node you had selected.",
      "The canvas re-arranges itself into tidy columns after every add, so you never have to manually lay things out.",
      "Click empty canvas to deselect, then click a module to drop an unconnected node instead (useful for starting a second branch).",
    ],
    body: [
      "Not sure what should come next? Select a node and check the inspector's \"Suggested next steps\" section on the right — it recommends module types that typically follow whatever you have selected (e.g. a Form step suggests Review gate or Branch next), so you're never staring at ten module options with no idea which one fits.",
    ],
    relatedTopicIds: ["flow-getting-started", "flow-connectors", "flow-auto-arrange"],
  },
  {
    id: "flow-connectors",
    scope: "flow",
    category: "Connections & rules",
    title: "Connecting, rewiring, and deleting",
    summary: "Drag from the small dot on a node's right edge to another node's left edge to connect them.",
    steps: [
      "Hover a node — small circular handles appear on its left (in) and right (out) edges.",
      "Drag from the right handle of one node to the left handle of another to create a connection.",
      "To rewire an existing connection, drag its endpoint to a different node.",
      "Click a node or edge and press Backspace/Delete, or use the inspector's delete button, to remove it.",
    ],
    body: [
      "Start nodes only show a right (out) handle, and Milestone nodes only show a left (in) handle — that's deliberate, since a start should never have something pointing into it and a milestone should never point onward to something else.",
    ],
    relatedTopicIds: ["flow-edge-kinds"],
  },
  {
    id: "flow-edge-kinds",
    scope: "flow",
    category: "Connections & rules",
    title: "Edge kinds",
    summary: "Sequential, parallel, conditional, or correction — pick the kind in the edge inspector.",
    body: [
      "Sequential — the default: do this, then that. Example: Feedstock Source Survey → Facility Manager Check.",
      "Parallel — both branches proceed at once (used for fan-out after a shared step). Example: after Production Batch, Sampling and Dispatch paperwork both start immediately rather than one waiting on the other.",
      "Conditional — only taken when its rule matches; give it a condition label and, ideally, a structured rule. Example: a Branch after Sampling only continues to \"Reprocessing\" when contamination_flag equals true.",
      "Correction — the loop-back edge from a review gate to a correction point. Example: Facility Manager Check → Reopen Feedstock Source, taken only when the reviewer rejects. Any cycle in the graph that isn't marked as \"correction\" is flagged by Validate graph as an error.",
    ],
    relatedTopicIds: ["flow-conditions", "flow-validate"],
  },
  {
    id: "flow-conditions",
    scope: "flow",
    category: "Connections & rules",
    title: "Rule-based (BRE) branch conditions",
    summary: "Conditional edges can check a real field on the upstream form, not just a label.",
    steps: [
      "Select a conditional edge — the inspector shows a \"Rule (BRE)\" section.",
      "It automatically finds the nearest upstream node that's linked to a form.",
      "Pick a field from that form, an operator (equals / not equals / greater than / less than), and a value.",
    ],
    body: [
      "This is the flow-side business rule engine hook: instead of a free-text guess like \"carrier route?\", the branch can actually check the value submitted for a specific field, e.g. carrier_type equals ammonia.",
      "Another concrete example: a Branch right after Sampling checks the upstream Sampling form's contamination_flag field — equals true routes to a Reprocessing correction loop, anything else continues on to Lab COA.",
    ],
    relatedTopicIds: ["flow-edge-kinds"],
  },
  {
    id: "flow-tracker",
    scope: "flow",
    category: "Connections & rules",
    title: "Tracking a metric per form step",
    summary: "Pick a numeric field and an aggregation (SUM/AVG/MIN/MAX) to roll up on the Overview flow summary.",
    steps: [
      "Select a form-step (or automation/document) node that's linked to a form.",
      "In the inspector's Tracker section, pick one of that form's numeric fields.",
      "Choose an aggregation from the dropdown: SUM, AVG, MIN, or MAX.",
    ],
    body: [
      "The tracker is computed live from that form's own submissions every time the Overview page loads — nothing is cached or precomputed, so it always reflects the current data.",
      "Example: a \"Facility Setup\" node tracking AVG of capacity_t_day surfaces the average declared facility capacity across every setup record on the Overview flow summary, next to that form's SLA and approval breakdown.",
    ],
    relatedTopicIds: ["flow-node-types", "gs-entities"],
  },
  {
    id: "flow-validate",
    scope: "flow",
    category: "Before you publish",
    title: "What Validate graph checks",
    summary: "Real structural checks: orphans, unreachable nodes, unmarked cycles, missing form links.",
    body: [
      "Errors (block publishing): a node with no connections at all; a node unreachable from the start; a cycle that isn't marked as a correction edge; a form/automation/document node whose linked form was deleted.",
      "Warnings (don't block, but worth fixing): a form step with no form linked yet; no start node, or a start node with something pointing into it; no milestone node, or a milestone with outgoing edges; a branch with fewer than two paths or a path with no condition set.",
      "Click any row in the results to jump straight to the node or edge it's about — no need to hunt for it on a crowded canvas.",
    ],
    relatedTopicIds: ["gs-publish"],
  },
  {
    id: "flow-auto-arrange",
    scope: "flow",
    category: "Before you publish",
    title: "Auto-arrange",
    summary: "Lays nodes out in columns by how many steps they are from the start.",
    body: [
      "Auto-arrange groups nodes into columns based on their distance from the flow's starting point(s), and spreads nodes within the same column vertically — the same layered layout used by most flowchart and BPMN tools. Correction loops are ignored when computing columns so they don't drag earlier steps backward.",
      "Tip: if the canvas ever looks tangled after a lot of manual dragging, click Auto-arrange to reset it to a clean, readable layout without losing any connections — and use Fullscreen alongside it on a large flow so nothing feels cramped.",
    ],
  },

  // ---------- Form ----------
  {
    id: "stages-overview",
    scope: "form",
    category: "Core concepts",
    title: "Stages: the process backbone",
    summary: "Stages are the ordered phases your process moves through — Setup, Source, Production...",
    body: [
      "A Stage groups the forms captured at one phase of the process (e.g. \"Facility Setup,\" \"Feedstock Source,\" \"Production\"). Stages are fully yours to edit, even on a pre-built domain pack: rename them, reorder them, add or remove forms, or create entirely new stages.",
      "Stages aren't just a label — they're what the flow is generated from. Reorder your stages or add a form to one, then open the flow and click \"Sync from stages\" to bring the process diagram up to date.",
    ],
    steps: [
      "Use the ↑/↓ buttons on a stage to move it earlier or later in the process.",
      "Use \"New form\" or \"Add existing form\" inside a stage to put a form in it (each form belongs to one stage).",
      "Use \"New stage\" at the bottom of the page to add a phase that doesn't exist yet.",
    ],
    relatedTopicIds: ["stages-connectors", "flow-sync", "gs-entities"],
  },
  {
    id: "stages-connectors",
    scope: "form",
    category: "Core concepts",
    title: "Binding connectors to a stage",
    summary: "Attach a SCADA/PLC/device feed to a stage so its automation status is visible at a glance.",
    body: [
      "Binding one or more connectors to a stage doesn't change any form logic — it's purely for visibility, so anyone looking at the process can see which stages are backed by live automation (green = connected, amber = degraded, red = disconnected) without digging into the Connectors page.",
      "Individual fields still use their own lookup/telemetry configuration (see \"Lookup / connector fields\") to actually pull values — stage-level binding is a status readout on top of that.",
    ],
    relatedTopicIds: ["stages-overview", "form-lookup-select"],
  },
  {
    id: "form-overview",
    scope: "form",
    category: "Core concepts",
    title: "What is a form?",
    summary: "A form is a data-entry template — its fields define one entity's shape.",
    body: [
      "A form defines what gets captured at one step of a flow: its fields, their types, validation, and how they relate to other forms. Every field you add here is a real column other forms and flow edges can later reference.",
      "Every form lives inside a Stage — see \"Stages: the process backbone\" for how stages, forms, and the flow relate.",
    ],
    relatedTopicIds: ["stages-overview", "gs-entities", "form-field-types"],
  },
  {
    id: "form-field-types",
    scope: "form",
    category: "Core concepts",
    title: "Field type categories",
    summary: "Basic input, structured capture, connector-backed, and relational/computed types.",
    body: [
      "Basic input — short/long text, number, date, boolean, single/multi select. This is also how you capture regional metadata like country, state, and district: a single/multi select (or short text) field, same as any other answer — there's no separate \"location\" field type needed for that.",
      "Structured capture — geo point/boundary, photo, document scan, signature, repeat group. Photo, document scan, and signature are real: they open the device camera or a file picker, upload to real hosted storage, and tag the photo/document with the submitter's GPS location at the moment of capture when the browser grants permission. Geo point captures a single GPS coordinate; geo boundary records an ordered sequence of points as you walk a perimeter, tapping \"Add point\" at each corner.",
      "Connector-backed — lookup / connector, which pulls its value from another form's records (real, see \"Lookup / connector fields\"), a live device parameter, or an external database (both still placeholders, clearly labeled as not yet connected).",
      "Relational & computed — linked record (a real foreign key to another entity — see \"Linked record fields\") and calculated field (derived automatically, not editable by submitters).",
    ],
    relatedTopicIds: ["form-lookup-select", "form-linked-record", "form-media-capture"],
  },
  {
    id: "form-media-capture",
    scope: "form",
    category: "Rules & preview",
    title: "Capturing photos, documents, signatures, and location",
    summary: "Real camera/file capture, real hosted storage, real GPS — geotagged where possible.",
    steps: [
      "Photo: tap to open the camera (or choose from the gallery on desktop), takes the picture, and uploads it automatically — a thumbnail confirms it's saved.",
      "Document scan: same capture/upload path as photo, just without forcing the camera specifically — a photo of a paper document or an existing file both work.",
      "Signature: draw with a finger or mouse on the pad, then \"Done\" to save it, or \"Clear\" to redo it.",
      "Geo point: \"Capture current location\" reads the device's GPS once and shows the coordinate.",
      "Geo boundary: \"Add point\" repeatedly as you walk a plot's edges — each tap adds one more point to the ordered list.",
    ],
    body: [
      "Every photo capture also tags itself with the submitter's GPS location at that exact moment, whenever the browser has location permission — this is separate from a geo point/boundary field, and happens automatically without the submitter doing anything extra.",
      "Everything captured this way is a real file in real hosted storage — it shows up as an actual clickable link in the CSV export and in Records, not a placeholder.",
    ],
    relatedTopicIds: ["form-field-types", "gs-export"],
  },
  {
    id: "form-lookup-select",
    scope: "form",
    category: "Links & lookups",
    title: "Lookup / connector fields",
    summary: "Pulls its value from another form's records, a device parameter, or an external system.",
    steps: [
      "Add a \"Lookup / connector\" field and select it.",
      "Choose the source kind: internal form, device telemetry, or external DB.",
      "Internal form: pick the source entity, optionally pick which of its fields (columns) to display, and optionally add a filter (see \"Filtering links by column and value\") — plus, optionally, \"Don't show records already linked elsewhere\" if each source record should only ever be picked once.",
      "Device telemetry: pick a connected device, then one of its telemetry parameters.",
      "External DB: name the table and column being referenced (there's no live schema to browse yet, so these are typed directly), plus a refresh interval.",
    ],
    body: [
      "\"Internal form\" lookups and Linked record fields are real: whoever fills out the form (in Preview or the Collect app) gets an actual searchable list of prior submissions to pick from, scoped to their own organization. Device telemetry and external DB lookups are still placeholders in this version — they're clearly labeled \"not yet connected\" rather than pretending to pull live data.",
    ],
    relatedTopicIds: ["form-link-filters", "gs-entities"],
  },
  {
    id: "form-linked-record",
    scope: "form",
    category: "Links & lookups",
    title: "Linked record fields",
    summary: "A real foreign key — which entity does this follow-up record get created against?",
    steps: [
      "Add a \"Linked record\" field and select it.",
      "Use the entity picker to choose which form/entity the follow-up record links to.",
      "Optionally narrow it with a filter, e.g. only allow linking to Production Batch records where batch_status equals approved.",
      "Optionally check \"Don't show records already linked elsewhere\" so a record can't be picked twice — e.g. so the same Production Batch can't be sampled by two different Sampling submissions by accident.",
    ],
    body: [
      "Example end to end: the Sampling form's \"Linked batch\" field links to Production Batch. When a field technician fills out Sampling in the Collect app, they search and pick a real batch like \"B-2201\" instead of typing a batch number from memory — and if exclusivity is on, once B-2201 has been sampled once, it drops off the list for the next Sampling submission.",
    ],
    relatedTopicIds: ["form-link-filters"],
  },
  {
    id: "form-link-filters",
    scope: "form",
    category: "Links & lookups",
    title: "Filtering links by column and value",
    summary: "Links aren't limited to a whole entity — narrow them to a column and a value too.",
    body: [
      "Both lookup and linked-record fields can carry an optional filter: pick a field (column) on the target entity, an operator (equals / not equals / contains), and a value. That turns \"link to Facility Setup\" into \"link to Facility Setup where facility_type equals Gasification\" — the same shape as a WHERE clause.",
      "This is what makes links flexible instead of all-or-nothing: you're not just pointing at another table, you're pointing at a specific column, and optionally a specific value within it.",
    ],
    relatedTopicIds: ["form-lookup-select", "form-linked-record"],
  },
  {
    id: "form-validation-rules",
    scope: "form",
    category: "Rules & preview",
    title: "Validation rules (BRE)",
    summary: "Structured, per-field rules with an outcome: pass, warning, hard stop, or send to review.",
    body: [
      "Required, range (min/max), regex (pattern), reconciliation (compare against another field on this form within a tolerance %), duplicate check (a set of fields that together must be unique), plus image quality / OCR confidence / spatial checks for media fields.",
      "Every rule has an outcome that decides what happens when it fails: pass silently, warn, hard-stop the submission, or route it to manual review.",
    ],
    relatedTopicIds: ["form-visibility-rules"],
  },
  {
    id: "form-visibility-rules",
    scope: "form",
    category: "Rules & preview",
    title: "Visibility rules",
    summary: "Show or hide other fields based on this field's answer.",
    steps: [
      "Select the controlling field (the one whose answer decides visibility).",
      "Add a rule: the value it must equal, and which fields to reveal when it matches.",
      "Try it in Preview — change the controlling field's value and watch dependent fields appear/disappear.",
    ],
  },
  {
    id: "form-preview",
    scope: "form",
    category: "Rules & preview",
    title: "Preview",
    summary: "A live, fillable rendering of the form — test it and submit real sample data before publishing.",
    body: [
      "Preview renders the exact same fields and field logic (visibility rules, real lookup/linked-record pickers, real photo/document/signature/location capture) a submitter would see in the Collect app, including a Desktop/Mobile toggle so you can check how it reads on a phone screen.",
      "\"Submit test response\" creates a real, isolated sample submission — including any photo, document, or signature you actually captured while testing — it's never shown in Records, never counted toward production totals, and never appears in the CSV export, so you can try the whole form end to end before publishing it for real use.",
    ],
    relatedTopicIds: ["form-media-capture"],
  },
];

export function getKnowledgeTopic(id: string): KnowledgeTopic | undefined {
  return knowledgeBase.find((topic) => topic.id === id);
}

export function getKnowledgeTopicsByScope(scope: KnowledgeScope): KnowledgeTopic[] {
  return knowledgeBase.filter((topic) => topic.scope === scope || topic.scope === "general");
}
