import { beforeEach, describe, expect, it } from "vitest";

import { readRoute, readShareToken } from "./routing";

describe("application routes", () => {
  beforeEach(() => { window.location.hash = ""; });

  it("recognizes photo wall share links without requiring a session", () => {
    window.location.hash = "#/share/walls/share-token-123";

    expect(readRoute()).toBe("share");
    expect(readShareToken()).toBe("share-token-123");
  });

  it("ignores malformed share token encoding", () => {
    window.location.hash = "#/share/walls/%E0%A4%A";

    expect(readShareToken()).toBeNull();
  });
});
