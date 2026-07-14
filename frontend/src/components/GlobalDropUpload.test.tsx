import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { GlobalDropUpload } from "./GlobalDropUpload";

describe("GlobalDropUpload", () => {
  afterEach(() => cleanup());

  it("ignores internal photo wall drags even when the browser reports Files", () => {
    render(<GlobalDropUpload onDrop={vi.fn()} />);

    fireEvent.dragEnter(window, { dataTransfer: { types: ["Files", "application/x-wall-item"] } });

    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("shows the drop surface for external files", () => {
    render(<GlobalDropUpload onDrop={vi.fn()} />);

    fireEvent.dragEnter(window, { dataTransfer: { types: ["Files"] } });

    expect(screen.getByRole("status")).toBeInTheDocument();
  });
});
