export const EVENT_TYPE_LABEL: Record<string, string> = {
  net_practice: "Net Practice",
  league_match: "League Match",
  family_event: "Family Event",
  membership_fee: "Membership Fee",
  all_stars: "All Stars",
  dynamo: "Dynamo",
  match: "Match",
};

export const EVENT_TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: "net_practice", label: "Net Practice" },
  { value: "league_match", label: "League Match" },
  { value: "family_event", label: "Family Event" },
  { value: "membership_fee", label: "Membership Fee" },
];

export const KIDS_EVENT_TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: "all_stars", label: "All Stars" },
  { value: "dynamo", label: "Dynamo" },
  { value: "net_practice", label: "Net Practice" },
  { value: "match", label: "Match" },
];

// Available groups for multi-select in event creation
export const ALL_GROUPS = ["Men", "Women", "U-13", "U-15", "U-18"] as const;
export const ADULT_GROUPS = ["Men", "Women"] as const;
export const YOUTH_GROUPS = ["U-13", "U-15", "U-18"] as const;
