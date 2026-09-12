# Printing and proof output

LibreLayer's Print Studio prepares a measured print sheet entirely in the browser. Open it from **File → Print Studio…** or with `Ctrl/⌘+P`.

## Page and image layout

- US Letter, Legal, Tabloid, A4, A3, A2, and bounded custom paper sizes
- Portrait and landscape orientation
- Millimetre margins and bleed
- Fit inside trim, fill through bleed, actual size from source PPI, or a custom percentage of the fitted size
- Centered, top-left, or numerical X/Y placement
- Trim marks, registration marks, and color bars
- Filename/profile captions and an optional job or copyright note
- Contact sheets made from all open documents with adjustable columns and gaps

Every option updates the preview immediately and is stored on the current browser profile. Invalid or stale stored values are normalized to safe limits before use.

## Output

**Export proof PNG** writes a raster proof at 144 PPI. **Print…** opens the same proof in a dedicated browser window whose `@page` rule matches the selected physical paper dimensions, then opens the browser print dialog. The original document and its layers are not changed.

Disable browser-added margins, headers, and footers when the printer dialog offers those options. Print at 100% when exact physical sizing matters; a driver-level “fit to page” option can override LibreLayer's measurements.

## Color boundary

Print Studio records a target profile, rendering intent, and black-point-compensation choice in the proof metadata. When **Printer manages color** is selected, color conversion is intentionally left to the operating system and printer driver. Selecting sRGB, Display P3, or Adobe RGB records the intended handoff but does not perform an exact printer-profile conversion.

LibreLayer does not currently import printer/paper ICC profiles or claim an ICC v2/v4 proofing engine. Exact device conversion, paper/ink simulation, ink limits, and separations remain separate unchecked roadmap work.
