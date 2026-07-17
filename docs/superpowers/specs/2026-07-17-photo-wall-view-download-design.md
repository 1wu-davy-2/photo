# Photo Wall View And Download Design

## Goal

Photo wall editing must remain lightweight while giving an authenticated user a clear way to inspect and download a wall photo.

## Image quality policy

- The photo asset shelf and inspector card use the 300-pixel thumbnail.
- The editable canvas and public shared wall use the 1920-pixel preview.
- Opening a photo from the wall starts with the 1920-pixel preview.
- The untouched original is requested only after the authenticated user clicks `View original` or `Download original`.
- Public shares never receive the original-image endpoint.

## Interaction

Selecting a wall item keeps the existing drag, resize, rotate, and remove behavior. The right inspector adds two commands below the filename:

- `View photo` opens the existing full-screen lightbox for the selected photo.
- `Download original` downloads through the authenticated `/download` endpoint.

The reused lightbox starts on the preview variant and retains its existing `View original` transition and loading state. The delete command is hidden when the lightbox is opened from a photo wall, because removing a wall item and deleting the underlying photo are different operations.

## Error handling

Download errors use the existing wall error banner. Closing the lightbox returns to the editor without changing selection or layout. Switching photos or closing the lightbox releases cached blob references through `AuthenticatedImage`.

## Verification

Component tests verify that wall canvas and inspector variants remain preview/thumbnail, `View photo` opens a preview lightbox, the wall lightbox does not expose photo deletion, and `Download original` calls the authenticated download client. Full frontend tests, production build, and browser verification are required.
