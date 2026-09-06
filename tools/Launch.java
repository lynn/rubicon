import processing.core.PApplet;
import java.awt.*;
import java.awt.event.*;
import java.lang.reflect.*;

public class Launch {
  static PApplet app;

  public static void main(String[] a) throws Exception {
    String out = a.length > 0 ? a[0] : "frame.png";
    String script = a.length > 1 ? a[1] : "";

    app = (PApplet) Class.forName("rubicon").getDeclaredConstructor().newInstance();
    Frame f = new Frame("Rubicon");
    f.setLayout(new BorderLayout());
    f.add(app, BorderLayout.CENTER);
    try { Field fr = PApplet.class.getField("frame"); fr.set(app, f); } catch (Exception e) {}
    app.init();
    f.pack();
    Insets in = f.getInsets();
    f.setSize(800 + in.left + in.right, 600 + in.top + in.bottom);
    f.setVisible(true);
    f.addWindowListener(new WindowAdapter() {
      public void windowClosing(WindowEvent e) { System.exit(0); }
    });

    Thread.sleep(2500);
    for (String cmd : script.split(",")) {
      cmd = cmd.trim();
      if (cmd.isEmpty()) continue;
      String[] p = cmd.split(":");
      if (p[0].equals("wait")) {
        Thread.sleep(Long.parseLong(p[1]));
      } else if (p[0].equals("click")) {
        String[] xy = p[1].split("x");
        int x = Integer.parseInt(xy[0]), y = Integer.parseInt(xy[1]);
        post(new MouseEvent(app, MouseEvent.MOUSE_MOVED, now(), 0, x, y, 0, false));
        Thread.sleep(120);
        post(new MouseEvent(app, MouseEvent.MOUSE_PRESSED, now(),
             MouseEvent.BUTTON1_DOWN_MASK, x, y, 1, false, MouseEvent.BUTTON1));
        Thread.sleep(80);
        post(new MouseEvent(app, MouseEvent.MOUSE_RELEASED, now(),
             MouseEvent.BUTTON1_DOWN_MASK, x, y, 1, false, MouseEvent.BUTTON1));
        Thread.sleep(250);
      } else if (p[0].equals("key")) {
        char c = p[1].charAt(0);
        post(new KeyEvent(app, KeyEvent.KEY_PRESSED, now(), 0, KeyEvent.VK_UNDEFINED, c));
        Thread.sleep(250);
      } else if (p[0].equals("shot")) {
        app.save(new java.io.File(p[1]).getAbsolutePath());
        Thread.sleep(600);
      }
    }
    app.save(new java.io.File(out).getAbsolutePath());
    Thread.sleep(800);
    System.out.println("OK frameCount=" + app.frameCount + " size=" + app.width + "x" + app.height);
    System.exit(0);
  }

  static long now() { return System.currentTimeMillis(); }
  static void post(AWTEvent e) { app.dispatchEvent(e); }
}
