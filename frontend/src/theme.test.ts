import { beforeEach, describe, expect, it } from "vitest";

import { loadTheme, saveTheme } from "./theme";

describe("color theme preference", () => {
  beforeEach(() => localStorage.clear());

  it("defaults to the white-blue theme and persists the white-pink choice", () => {
    expect(loadTheme()).toBe("blue");
    saveTheme("pink");
    expect(loadTheme()).toBe("pink");
  });
});
