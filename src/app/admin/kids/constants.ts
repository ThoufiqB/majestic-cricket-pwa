export const KID_MESSAGES = {
  CREATE_SUCCESS: "Kid profile created successfully",
  UPDATE_SUCCESS: "Kid profile updated successfully",
  DELETE_SUCCESS: "Kid profile deleted successfully",
  REACTIVATE_SUCCESS: "Kid profile restored successfully",
  LINK_SUCCESS: "Parent linked successfully",
  FETCH_ERROR: "Failed to load kids",
  CREATE_ERROR: "Failed to create kid profile",
  UPDATE_ERROR: "Failed to update kid profile",
  DELETE_ERROR: "Failed to delete kid profile",
  REACTIVATE_ERROR: "Failed to restore kid profile",
  LINK_ERROR: "Failed to link parent",
};

export const VALIDATION_RULES = {
  NAME_MIN: 1,
  NAME_MAX: 50,
  EMAIL_FORMAT: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  YEAR_MIN: 1990,
  YEAR_MAX: new Date().getFullYear(),
};

export const VALIDATION_MESSAGES = {
  PARENT_EMAIL_REQUIRED: "Parent email is required",
  PARENT_EMAIL_INVALID: "Please enter a valid email",
  NAME_REQUIRED: "Kid name is required",
  NAME_TOO_LONG: "Name must be 50 characters or less",
  YEAR_REQUIRED: "Birth year is required",
  YEAR_INVALID: "Please select a valid birth year",
  MONTH_REQUIRED: "Birth month is required",
  MONTH_INVALID: "Please select a valid birth month (1–12)",
  DOB_FUTURE: "Birth year/month cannot be in the future",
};

export const UI_CONFIG = {
  KIDS_PER_PAGE: 50,
  SHOW_EVENT_COUNT: true,
};
