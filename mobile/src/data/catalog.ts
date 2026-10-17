// Paid plans and reel boosts need Stripe on the backend. While this is false the app hides every
// checkout screen and all AI tools are available to every signed-in user.
export const PAYMENTS_ENABLED = false;

import { ReelBoostPlan, SubscriptionPlan } from "../types/models";

export const reelBoostPlans: ReelBoostPlan[] = [
  {
    id: "starter",
    title: "Starter Push",
    priceLabel: "$5",
    budgetUsd: 5,
    estimatedViews: 1200,
    estimatedReach: 5000,
    durationDays: 2,
    badge: "Fast test",
    description: "Two days of priority placement in Reels and Explore to test fresh creative.",
  },
  {
    id: "growth",
    title: "Growth Burst",
    priceLabel: "$15",
    budgetUsd: 15,
    estimatedViews: 4800,
    estimatedReach: 18000,
    durationDays: 5,
    badge: "Best value",
    description: "Five days of priority placement in Reels and Explore for your strongest reel.",
  },
  {
    id: "viral",
    title: "Viral Blast",
    priceLabel: "$35",
    budgetUsd: 35,
    estimatedViews: 14000,
    estimatedReach: 50000,
    durationDays: 7,
    badge: "Scale hard",
    description: "Seven days of priority placement in Reels and Explore for reels with a proven hook.",
  },
];

export const subscriptionPlans: SubscriptionPlan[] = [
  {
    id: "weekly",
    title: "Weekly Creator Pass",
    priceLabel: "$3",
    cadence: "per week",
    description: "A short pass to try premium on your account before committing to a longer plan.",
    benefits: ["Premium badge on your profile", "Viral AI engine access", "AI text, image, and video tools", "AI avatar creator"],
  },
  {
    id: "monthly",
    title: "Premium Creator",
    priceLabel: "$10",
    cadence: "per month",
    description: "The full creator toolkit, billed monthly.",
    benefits: ["Everything in weekly", "Trend Hijacker AI", "Personal AI Growth Coach"],
  },
  {
    id: "yearly",
    title: "Yearly Growth Pass",
    priceLabel: "$120",
    cadence: "per year",
    description: "Everything in Premium Creator, billed once a year.",
    benefits: ["Everything in monthly", "One payment for the full year"],
  },
];

export const marketplaceCategories = [
  "All",
  "Electronics",
  "Vehicles",
  "Home Goods",
  "Fashion",
  "Hobbies",
  "Garden",
  "Family",
];
