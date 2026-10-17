export const USERNAME_ALLOWED_REGEX = /^[a-z0-9._]+$/;

export interface ProfileValidationMessages {
  usernameRuleHint: string;
  websiteRuleHint: string;
  chooseUsernameValidation: string;
  usernameLengthValidation: string;
  usernameCharactersValidation: string;
  usernameEdgeValidation: string;
  usernamePunctuationValidation: string;
  websiteSchemeValidation: string;
  websiteInvalidValidation: string;
}

const defaultMessages: ProfileValidationMessages = {
  usernameRuleHint: "Use 3-20 lowercase letters, numbers, periods, or underscores.",
  websiteRuleHint: "Add a full link like https://yourbrand.com, or leave it blank.",
  chooseUsernameValidation: "Choose a username to continue.",
  usernameLengthValidation: "Username must be 3-20 characters long.",
  usernameCharactersValidation: "Only letters, numbers, periods, and underscores are allowed.",
  usernameEdgeValidation: "Username cannot start or end with a period or underscore.",
  usernamePunctuationValidation: "Username cannot use repeated or mixed punctuation together.",
  websiteSchemeValidation: "Website links must start with http or https.",
  websiteInvalidValidation: "Enter a valid website link.",
};

export const USERNAME_RULE_HINT = defaultMessages.usernameRuleHint;
export const WEBSITE_RULE_HINT = defaultMessages.websiteRuleHint;

export function normalizeUsernameInput(username: string) {
  return username.trim().replace(/\s+/g, "").replace(/^@+/, "").toLowerCase();
}

export function getUsernameValidationMessage(username: string, messages: ProfileValidationMessages = defaultMessages) {
  const normalized = normalizeUsernameInput(username);

  if (!normalized) {
    return messages.chooseUsernameValidation;
  }

  if (normalized.length < 3 || normalized.length > 20) {
    return messages.usernameLengthValidation;
  }

  if (!USERNAME_ALLOWED_REGEX.test(normalized)) {
    return messages.usernameCharactersValidation;
  }

  if (normalized.startsWith(".") || normalized.startsWith("_") || normalized.endsWith(".") || normalized.endsWith("_")) {
    return messages.usernameEdgeValidation;
  }

  if (normalized.includes("..") || normalized.includes("__") || normalized.includes("._") || normalized.includes("_.")) {
    return messages.usernamePunctuationValidation;
  }

  return null;
}

export function normalizeWebsiteInput(website: string) {
  const trimmed = website.trim();
  if (!trimmed) {
    return "";
  }

  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

export function getWebsiteValidationMessage(website: string, messages: ProfileValidationMessages = defaultMessages) {
  if (!website.trim()) {
    return null;
  }

  try {
    const parsed = new URL(normalizeWebsiteInput(website));
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return messages.websiteSchemeValidation;
    }

    return null;
  } catch {
    return messages.websiteInvalidValidation;
  }
}
