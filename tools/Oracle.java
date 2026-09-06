// Dumps the ORIGINAL Java simulation state tick by tick, so the JS port can be
// diffed against it. Lives in the default package so it can reach rubicon's
// package-private fields (gameGrid, blocksASCII) directly.
//
// Deliberately never calls setup(): physics() only touches the grid arrays,
// which are field initialisers, so we skip all graphics/font/applet init.
//
//   javac -cp original/rubicon.jar:original/core.jar -d tools tools/Oracle.java
//   java  -cp tools:original/rubicon.jar:original/core.jar Oracle <level.rub> <ticks>

import java.io.*;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.util.*;

public class Oracle {
  static final long SEED = 12345L;

  public static void main(String[] args) throws Exception {
    String path = args[0];
    int ticks = args.length > 1 ? Integer.parseInt(args[1]) : 200;

    List<String> raw = Files.readAllLines(Paths.get(path), StandardCharsets.ISO_8859_1);

    rubicon r = new rubicon();
    int physics = 1;                 // user levels default to the old model
    if (path.matches(".*level\\d+\\.rub")) physics = 2;  // base levels are v2

    List<String> rows = new ArrayList<String>();
    for (String line : raw) {
      if (line.startsWith("*")) {
        if (line.equals("* Physics:2")) physics = 2;
        else if (line.equals("* Physics:1")) physics = 1;
      } else if (rows.size() < r.ysize) {
        rows.add(line);
      }
    }

    String[] grid = new String[r.ysize];
    for (int i = 0; i < r.ysize; i++) grid[i] = i < rows.size() ? rows.get(i) : "";
    r.restoreFrom(grid);
    r.physicsVersion = physics;
    r.randomSeed(SEED);   // matched by JavaRandom on the JS side

    StringBuilder out = new StringBuilder();
    out.append("physics ").append(physics).append('\n');
    out.append(dump(r, 0));
    for (int t = 1; t <= ticks; t++) {
      r.physics();
      out.append(dump(r, t));
    }
    System.out.print(out);
  }

  // One line per tick: "<tick> <1550 chars, row-major>"
  static String dump(rubicon r, int tick) {
    StringBuilder sb = new StringBuilder();
    sb.append(tick).append(' ');
    for (int y = 0; y < r.ysize; y++)
      for (int x = 0; x < r.xsize; x++)
        sb.append(r.blocksASCII.charAt(r.gameGrid[x][y]));
    return sb.append('\n').toString();
  }
}
