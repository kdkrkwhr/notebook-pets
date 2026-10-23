"""Small color-keyed WinForms surface; transparent pixels pass clicks through."""
from .pet import SIZE


class PetWindow:
    def __init__(self, parent, frames, tick, recall):
        from System import Array, Byte
        from System.IO import MemoryStream
        from System.Drawing import Bitmap, Color, Point, Size
        from System.Windows.Forms import Form, FormBorderStyle, FormStartPosition, Timer, Screen, Cursor, MouseButtons
        self.Point, self.Screen, self.Cursor = Point, Screen, Cursor
        self.parent, self.recall, self.offset = parent, recall, None
        self.images = []
        for frame in frames:
            stream = MemoryStream(Array[Byte](frame))
            loaded = Bitmap(stream)
            self.images.append(Bitmap(loaded))
            loaded.Dispose(); stream.Dispose()
        self.form = Form()
        self.form.Text = 'NoteBuddy desktop companion'
        self.form.FormBorderStyle = getattr(FormBorderStyle, 'None')
        self.form.StartPosition = FormStartPosition.Manual
        self.form.ClientSize = Size(SIZE, SIZE)
        self.form.ShowInTaskbar = False; self.form.TopMost = True
        self.form.BackColor = Color.FromArgb(1, 2, 3)
        self.form.TransparencyKey = self.form.BackColor
        self.form.BackgroundImage = self.images[1]
        self.form.MouseDown += self.down
        self.form.MouseMove += self.drag
        self.form.MouseUp += self.up
        self.form.MouseDoubleClick += lambda sender, event: recall()
        self.form.FormClosed += lambda sender, event: recall()
        self.left, self.right = MouseButtons.Left, MouseButtons.Right
        self.timer = Timer(); self.timer.Interval = 40
        self.timer.Tick += lambda sender, event: tick()
        self.frame = 1
        # The owner is the controller whose bound method was supplied.
        self.controller = tick.__self__

    def bounds(self):
        screen = self.Screen.FromPoint(self.Cursor.Position) if self.offset else self.Screen.FromControl(self.form if self.form.Visible else self.parent)
        area = screen.WorkingArea
        return area.X, area.Y, area.Width, area.Height

    def show(self, x, y):
        self.form.Location = self.Point(round(x), round(y))
        self.form.Show(); self.timer.Start()
        self.parent.Activate()

    def draw(self, frame, x, y):
        if self.frame != frame:
            self.form.BackgroundImage = self.images[frame]; self.frame = frame
        self.form.Location = self.Point(x, y)

    def down(self, sender, event):
        if event.Button == self.right:
            self.recall(); return
        if event.Button == self.left:
            self.offset = (event.X, event.Y)
            self.form.Capture = True
            self.controller.walk.dragging = True

    def drag(self, sender, event):
        if self.offset:
            point = self.Cursor.Position
            self.controller.walk.x = point.X - self.offset[0]
            self.controller.walk.y = point.Y - self.offset[1]

    def up(self, sender, event):
        self.offset = None; self.form.Capture = False
        self.controller.walk.dragging = False
        self.controller.walk.pause = 1.

    def close(self):
        self.timer.Stop(); self.timer.Dispose()
        self.form.BackgroundImage = None
        self.form.Close(); self.form.Dispose()
        for image in self.images: image.Dispose()
        self.images.clear()
