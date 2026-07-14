import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { translate } from "../i18n";
import { PhotoWallLibraryPage } from "./PhotoWallLibraryPage";

const walls = Array.from({ length: 13 }, (_, index) => ({
  id: `wall-${index + 1}`,
  owner_id: "user-1",
  name: `Wall ${index + 1}`,
  background_color: "#F6FAFF",
  created_at: "2026-07-14T08:00:00Z",
  updated_at: "2026-07-14T08:00:00Z",
  items: [],
}));

vi.mock("../api/client", () => ({
  listPhotoWalls: vi.fn(async () => walls),
}));

describe("PhotoWallLibraryPage", () => {
  afterEach(() => {
    cleanup();
    window.location.hash = "";
  });

  it("shows twelve preview cards per page and opens the new wall editor", async () => {
    render(<PhotoWallLibraryPage t={translate("en-US")} accessToken="token" onCreate={() => { window.location.hash = "#/walls/new"; }} onOpen={(id) => { window.location.hash = `#/walls/${id}`; }} />);

    await waitFor(() => expect(screen.getAllByRole("article")).toHaveLength(12));
    expect(screen.getByText("Wall 1")).toBeInTheDocument();
    expect(screen.queryByText("Wall 13")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Next page" }));
    expect(screen.getByText("Wall 13")).toBeInTheDocument();
    expect(screen.queryByText("Wall 1")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "New wall" }));
    expect(window.location.hash).toBe("#/walls/new");
  });
});
