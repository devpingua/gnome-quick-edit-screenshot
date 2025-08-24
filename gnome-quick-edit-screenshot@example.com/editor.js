import * as Gtk from 'gi://Gtk?version=4.0';
import * as Adw from 'gi://Adw?version=1';
import * as Gdk from 'gi://Gdk';
import * as Gio from 'gi://Gio';
import GdkPixbuf from 'gi://GdkPixbuf';
import Cairo from 'cairo';
import { ExtensionUtils } from 'resource:///org/gnome/shell/misc/extensionUtils.js';

export class EditorWindow extends Adw.ApplicationWindow {
    constructor({ filename, ...params }) {
        super(params);

        this._settings = ExtensionUtils.getSettings('org.gnome.shell.extensions.gnome-quick-edit-screenshot');
        this._filename = filename;
        this._screenshotPixbuf = GdkPixbuf.Pixbuf.new_from_file(this._filename);
        this._annotations = [];
        this._currentTool = null;
        this._currentDragShape = null;
        this._transform = { x: 0, y: 0, scale: 1 };

        this.set_default_size(this._screenshotPixbuf.get_width(), this._screenshotPixbuf.get_height());
        this.set_title('Quick-Edit Screenshot');
        this.connect('destroy', this._onWindowDestroy.bind(this));

        const header = new Gtk.HeaderBar();
        this.set_titlebar(header);

        const toolBox = new Gtk.Box({ spacing: 6 });
        header.pack_start(toolBox);
        const rectButton = new Gtk.ToggleButton({ icon_name: 'object-select-symbolic', tooltip_text: 'Draw Rectangle' });
        rectButton.connect('toggled', () => { this._currentTool = rectButton.active ? 'rectangle' : null; });
        toolBox.append(rectButton);

        const historyButton = new Gtk.MenuButton({ icon_name: 'view-history-symbolic', tooltip_text: 'History' });
        this._historyPopover = new Gtk.Popover();
        historyButton.set_popover(this._historyPopover);
        historyButton.connect('clicked', this._buildHistoryPopover.bind(this));
        toolBox.append(historyButton);

        const copyButton = new Gtk.Button({ label: 'Copy', icon_name: 'edit-copy-symbolic' });
        copyButton.connect('clicked', this._onCopyClicked.bind(this));
        header.pack_end(copyButton);

        const saveButton = new Gtk.Button({ label: 'Save', icon_name: 'document-save-symbolic' });
        saveButton.connect('clicked', this._onSaveClicked.bind(this));
        header.pack_end(saveButton);

        this._drawingArea = new Gtk.DrawingArea({ vexpand: true, hexpand: true });
        this._drawingArea.set_draw_func(this._onDraw.bind(this));
        this.set_content(this._drawingArea);

        const drag = new Gtk.GestureDrag({ button: 1 });
        drag.connect('drag-begin', this._onDragBegin.bind(this));
        drag.connect('drag-update', this._onDragUpdate.bind(this));
        drag.connect('drag-end', this._onDragEnd.bind(this));
        this._drawingArea.add_controller(drag);
    }

    _transformWidgetPointToImage(widgetX, widgetY) {
        return {
            x: (widgetX - this._transform.x) / this._transform.scale,
            y: (widgetY - this._transform.y) / this._transform.scale,
        };
    }

    _onDragBegin(gesture, startX, startY) {
        if (!this._currentTool) return;
        const coords = this._transformWidgetPointToImage(startX, startY);
        this._currentDragShape = { type: this._currentTool, color: '#ff382d', x: coords.x, y: coords.y, w: 0, h: 0 };
        this._annotations.push(this._currentDragShape);
    }

    _onDragUpdate(gesture, offsetX, offsetY) {
        if (!this._currentDragShape) return;
        const [startX, startY] = gesture.get_start_point();
        const coords = this._transformWidgetPointToImage(startX + offsetX, startY + offsetY);
        this._currentDragShape.w = coords.x - this._currentDragShape.x;
        this._currentDragShape.h = coords.y - this._currentDragShape.y;
        this._drawingArea.queue_draw();
    }

    _onDragEnd(gesture, offsetX, offsetY) {
        if (!this._currentDragShape) return;
        if (this._currentDragShape.w < 0) {
            this._currentDragShape.x += this._currentDragShape.w;
            this._currentDragShape.w = Math.abs(this._currentDragShape.w);
        }
        if (this._currentDragShape.h < 0) {
            this._currentDragShape.y += this._currentDragShape.h;
            this._currentDragShape.h = Math.abs(this._currentDragShape.h);
        }
        this._currentDragShape = null;
        this._drawingArea.queue_draw();
    }

    _onDraw(area, cr, width, height) {
        cr.setSourceRGBA(0.15, 0.15, 0.15, 1.0);
        cr.paint();
        const pixbufWidth = this._screenshotPixbuf.get_width();
        const pixbufHeight = this._screenshotPixbuf.get_height();
        const aspect = pixbufWidth / pixbufHeight;
        const areaAspect = width / height;
        let scale = areaAspect > aspect ? height / pixbufHeight : width / pixbufWidth;
        const scaledWidth = pixbufWidth * scale;
        const scaledHeight = pixbufHeight * scale;
        const drawX = (width - scaledWidth) / 2;
        const drawY = (height - scaledHeight) / 2;
        this._transform = { x: drawX, y: drawY, scale };
        cr.save();
        cr.translate(drawX, drawY);
        cr.scale(scale, scale);
        Gdk.Cairo.set_source_pixbuf(cr, this._screenshotPixbuf, 0, 0);
        cr.paint();
        cr.restore();
        cr.save();
        cr.translate(drawX, drawY);
        cr.scale(scale, scale);
        for (const shape of this._annotations) {
            this._drawShape(cr, shape, scale);
        }
        cr.restore();
    }

    _drawShape(cr, shape, scale) {
        const color = new Gdk.RGBA();
        color.parse(shape.color);
        Gdk.Cairo.set_source_rgba(cr, color);
        cr.set_line_width(4 / scale);
        switch (shape.type) {
            case 'rectangle':
                cr.rectangle(shape.x, shape.y, shape.w, shape.h);
                cr.stroke();
                break;
        }
    }

    _renderToPixbuf() {
        const width = this._screenshotPixbuf.get_width();
        const height = this._screenshotPixbuf.get_height();
        const surface = new Cairo.ImageSurface(Cairo.Format.ARGB32, width, height);
        const cr = new Cairo.Context(surface);
        Gdk.Cairo.set_source_pixbuf(cr, this._screenshotPixbuf, 0, 0);
        cr.paint();
        for (const shape of this._annotations) {
            this._drawShape(cr, shape, 1.0);
        }
        return Gdk.pixbuf_get_from_surface(surface, 0, 0, width, height);
    }

    _onCopyClicked() {
        const pixbuf = this._renderToPixbuf();
        this.get_clipboard().set(pixbuf);
    }

    _onSaveClicked() {
        const fileChooser = new Gtk.FileChooserNative({
            title: 'Save Screenshot',
            transient_for: this.get_root(),
            action: Gtk.FileChooserAction.SAVE,
            accept_label: '_Save',
        });
        const pngFilter = new Gtk.FileFilter();
        pngFilter.set_name('PNG Image');
        pngFilter.add_mime_type('image/png');
        fileChooser.add_filter(pngFilter);
        const jpgFilter = new Gtk.FileFilter();
        jpgFilter.set_name('JPEG Image');
        jpgFilter.add_mime_type('image/jpeg');
        fileChooser.add_filter(jpgFilter);
        fileChooser.connect('response', (dialog, response) => {
            if (response === Gtk.ResponseType.ACCEPT) {
                const file = dialog.get_file();
                const pixbuf = this._renderToPixbuf();
                const type = dialog.get_filter() === jpgFilter ? 'jpeg' : 'png';
                pixbuf.savev(file.get_path(), type, [], []);
            }
            dialog.destroy();
        });
        fileChooser.show();
    }

    _onWindowDestroy() {
        if (this._annotations.length > 0) {
            this._saveStateToHistory();
        }
    }

    _saveStateToHistory() {
        let history = this._settings.get_strv('history-stack');
        const newState = {
            timestamp: Date.now(),
            filename: this._filename,
            annotations: this._annotations,
        };
        const newStateJson = JSON.stringify(newState);
        history = history.filter(item => JSON.parse(item).filename !== newState.filename);
        history.unshift(newStateJson);
        if (history.length > 5) {
            history = history.slice(0, 5);
        }
        this._settings.set_strv('history-stack', history);
    }

    _buildHistoryPopover() {
        if (this._historyBox) this._historyPopover.set_child(null);
        this._historyBox = new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL, spacing: 6, margin_top: 10, margin_bottom: 10, margin_start: 10, margin_end: 10 });
        this._historyPopover.set_child(this._historyBox);

        const history = this._settings.get_strv('history-stack');
        if (history.length === 0) {
            this._historyBox.append(new Gtk.Label({ label: 'No history yet.' }));
            return;
        }

        for (const itemJson of history) {
            const item = JSON.parse(itemJson);
            const button = new Gtk.Button({ label: `Edit from ${new Date(item.timestamp).toLocaleString()}` });
            button.connect('clicked', () => {
                this._loadState(item);
                this._historyPopover.popdown();
            });
            this._historyBox.append(button);
        }
    }

    _loadState(state) {
        try {
            this._filename = state.filename;
            this._screenshotPixbuf = GdkPixbuf.Pixbuf.new_from_file(this._filename);
            this._annotations = state.annotations;
            this.set_default_size(this._screenshotPixbuf.get_width(), this._screenshotPixbuf.get_height());
            this._drawingArea.queue_draw();
        } catch (e) {
            const extension = ExtensionUtils.getCurrentExtension();
            console.error(`[${extension.uuid}] Failed to load history state:`, e);
        }
    }
}
