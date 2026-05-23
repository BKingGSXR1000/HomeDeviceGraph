# Home Device Graph

Interactive, browser-based device network map for documenting home infrastructure: routers, switches, client devices, Wi-Fi/LAN links, notes, groups, and rough physical or logical layout.

The app runs entirely in the browser. It has no build step and no backend. Your working map is saved in browser `localStorage`, and JSON import/export is used for backups, sharing, and hand editing.

## Open Locally

Open `index.html` in a browser.

Because the app is plain HTML, CSS, and JavaScript, no package install is required. You can also serve the folder with any local static server if you prefer, but it is not required for normal use.

## Important Files

- `index.html` - page structure, toolbar, side panel, SVG canvas, menus, and controls.
- `style.css` - visual styling for the app, canvas, nodes, links, groups, toolbar, and dialogs.
- `app.js` - all application behavior: rendering, editing, layout, filtering, import/export, local save, and interaction handling.
- `device-network-map-loggia.json` - example/exported device graph data that can be imported through the app.
- `README.md` - project notes and usage instructions.
- `LICENSE` - project license.

## Editing The Map

Use the toolbar and side panel:

- Add devices with `Add device`.
- Select a device to edit its name, type, symbol, subtitle, port count, and notes.
- Shift-click devices to multi-select them.
- Connect selected devices with `Connect selected`, or use the manual connection form in the side panel.
- Select a connection to edit its label and type.
- Drag devices to reposition them.
- Group multiple selected devices with `Group selected`.
- Use the layout menu for automatic layout, experimental layout, or resetting to the initially loaded layout.
- Use filters to narrow the visible graph by device type, name text, and connection type.

## Device JSON

The editable data model is JSON with three top-level arrays:

- `nodes` - devices and infrastructure items.
- `connections` - links between nodes.
- `groups` - named collections of node IDs.

Common node fields include:

- `id`
- `name`
- `type`
- `kind`
- `portCount`
- `subtitle`
- `notes`
- `x`
- `y`

Common connection fields include:

- `id`
- `from`
- `to`
- `type`
- `label`

### Import JSON

Open the app, then use `System` -> `Load JSON`.

You can select a `.json` file or drag and drop one onto the load control. The imported file must contain at least `nodes` and `connections` arrays. If `groups` is missing, the app will add an empty groups array.

### Export JSON

Use `System` -> `Download JSON` to download the current graph as `device-network-map.json`.

Use `System` -> `Show / Copy JSON` to view the current JSON in the side panel and copy it manually. This is useful when you want to inspect, edit, or store the graph outside the browser.

### Local Save

Use `System` -> `Save locally` to save the current graph to browser `localStorage`.

The app also saves automatically after many editing actions. Local storage is browser-specific, so exporting JSON is the safest backup.

## Current Limitations

- Data is stored locally in the browser; there is no server-side sync.
- JSON import replaces the current in-browser graph.
- There is no schema validation beyond checking for required top-level arrays.
- Exported JSON may include personal device names, notes, layout positions, and network details.
- There is no separate sanitized export yet.
- Layer visibility is handled through filtering, not persistent toggleable layers.
- Sensitive devices or notes are not specially marked or protected.
- There is no built-in LLM prompt export yet.
- The app is a single-file JavaScript implementation, so larger feature additions may require refactoring.

## Planned Features

- Toggleable layers for showing and hiding parts of the map.
- Sensitive nodes that can be marked for privacy-aware handling.
- Sanitized export for sharing a cleaned version of the graph.
- LLM prompt export for generating a structured, privacy-aware summary of the device map.
