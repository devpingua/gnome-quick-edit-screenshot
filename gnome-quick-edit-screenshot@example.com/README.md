# GNOME Quick-Edit Screenshot

A powerful GNOME Shell extension for taking, annotating, and sharing screenshots quickly.

## Features

- **Area Screenshot**: Trigger a screenshot of a selected area with a configurable hotkey.
- **Annotation Editor**: An intuitive editor opens instantly after taking a screenshot.
- **Drawing Tools**: Annotate screenshots with tools like rectangles. The framework is built to be easily extended with more tools.
- **Output Options**: Copy the final image directly to your clipboard or save it as a PNG or JPG file.
- **Session History**: Automatically saves your last 5 editing sessions. Reopen them from the history menu to continue where you left off.

## Installation

1.  **Download:** Download the latest release from the [GNOME Extensions website](https://extensions.gnome.org/) (link to be added once published).
2.  **Copy Files:** Place the extension directory, `gnome-quick-edit-screenshot@example.com`, into `~/.local/share/gnome-shell/extensions/`.
3.  **Compile Schema:** The extension uses GSettings for history and configuration. You must compile the schema. Open a terminal and run:
    ```bash
    glib-compile-schemas ~/.local/share/gnome-shell/extensions/gnome-quick-edit-screenshot@example.com/schemas/
    ```
4.  **Restart GNOME Shell:** Press `Alt` + `F2`, type `r`, and press `Enter`. (Note: This only works on X11 sessions. On Wayland, you must log out and log back in).
5.  **Enable:** Open the **Extensions** app, find "GNOME Quick-Edit Screenshot", and turn it on.

## Configuration

The default hotkey to trigger a screenshot is **`<Super><Shift>X`**.

You can change this hotkey using `dconf-editor`:
1.  Install `dconf-editor` if you don't have it.
2.  Navigate to the path `/org/gnome/shell/extensions/gnome-quick-edit-screenshot/`.
3.  Find the `screenshot-hotkey` key and set your desired custom value.
