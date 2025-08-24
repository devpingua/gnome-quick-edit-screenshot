import { Extension } from 'resource:///org/gnome/shell/extensions/extension.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as Gio from 'gi://Gio';
import * as Adw from 'gi://Adw?version=1';
import Mutter from 'gi://Mutter?version=14'; // Updated: Import Mutter for ActionMode

import { EditorWindow } from './editor.js';

// D-Bus constants for GNOME Screenshot service
const SCREENSHOT_SERVICE = 'org.gnome.Shell.Screenshot';
const SCREENSHOT_INTERFACE = SCREENSHOT_SERVICE;
const SCREENSHOT_PATH = '/org/gnome/shell/Screenshot';

// promisify() is a helper to wrap GIO async functions in Promises
const promisify = Gio.promisify;

// Create a D-Bus proxy for the screenshot service
const ScreenshotProxy = promisify(Gio.DBusProxy.new, Gio.DBusProxy.new_finish);

export default class QuickEditScreenshotExtension extends Extension {
    async enable() {
        this._settings = this.getSettings();
        // Create a new Adw.Application instance. This is required for Adw.ApplicationWindow.
        this._app = new Adw.Application({
            application_id: this.uuid,
            flags: Gio.ApplicationFlags.DEFAULT_FLAGS
        });

        // This is a workaround to make GTK windows work properly in an extension
        this._app.connect('activate', () => {});
        this._app.register(null);


        this._screenshotService = await ScreenshotProxy(
            Gio.DBus.session,
            SCREENSHOT_SERVICE,
            SCREENSHOT_PATH,
            SCREENSHOT_INTERFACE
        );

        console.log(`[${this.uuid}] enabled`);

        Main.wm.addKeybinding(
            'screenshot-hotkey', // This now refers to the key in our GSettings schema
            this._settings,
            0, // No flags
            Mutter.ActionMode.NORMAL, // Updated: Use Mutter.ActionMode
            () => this._takeScreenshot()
        );
    }

    disable() {
        console.log(`[${this.uuid}] disabled`);
        Main.wm.removeKeybinding('screenshot-hotkey');

        if (this._editor) {
            this._editor.close();
            this._editor = null;
        }

        this._app.quit();
        this._app = null;
        this._screenshotService = null;
        this._settings = null;
    }

    _takeScreenshot() {
        this._screenshotService.ScreenshotAreaAsync(true, true)
            .then(([success, filename]) => {
                if (success) {
                    console.log(`[${this.uuid}] Screenshot saved to: ${filename}`);
                    this._openEditor(filename);
                } else {
                    console.error(`[${this.uuid}] Failed to take screenshot.`);
                }
            })
            .catch(err => {
                console.error(`[${this.uuid}] Error calling screenshot service:`, err);
            });
    }

    _openEditor(filename) {
        if (this._editor) {
            this._editor.destroy();
        }

        // Pass the application instance to the window
        this._editor = new EditorWindow({
            application: this._app,
            filename: filename
        });

        this._editor.present();
    }
}
