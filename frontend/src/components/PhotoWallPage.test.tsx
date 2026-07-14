import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { translate } from "../i18n";
import { PhotoWallPage } from "./PhotoWallPage";

const wall = {
  id: "wall-1",
  owner_id: "user-1",
  name: "Summer wall",
  background_color: "#F6FAFF",
  created_at: "2026-07-14T08:00:00Z",
  updated_at: "2026-07-14T08:00:00Z",
  items: [],
};

vi.mock("../api/client", () => ({
  listPhotoWalls: vi.fn(async () => [wall]),
  getPhotoWall: vi.fn(async () => wall),
  listPhotos: vi.fn(async () => ({ items: [], total: 0, page: 1, page_size: 24 })),
  createPhotoWallShare: vi.fn(async () => ({ token: "share-token", path: "/#/share/walls/share-token", is_active: true })),
  createPhotoWall: vi.fn(),
  savePhotoWallLayout: vi.fn(),
  updatePhotoWall: vi.fn(),
}));

describe("PhotoWallPage sharing", () => {
  beforeEach(() => {
    vi.stubGlobal("navigator", { clipboard: { writeText: vi.fn().mockRejectedValue(new Error("permission denied")) } });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("keeps the generated link available when clipboard permission is denied", async () => {
    render(<PhotoWallPage t={translate("en-US")} accessToken="token" />);

    await waitFor(() => expect(screen.getByRole("button", { name: "Share" })).toBeEnabled());
    await screen.findByRole("button", { name: "Share" }).then((button) => button.click());

    expect(await screen.findByDisplayValue(`${window.location.origin}/#/share/walls/share-token`)).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Share link ready");
    expect(screen.getByRole("status")).not.toHaveClass("status-error");
  });
});
