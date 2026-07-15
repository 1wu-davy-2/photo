import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { translate } from "../i18n";
import { UploadConfirmDialog } from "./UploadConfirmDialog";

describe("UploadConfirmDialog", () => {
  afterEach(() => cleanup());

  it("asks for confirmation with the detected photo count", () => {
    const onConfirm = vi.fn();
    render(<UploadConfirmDialog fileCount={3} folderName={undefined} t={translate("en-US")} onCancel={vi.fn()} onConfirm={onConfirm} />);

    expect(screen.getByRole("dialog")).toHaveTextContent("3 photos detected");
    fireEvent.click(screen.getByRole("button", { name: "Start upload" }));

    expect(onConfirm).toHaveBeenCalledTimes(1);
  });
});
