import type { CopyStrings } from "../data/locales/en";

type Copy = CopyStrings;

/** Fills {placeholders} in a translated string. */
export function fill(template: string, values: Record<string, string | number>) {
  return template.replace(/\{(\w+)\}/g, (match, key: string) => (key in values ? String(values[key]) : match));
}

const categoryKeys: Record<string, keyof Copy> = {
  All: "all",
  Electronics: "catElectronics",
  Vehicles: "catVehicles",
  "Home Goods": "catHomeGoods",
  Fashion: "catFashion",
  Hobbies: "catHobbies",
  Garden: "catGarden",
  Family: "catFamily",
};

/** Marketplace categories are stored in English; this shows them in the user's language. */
export function categoryLabel(value: string, copy: Copy) {
  const key = categoryKeys[value];
  return key ? String(copy[key]) : value;
}

const conditionKeys: Record<string, keyof Copy> = {
  New: "condNew",
  "Like New": "condLikeNew",
  Good: "condGood",
  Fair: "condFair",
};

export function conditionLabel(value: string, copy: Copy) {
  const key = conditionKeys[value];
  return key ? String(copy[key]) : value;
}

export function communityKindLabel(value: string, copy: Copy) {
  return value === "page" ? copy.kindPage : value === "group" ? copy.kindGroup : value === "channel" ? copy.kindChannel : value;
}

export function visibilityLabel(value: string, copy: Copy) {
  return value === "public" ? copy.visPublic : value === "private" ? copy.visPrivate : value;
}

export function listingStatusLabel(value: string, copy: Copy) {
  return value === "available" ? copy.available : value === "pending" ? copy.pending : value === "sold" ? copy.sold : value;
}
