import type { Lane, Priority } from "./types";

export const FIELD_MANAGEMENT_BRIEF = "Build farmer field management.";

export function isFieldManagement(source: string) {
  return /\bfield management\b/i.test(source);
}

export type FieldLeaf = {
  name: string;
  statement: string;
  priority: Priority;
  rank: number;
  persona: string;
  test: RegExp;
  story: string;
  acceptance: string[];
  tasks: { lane: Lane; title: string }[];
  tests: { title: string; steps: string[]; expected: string }[];
};

export const FIELD_LEAVES: FieldLeaf[] = [
  {
    name: "Create Field",
    statement: "Create a field with a name",
    priority: "must",
    rank: 1,
    persona: "Farm operator",
    test: /^Create a field\b/i,
    story: "As a farm operator, I want to create a field, so that work has a place to be recorded.",
    acceptance: [
      "Saving requires a name.",
      "The new field appears in the farm's field list.",
      "A second field with the same name is rejected.",
    ],
    tasks: [
      { lane: "client", title: "Build the create-field form: name, save, and the duplicate-name error." },
      { lane: "backend", title: "Persist a field on the farm and reject a duplicate name." },
      { lane: "qa", title: "Verify create field against every acceptance line." },
    ],
    tests: [
      {
        title: "Create a named field",
        steps: ["Open the farm", "Create a field named North 40", "Save"],
        expected: "North 40 appears in the field list.",
      },
      {
        title: "Name is required",
        steps: ["Open create field", "Leave the name empty", "Save"],
        expected: "Save is blocked and no field is stored.",
      },
      {
        title: "Duplicate name",
        steps: ["Create North 40", "Create another field named North 40"],
        expected: "The second save is rejected and the list still has one North 40.",
      },
    ],
  },
  {
    name: "Edit Field",
    statement: "Edit a field's name without losing its history",
    priority: "must",
    rank: 4,
    persona: "Farm operator",
    test: /^Edit a field\b/i,
    story: "As a farm operator, I want to edit a field, so that the name stays right and the history stays attached.",
    acceptance: [
      "The operator can change the field name.",
      "Activities already logged on that field remain on it.",
      "An empty name is rejected and the previous name stays.",
    ],
    tasks: [
      { lane: "client", title: "Build edit field: change the name and show the empty-name error." },
      { lane: "backend", title: "Update the field name in place so existing activities keep the same field." },
      { lane: "qa", title: "Verify edit field against every acceptance line." },
    ],
    tests: [
      {
        title: "Rename keeps history",
        steps: ["Log an activity on North 40", "Rename the field to North Forty", "Open its history"],
        expected: "The activity is still on North Forty.",
      },
      {
        title: "Empty rename",
        steps: ["Open North 40", "Clear the name", "Save"],
        expected: "The save is rejected and the field is still named North 40.",
      },
    ],
  },
  {
    name: "Delete Field",
    statement: "Delete a field only after the operator confirms",
    priority: "must",
    rank: 4,
    persona: "Farm operator",
    test: /^Delete a field\b/i,
    story: "As a farm operator, I want to delete a field, so that a retired place leaves the working list without a mis-tap.",
    acceptance: [
      "Delete asks for confirmation before anything is removed.",
      "After confirmation the field is gone from the list.",
      "Cancelling the confirmation leaves the field and its activities in place.",
    ],
    tasks: [
      { lane: "client", title: "Build delete field with a confirm step and a cancel path." },
      { lane: "backend", title: "Remove the field only after confirmation, along with its activities." },
      { lane: "qa", title: "Verify delete field against every acceptance line." },
    ],
    tests: [
      {
        title: "Confirm delete",
        steps: ["Open North 40", "Choose delete", "Confirm"],
        expected: "North 40 is no longer in the field list.",
      },
      {
        title: "Cancel delete",
        steps: ["Open North 40", "Choose delete", "Cancel"],
        expected: "North 40 and its activities are unchanged.",
      },
    ],
  },
  {
    name: "Field Details",
    statement: "Open field details for the name and activity count",
    priority: "must",
    rank: 2,
    persona: "Farm operator",
    test: /^Open field details\b/i,
    story: "As a farm operator, I want to open field details, so that I can see what the field is before I log or read further.",
    acceptance: [
      "Details show the field name and how many activities it has.",
      "Details open from the field list.",
      "A missing field shows not found, not an empty field.",
    ],
    tasks: [
      { lane: "client", title: "Build the field details screen from the list." },
      { lane: "backend", title: "Return the field and its activity count, or not found." },
      { lane: "qa", title: "Verify field details against every acceptance line." },
    ],
    tests: [
      {
        title: "Details from the list",
        steps: ["Open the field list", "Choose North 40"],
        expected: "Details show the name North 40 and the activity count.",
      },
      {
        title: "Missing field",
        steps: ["Open a field id that was deleted"],
        expected: "The screen says the field was not found.",
      },
    ],
  },
  {
    name: "Field History",
    statement: "Read field history from newest to oldest",
    priority: "must",
    rank: 2,
    persona: "Farm operator",
    test: /^Read field history\b/i,
    story: "As a farm operator, I want to read a field's history, so that I can see what happened there this season.",
    acceptance: [
      "Activities are listed from newest to oldest.",
      "A field with no activities shows an empty history, not an error.",
      "An activity logged on a different field does not appear.",
    ],
    tasks: [
      { lane: "client", title: "Build field history, newest first, with an empty state." },
      { lane: "backend", title: "Return only that field's activities, ordered newest first." },
      { lane: "qa", title: "Verify field history against every acceptance line." },
    ],
    tests: [
      {
        title: "Newest first",
        steps: ["Log planting on Monday and spray on Wednesday for North 40", "Open history"],
        expected: "Wednesday's spray is above Monday's planting.",
      },
      {
        title: "Other fields stay out",
        steps: ["Log an activity on South 10", "Open North 40 history"],
        expected: "The South 10 activity is absent.",
      },
    ],
  },
  {
    name: "Field Activities",
    statement: "Log field activities with a type, a date, who did it, and a note",
    priority: "must",
    rank: 2,
    persona: "Field crew",
    test: /^Log field activities\b/i,
    story: "As field crew, I want to log a field activity, so that the history is written by the person who did the work.",
    acceptance: [
      "An activity requires a type and a date.",
      "Who did it and a note are saved with the activity.",
      "The saved activity appears on that field's history.",
    ],
    tasks: [
      { lane: "client", title: "Build log activity: type, date, who, note, and save." },
      { lane: "backend", title: "Store the activity on the chosen field." },
      { lane: "qa", title: "Verify field activities against every acceptance line." },
    ],
    tests: [
      {
        title: "Log a spray",
        steps: ["Open North 40", "Log spray, today, Alex, note 'west half'", "Save"],
        expected: "The spray appears on North 40 history with Alex and the note.",
      },
      {
        title: "Type is required",
        steps: ["Open log activity", "Leave the type empty", "Save"],
        expected: "Save is blocked and no activity is stored.",
      },
    ],
  },
  {
    name: "Field Reports",
    statement: "Export field reports for one field and a date range",
    priority: "later",
    rank: 8,
    persona: "Farm operator",
    test: /^Export field reports\b/i,
    story: "As a farm operator, I want a field report, so that I can hand someone the season's record for one field.",
    acceptance: [
      "A report covers one field and a date range.",
      "The report lists the activities in that range.",
      "A range with no activities produces a report that says so.",
    ],
    tasks: [
      { lane: "client", title: "Build the report request: field, start date, end date, and download." },
      { lane: "backend", title: "Build the report from that field's activities in the range." },
      { lane: "qa", title: "Verify field reports against every acceptance line." },
    ],
    tests: [
      {
        title: "Season report",
        steps: ["Log two activities on North 40 in June", "Export June for North 40"],
        expected: "The report lists those two activities and no others.",
      },
      {
        title: "Empty range",
        steps: ["Export a month where North 40 has no activities"],
        expected: "The report says there were no activities in the range.",
      },
    ],
  },
  {
    name: "Field Analytics",
    statement: "See field analytics for activity counts by type",
    priority: "later",
    rank: 9,
    persona: "Farm operator",
    test: /^See field analytics\b/i,
    story: "As a farm operator, I want field analytics, so that I can see which kinds of work happened across the farm.",
    acceptance: [
      "Analytics show activity counts by type.",
      "The counts match the activities that were logged.",
      "A farm with no activities shows zeroes, not an error.",
    ],
    tasks: [
      { lane: "client", title: "Build the analytics view of counts by activity type." },
      { lane: "backend", title: "Aggregate activity counts by type for the farm." },
      { lane: "qa", title: "Verify field analytics against every acceptance line." },
    ],
    tests: [
      {
        title: "Counts match the log",
        steps: ["Log two sprays and one planting", "Open analytics"],
        expected: "Spray shows 2 and planting shows 1.",
      },
      {
        title: "Empty farm",
        steps: ["Open analytics before any activity is logged"],
        expected: "Every type shows 0 and the page does not error.",
      },
    ],
  },
];

export const FIELD_THEMES = FIELD_LEAVES.map((leaf) => ({
  key: leaf.name.toLowerCase().replace(/\s+/g, "-"),
  name: leaf.name,
  rank: leaf.rank,
  test: leaf.test,
}));

export const FIELD_COPY = {
  problem:
    "The farm has no single place that owns its fields. Names live in someone's head, and the work done on a field cannot be listed, corrected, or removed with the field.",
  workaround: "Notebook, spreadsheet, or a group chat.",
  cost: "A field can be worked all season and still have no record the operator can trust.",
  users: [
    {
      role: "Farm operator",
      why: "Owns the list of fields and needs each one to keep its history.",
      jobs: ["Create a field", "Open field details", "Read field history"],
    },
    {
      role: "Field crew",
      why: "Does the work and is the person who can log it.",
      jobs: ["Log field activities"],
    },
  ],
  goals: [
    "Make the field list the place the farm trusts.",
    "Keep every activity on the field where it happened.",
  ],
  assumptions: [
    "Field management is the capability being asked for, inferred from a short request.",
    "A field is the unit of record.",
    "Reports and analytics wait until create, log, and history are in use.",
  ],
  constraints: ["No device or connectivity limit was stated. Ask before requiring offline."],
  competitors: [
    {
      name: "Notebook, spreadsheet, and chat",
      note: "The incumbent. Fields and activities live wherever the crew already writes.",
    },
    {
      name: "Climate FieldView, Granular, FarmLogs, AgriWebb",
      note: "Existing farm-record products. Ask which of these the buyer already pays for.",
    },
  ],
  metrics: [
    "Fields with a name the operator can find again.",
    "Share of field activities logged the same day.",
    "Time to read one field's history.",
  ],
  questions: [
    "Who is allowed to delete a field?",
    "Which activity types matter in the first season?",
    "Does logging have to work with no signal?",
  ],
  flows: [
    {
      name: "Create a field and log work",
      steps: ["Create the field", "Open its details", "Log an activity", "Read the history"],
    },
    {
      name: "Correct or retire a field",
      steps: ["Open the field", "Edit the name or delete it after confirmation"],
    },
  ],
  edgeCases: [
    "Two people create a field with the same name.",
    "A field is renamed after activities exist.",
    "Delete is cancelled.",
    "A report is requested for a range with no activities.",
  ],
  analytics: [
    { name: "field_created", when: "An operator saves a new field." },
    { name: "field_edited", when: "An operator saves a new name." },
    { name: "field_deleted", when: "An operator confirms delete." },
    { name: "activity_logged", when: "Crew saves an activity on a field." },
    { name: "field_history_opened", when: "An operator opens field history." },
  ],
  nonFunctional: [
    "Create and log are usable on a phone outdoors.",
    "History for one field stays in order when two people log the same day.",
  ],
  dependencies: ["No external system was named. The farm's field list starts empty."],
  risks: [
    "Delete without a confirm step will erase a season of history.",
    "Reports and analytics before the log is in use will chart an empty farm.",
  ],
};
