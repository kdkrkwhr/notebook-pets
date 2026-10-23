"""Transparent non-activating Cocoa panel, using pywebview's existing UI loop."""
import AppKit
import Foundation

from .pet import SIZE


class BuddyImageView(AppKit.NSImageView):
    def acceptsFirstMouse_(self, event):
        return True

    def mouseDown_(self, event):
        if event.clickCount() >= 2:
            self.buddy.recall(); return
        point = AppKit.NSEvent.mouseLocation()
        walk = self.buddy.controller.walk
        self.buddy.offset = (point.x - walk.x, self.buddy.top() - point.y - walk.y)
        walk.dragging = True

    def mouseDragged_(self, event):
        if self.buddy.offset:
            point = AppKit.NSEvent.mouseLocation()
            walk = self.buddy.controller.walk
            walk.x = point.x - self.buddy.offset[0]
            walk.y = self.buddy.top() - point.y - self.buddy.offset[1]

    def mouseUp_(self, event):
        self.buddy.offset = None
        self.buddy.controller.walk.dragging = False
        self.buddy.controller.walk.pause = 1.

    def rightMouseDown_(self, event):
        self.buddy.recall()


class BuddyTimer(Foundation.NSObject):
    def tick_(self, timer):
        self.callback()


class PetWindow:
    def __init__(self, parent, frames, tick, recall):
        self.parent, self.recall, self.controller = parent, recall, tick.__self__
        self.offset = None
        self.images = [AppKit.NSImage.alloc().initWithData_(Foundation.NSData.dataWithBytes_length_(frame, len(frame))) for frame in frames]
        style = AppKit.NSWindowStyleMaskBorderless | AppKit.NSWindowStyleMaskNonactivatingPanel
        self.panel = AppKit.NSPanel.alloc().initWithContentRect_styleMask_backing_defer_(Foundation.NSMakeRect(0, 0, SIZE, SIZE), style, AppKit.NSBackingStoreBuffered, False)
        self.panel.setTitle_('NoteBuddy desktop companion')
        self.panel.setOpaque_(False); self.panel.setBackgroundColor_(AppKit.NSColor.clearColor())
        self.panel.setHasShadow_(False); self.panel.setLevel_(AppKit.NSFloatingWindowLevel)
        self.panel.setHidesOnDeactivate_(False); self.panel.setReleasedWhenClosed_(False)
        self.view = BuddyImageView.alloc().initWithFrame_(Foundation.NSMakeRect(0, 0, SIZE, SIZE))
        self.view.buddy = self
        self.view.setImageScaling_(AppKit.NSImageScaleNone)
        self.panel.setContentView_(self.view)
        self.target = BuddyTimer.alloc().init(); self.target.callback = tick
        self.timer = None; self.frame = -1

    def top(self):
        frame = AppKit.NSScreen.screens()[0].frame()
        return frame.origin.y + frame.size.height

    def bounds(self):
        screen = self.panel.screen() if self.panel.isVisible() else self.parent.screen()
        area = (screen or AppKit.NSScreen.mainScreen()).visibleFrame()
        return area.origin.x, self.top() - area.origin.y - area.size.height, area.size.width, area.size.height

    def show(self, x, y):
        self.draw(1, x, y)
        self.panel.orderFrontRegardless()
        self.timer = Foundation.NSTimer.timerWithTimeInterval_target_selector_userInfo_repeats_(.04, self.target, 'tick:', None, True)
        Foundation.NSRunLoop.mainRunLoop().addTimer_forMode_(self.timer, Foundation.NSRunLoopCommonModes)

    def draw(self, frame, x, y):
        if frame != self.frame:
            self.view.setImage_(self.images[frame]); self.frame = frame
        self.panel.setFrameOrigin_(Foundation.NSMakePoint(x, self.top() - y - SIZE))

    def close(self):
        if self.timer: self.timer.invalidate(); self.timer = None
        self.panel.orderOut_(None); self.panel.close()
        self.view.buddy = None; self.target.callback = None
        self.images.clear()
