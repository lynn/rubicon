/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  processing.core.PApplet
 *  processing.core.PFont
 *  processing.core.PImage
 */
import java.applet.Applet;
import java.io.DataInputStream;
import java.io.DataOutputStream;
import java.net.URL;
import java.net.URLConnection;
import java.net.URLDecoder;
import java.net.URLEncoder;
import java.util.HashMap;
import netscape.javascript.JSObject;
import processing.core.PApplet;
import processing.core.PFont;
import processing.core.PImage;

public class rubicon
extends PApplet {
    String version = "1.27";
    String userLevelPath = "http://kevan.org/rubicon/userlevels/";
    String webLevelPath = "http://kevan.org/rubicon/userlevels/";
    String loaderPath = "http://kevan.org/rubicon/rubiload.php?filename=";
    String[] passwords = new String[]{"abalone", "origami", "unaware", "anenome", "edifice", "acolyte", "analogy", "ocarina", "acetate", "oregano", "ukelele", "awesome"};
    String[] tiledesc = new String[90];
    Button menuButtonPlay = new Button(new Box(325, 190, 150, 24), this.color(255), new Point(20, 18), "Play Base Levels");
    Button menuButtonLoad = new Button(new Box(325, 220, 150, 24), this.color(255), new Point(35, 18), "Load a Level");
    Button menuButtonSandbox = new Button(new Box(325, 250, 150, 24), this.color(255), new Point(5, 18), "Build in the Sandbox");
    Box buttonQuit = new Box(9, 567, 36, 16);
    Box buttonLoad = new Box(490, 506, 57, 14);
    Box buttonSave = new Box(490, 523, 57, 14);
    Box buttonClear = new Box(558, 507, 34, 34);
    Box buttonStop = new Box(597, 507, 34, 34);
    Box buttonPlay = new Box(636, 507, 34, 34);
    Box buttonGame = new Box(675, 507, 34, 15);
    Box buttonSandbox = new Box(675, 526, 34, 15);
    Box buttonNext = new Box(714, 507, 74, 34);
    Box toolbox = new Box(6, 508, 492, 50);
    int xsize = 50;
    int ysize = 31;
    Box boxGameGrid = new Box(0, 0, this.xsize - 1, this.ysize - 1);
    int design = 1;
    int running = 2;
    int menu = 4;
    String blocksASCII = " =|><MW()/\\,.:AVK+-~EQZDHSOYXXghijklmnopqrstuv!xFyzN%RBw^PXX0123456789abcdef?TTT#CLG_IJU$X";
    int girder = 1;
    int vertgirder = 2;
    int conveyorright = 3;
    int conveyorleft = 4;
    int pipeup = 5;
    int pipedown = 6;
    int dozerright = 7;
    int dozerleft = 8;
    int rampright = 9;
    int rampleft = 10;
    int flipsign = 11;
    int copierup = 12;
    int copier = 13;
    int winchup = 14;
    int winchdown = 15;
    int gate = 16;
    int packer = 17;
    int unpacker = 18;
    int antisign = 19;
    int barrel = 30;
    int randombarrel = 46;
    int doorkey = 47;
    int furnace = 48;
    int trapdoor = 49;
    int door = 50;
    int crate = 60;
    int randomcrate = 76;
    int matchoff = 77;
    int matchgreen = 78;
    int matchred = 79;
    int fixedblank = 88;
    PImage imgBlock;
    PImage imgEmptyGameGrid;
    int[][] gameGrid = new int[this.xsize][this.ysize];
    int[][] clipboard = new int[this.xsize][this.ysize];
    boolean[][] locked = new boolean[this.xsize][this.ysize];
    boolean clip;
    boolean clipCut;
    int[][] moved = new int[this.xsize + 1][this.ysize + 1];
    boolean[][] doorNorthWest = new boolean[this.xsize + 1][this.ysize + 1];
    int drawitem = this.girder;
    int mode = this.menu;
    int level = 0;
    int frames;
    int solvedFrames;
    boolean gameplay;
    boolean playingLevels;
    boolean singleStepping;
    boolean doSingleStep;
    boolean fastForwarding;
    boolean waitForRelease = false;
    Box selection = null;
    int physicsVersion = 2;
    PFont font12;
    PFont font14;
    PFont font16;
    PFont font32;
    boolean[] tileAvailable = new boolean[90];
    String loadURL = null;
    String loadedURL = null;
    boolean goLoading = false;
    boolean goSaving = false;
    AlertBase alertMessage = null;
    String[] unstartedMachine = new String[this.ysize];

    public void setup() {
        this.size(800, 600);
        int n = 0;
        while (n < this.tiledesc.length) {
            this.tiledesc[n] = "";
            ++n;
        }
        this.tiledesc[0] = "Empty Space.";
        this.tiledesc[1] = "Girder. Stationary object on which cargo may be piled.";
        this.tiledesc[2] = "Vertical Girder. Stationary object on which cargo may be piled.";
        this.tiledesc[3] = "Right Conveyor. Moves cargo to the right.";
        this.tiledesc[4] = "Left Conveyor. Moves cargo to the left.";
        this.tiledesc[5] = "Upward Pipe. Sucks cargo from the bottom to the top.";
        this.tiledesc[6] = "Downward Pipe. Sucks cargo from the top to the bottom.";
        this.tiledesc[7] = "Right Dozer. Pushes cargo to the right, is also affected by gravity.";
        this.tiledesc[8] = "Left Dozer. Pushes cargo to the left, is also affected by gravity.";
        this.tiledesc[9] = "Left Ramp. Dozers climb up and down ramps, cargo slides down them.";
        this.tiledesc[10] = "Right Ramp. Dozers climb up and down ramps, cargo slides down them.";
        this.tiledesc[11] = "Turn Signal. Place a turn signal above a dozer's path to make it reverse.";
        this.tiledesc[12] = "Upward Copier. An item of cargo placed below it is copied above.";
        this.tiledesc[13] = "Downward Copier. An item of cargo placed on top of it is copied below.";
        this.tiledesc[14] = "Upward Winch. Lifts an item of cargo from directly below it to directly above, and then/becomes a Downward Winch.";
        this.tiledesc[15] = "Downward Winch. Lowers an item of cargo from directly above it to directly below, and then/becomes an Upward Winch.";
        this.tiledesc[16] = "Gate. Compares the number value of the cargo on top to that of the cargo below. If the top cargo is larger,/it rolls off to the right. If it's smaller or equal, it rolls off to the left.";
        this.tiledesc[17] = "Packer. The value of the cargo on the green input wires are added together (in hex, modulo 16)/to create a new cargo on the red output wire. (The input cargoes are destroyed.)";
        this.tiledesc[18] = "Unpacker. The value of the right green-input cargo is subtracted from the value of the left (in hex,/modulo 16) to create a new cargo on the red output wire. (The input cargoes are destroyed.)";
        this.tiledesc[19] = "Anti Sign. Any blocks touching this block (including diagonally adjacent) may not be used by the/player when solving the level.";
        this.tiledesc[20] = "Plating. Decorative obstacle.";
        this.tiledesc[21] = "Wire Fence. Decorative obstacle";
        this.tiledesc[22] = "Hazard Stencil. Decorative obstacle.";
        this.tiledesc[23] = "Checkerboard. Decorative obstacle.";
        this.tiledesc[24] = "Brick Wall Top. Decorative obstacle.";
        this.tiledesc[25] = "Cobweb. Decorative obstacle.";
        this.tiledesc[26] = "Glass Panel. Decorative obstacle.";
        this.tiledesc[27] = "Pillar. Decorative obstacle.";
        n = 0;
        while (n < 10) {
            this.tiledesc[30 + n] = "'" + n + "' Barrel.";
            ++n;
        }
        this.tiledesc[40] = "'A' Barrel. (A is equal to '10' in hexadecimal.)";
        this.tiledesc[41] = "'B' Barrel. (B is equal to '11' in hexadecimal.)";
        this.tiledesc[42] = "'C' Barrel. (C is equal to '12' in hexadecimal.)";
        this.tiledesc[43] = "'D' Barrel. (D is equal to '13' in hexadecimal.)";
        this.tiledesc[44] = "'E' Barrel. (E is equal to '14' in hexadecimal.)";
        this.tiledesc[45] = "'F' Barrel. (F is equal to '15' in hexadecimal.)";
        this.tiledesc[46] = "Random Barrel. Is assigned a random value when the program starts. (If placed on a/copier, the Barrel remains random and the copier generates random Barrels.)";
        this.tiledesc[47] = "Door Key. If one side of the Key is covered and the other is empty (vertically or horizontally), a Door/or Trapdoor appears on the empty side, until the other side becomes empty again.";
        this.tiledesc[48] = "Furnace. Destroys all cargo that touches it.";
        this.tiledesc[49] = "Trapdoor. Generated and destroyed by Door Keys, can be used independently as barriers.";
        this.tiledesc[50] = "Door. Generated and destroyed by Door Keys, can be used independently as barriers.";
        this.tiledesc[51] = "Noduled Surface. Decorative obstacle.";
        this.tiledesc[52] = "Grille. Decorative obstacle";
        this.tiledesc[53] = "Indentation. Decorative obstacle";
        this.tiledesc[54] = "Brick Wall. Decorative obstacle.";
        this.tiledesc[55] = "Crenellation. Decorative obstacle.";
        this.tiledesc[56] = "Glass Dome. Decorative obstacle.";
        this.tiledesc[57] = "Duct. Decorative obstacle.";
        n = 0;
        while (n < 10) {
            this.tiledesc[60 + n] = "'" + n + "' Crate.";
            ++n;
        }
        this.tiledesc[70] = "'A' Crate. (A is equal to '10' in hexadecimal.)";
        this.tiledesc[71] = "'B' Crate. (B is equal to '11' in hexadecimal.)";
        this.tiledesc[72] = "'C' Crate. (C is equal to '12' in hexadecimal.)";
        this.tiledesc[73] = "'D' Crate. (D is equal to '13' in hexadecimal.)";
        this.tiledesc[74] = "'E' Crate. (E is equal to '14' in hexadecimal.)";
        this.tiledesc[75] = "'F' Crate. (F is equal to '15' in hexadecimal.)";
        this.tiledesc[76] = "Random Crate. Is assigned a random value when the program starts. (If placed on a/copier, the crate remains random and the copier generates random crates.)";
        this.tiledesc[77] = "Target Matcher. Turns green if the crates above and below it match, red if not.";
        this.tiledesc[78] = "Target Matcher. Turns green if the crates above and below it match, red if not.";
        this.tiledesc[79] = "Target Matcher. Turns green if the crates above and below it match, red if not.";
        this.tiledesc[80] = "Bulkhead. Decorative obstacle.";
        this.tiledesc[81] = "Chain. Decorative obstacle.";
        this.tiledesc[82] = "I-Beam. Decorative obstacle";
        this.tiledesc[83] = "Ventilation Panel. Decorative obstacle.";
        this.tiledesc[84] = "Fluorostrip. Decorative obstacle.";
        this.tiledesc[85] = "Left Ceiling Ramp. Decorative obstacle.";
        this.tiledesc[86] = "Right Ceiling Ramp. Decorative obstacle.";
        this.tiledesc[87] = "Storage Tank. Decorative obstacle.";
        this.tiledesc[88] = "Locked Space. Becomes normal empty space when the level starts - can be used to mark off areas where you/don't want the player to build.";
        this.font12 = this.loadFont("PalatinoLinotype-Roman-12.vlw");
        this.font14 = this.loadFont("PalatinoLinotype-Roman-14.vlw");
        this.font16 = this.loadFont("PalatinoLinotype-Roman-16.vlw");
        this.font32 = this.loadFont("PalatinoLinotype-Roman-32.vlw");
        this.textFont(this.font16);
        if (this.param("level") != null) {
            this.loadUserLevel(this.param("level"));
        }
        this.imgBlock = this.loadImage("blocks.gif");
        this.imgEmptyGameGrid = this.createImage(800, 500, 1);
        n = 0;
        while (n < this.ysize) {
            int n2 = 0;
            while (n2 < this.xsize) {
                this.imgEmptyGameGrid.copy(this.imgBlock, this.toolbox.x, this.toolbox.y - 500, 16, 16, n2 * 16, n * 16, 16, 16);
                ++n2;
            }
            ++n;
        }
    }

    public Point toolboxCoordsForIndex(int n) {
        return new Point(n % 30, n / 30);
    }

    public Point screenCoordsForToolboxCoords(Point point) {
        return new Point(this.toolbox.x + point.x * 17, this.toolbox.y + point.y * 17);
    }

    public void drawObject(int n, int n2, int n3) {
        Point point = this.screenCoordsForToolboxCoords(this.toolboxCoordsForIndex(n));
        this.copy(point.x, point.y, 16, 16, n2 * 16, n3 * 16, 16, 16);
    }

    public void draw() {
        boolean bl;
        int n;
        int n2;
        int n3 = 0;
        if (this.mode == this.menu) {
            this.background(0);
        } else {
            this.image(this.imgEmptyGameGrid, 0.0f, 0.0f);
        }
        this.image(this.imgBlock, 0.0f, 500.0f);
        if (this.mode == this.design || this.mode == this.running) {
            int n4;
            if (this.mode == this.running && (!this.singleStepping || this.doSingleStep)) {
                if (this.frames != -1) {
                    this.physics();
                }
                ++this.frames;
                this.doSingleStep = false;
            }
            boolean bl2 = false;
            n2 = 1;
            int n5 = 0;
            while (n5 < this.ysize) {
                n = 0;
                while (n < this.xsize) {
                    n4 = this.gameGrid[n][n5];
                    if (n4 != 0) {
                        this.drawObject(n4, n, n5);
                        if (this.mode == this.design && this.gameplay && this.locked[n][n5]) {
                            this.noStroke();
                            this.fill(0.0f, 0.0f, 100.0f, 66.0f);
                            this.rect(n * 16, n5 * 16, 16.0f, 16.0f);
                        }
                        if (this.physicsVersion == 1 && (n4 == this.packer || n4 == this.unpacker || n4 == this.copier || n4 == this.copierup)) {
                            this.noStroke();
                            this.fill(0.0f, 100.0f, 0.0f, 66.0f);
                            this.rect(n * 16, n5 * 16, 16.0f, 16.0f);
                        }
                        if (this.mode == this.running) {
                            if (n4 == this.matchgreen) {
                                bl2 = true;
                            }
                            if (n4 == this.matchred) {
                                n2 = 0;
                            }
                            if (n4 == this.matchoff) {
                                n2 = 0;
                            }
                        } else {
                            n3 = n4 > 2 && n4 < 9 || n4 == 14 || n4 == 15 ? (n3 += 5) : (n4 > 11 && n4 < 20 ? (n3 += 10) : ++n3);
                        }
                    }
                    ++n;
                }
                ++n5;
            }
            if (this.mode == this.running) {
                if (n2 != 0 && bl2) {
                    if (this.solvedFrames == -1) {
                        this.solvedFrames = this.frames;
                    }
                } else {
                    this.solvedFrames = -1;
                }
            }
            this.stroke(0);
            this.fill(25);
            n5 = 0;
            while (n5 < 3) {
                n = n5 == 2 ? 29 : 28;
                n4 = 0;
                while (n4 < n) {
                    if (!this.tileAvailable[n5 * 30 + n4]) {
                        Point point = this.screenCoordsForToolboxCoords(new Point(n4, n5));
                        this.rect(point.x, point.y, 15.0f, 15.0f);
                    }
                    ++n4;
                }
                ++n5;
            }
            if (this.mode == this.design) {
                this.stroke(255);
                this.noFill();
                Point point = this.screenCoordsForToolboxCoords(this.toolboxCoordsForIndex(this.drawitem));
                this.rect(point.x - 1, point.y - 1, 17.0f, 17.0f);
                this.copy(point.x, point.y, 16, 16, 61, 567, 16, 16);
            }
            if (this.mode == this.running) {
                if (this.playingLevels) {
                    this.textFont(this.font14);
                    this.fill(215.0f, 215.0f, 215.0f);
                    this.text("The password for this level is '" + this.passwords[this.level] + "'.", 300.0f, 580.0f);
                }
            } else {
                this.textFont(this.font14);
                this.fill(215.0f, 215.0f, 215.0f);
                String string = this.tiledesc[this.drawitem];
                n = string.indexOf("/");
                if (n > 0) {
                    this.text(string.substring(0, n), 100.0f, 580.0f);
                    this.text(string.substring(n + 1), 100.0f, 596.0f);
                } else {
                    this.text(string, 100.0f, 580.0f);
                }
            }
        }
        if (this.selection != null) {
            this.noFill();
            this.stroke(0.0f, 250.0f, 0.0f);
            this.selection.gameGridRect();
            if (this.clip) {
                Point point = new Point(this.mouseX / 16, this.mouseY / 16);
                n2 = 0;
                while (n2 <= rubicon.min((int)this.selection.w, (int)(this.xsize - point.x - 1))) {
                    int n6 = 0;
                    while (n6 <= rubicon.min((int)this.selection.h, (int)(this.ysize - point.y - 1))) {
                        n = this.clipboard[n2][n6];
                        if (this.tileAvailable[n]) {
                            this.drawObject(n, point.x + n2, point.y + n6);
                        }
                        ++n6;
                    }
                    ++n2;
                }
                this.noFill();
                if (this.clipCut) {
                    this.stroke(250.0f, 0.0f, 250.0f);
                } else {
                    this.stroke(250.0f, 0.0f, 0.0f);
                }
                new Box(point, this.selection.w, this.selection.h).gameGridRect();
            }
        }
        if (this.mode == this.menu) {
            this.textFont(this.font32);
            this.fill(15.0f, 15.0f, 15.0f);
            this.stroke(75);
            this.rect(250.0f, 100.0f, 300.0f, 220.0f);
            this.fill(215);
            this.text("RUBICON", 325.0f, 150.0f);
            this.menuButtonPlay.draw();
            this.menuButtonLoad.draw();
            this.menuButtonSandbox.draw();
            this.textFont(this.font12);
            this.fill(100);
            this.text("Version " + this.version, 725.0f, 592.0f);
            this.textFont(this.font12);
            this.fill(15.0f, 15.0f, 15.0f);
            this.stroke(75);
            this.rect(120.0f, 422.0f, 600.0f, 60.0f);
            this.fill(155);
            this.text("Update: As of v1.17, several components have been altered - Packers, Unpackers and Copiers are now\nrunning one tick slower. Loading in an old level will switch them back to their obsolete, fast versions,\nwhich will be tinted green. See the main Rubicon page for full details.", 125.0f, 440.0f);
        }
        if (this.alertMessage != null) {
            this.alertMessage.draw();
        }
        this.noFill();
        this.stroke(255);
        if (this.mode == this.design) {
            this.buttonStop.rect();
        }
        if (this.mode == this.running) {
            this.buttonPlay.rect();
        }
        if (this.gameplay) {
            this.buttonGame.rect();
        } else {
            this.buttonSandbox.rect();
        }
        this.fill(255.0f, 255.0f, 255.0f);
        this.textFont(this.font16);
        if (this.playingLevels) {
            if (this.mode == this.running && this.solvedFrames != -1) {
                this.text("Next >>", 727.0f, 530.0f);
            } else {
                this.text("Level " + (this.level + 1), 727.0f, 530.0f);
            }
        } else if (this.mode == this.running) {
            if (this.gameplay && this.solvedFrames != -1) {
                this.text("Solved!", 727.0f, 530.0f);
            } else {
                String string = rubicon.str((int)this.frames);
                n2 = 751 - 4 * string.length();
                this.text(string, n2, 528.0f);
            }
        } else if (this.mode == this.design) {
            String string = "$" + rubicon.str((int)n3);
            n2 = 751 - 4 * string.length();
            this.text(string, n2, 528.0f);
        }
        if (this.mode == this.running && this.solvedFrames != -1) {
            this.textFont(this.font12);
            this.fill(100);
            if (this.solvedFrames == 1) {
                this.text("Solved in 1 tick.", 625.0f, 592.0f);
            } else {
                this.text("Solved in " + this.solvedFrames + " ticks.", 625.0f, 592.0f);
            }
        }
        boolean bl3 = bl = this.goLoading || this.goSaving;
        if (this.goLoading) {
            if (this.alertMessage == null) {
                this.loadUserLevel(this.loadURL);
                this.loadURL = null;
                this.goLoading = false;
            } else {
                this.alertMessage = null;
            }
        }
        if (this.goSaving) {
            if (this.alertMessage == null) {
                if ((this.mouseEvent.getModifiersEx() & 0x40) == 64) {
                    this.saveLevelCookie();
                } else {
                    this.saveLevel();
                }
                this.goSaving = false;
            } else {
                this.alertMessage = null;
            }
        }
        if (this.mode == this.running && !this.singleStepping || bl) {
            this.frameRate(this.fastForwarding ? 60 : 10);
            this.loop();
        } else {
            this.frameRate(60.0f);
            this.noLoop();
        }
    }

    public void DoLoadAlert() {
        this.alertMessage = new AlertTextInput("Load an existing level: ", 7){

            protected void onOK() {
                if (this.input.length() == 0) {
                    return;
                }
                if (this.input.length() < this.maxLen) {
                    rubicon.this.alertMessage = new Alert("Level not found. (Level names should be\nexactly seven letters.)");
                } else {
                    rubicon.this.alertMessage = new AlertBase("Loading...");
                    rubicon.this.loadURL = this.input;
                    rubicon.this.goLoading = true;
                }
            }
        };
    }

    public void StartRunning() {
        this.mode = this.running;
        this.frames = -1;
        this.solvedFrames = -1;
        this.saveTo(this.unstartedMachine);
    }

    public void keyPressed() {
        if (this.alertMessage != null) {
            this.alertMessage.keyPressed();
        } else {
            if (this.mode == this.design) {
                Point point;
                int n;
                if (this.selection != null) {
                    if (this.keyCode == 127 || this.key == 'f' || this.key == 'F') {
                        this.selection.normalize();
                        this.fillBox(this.selection, this.keyCode == 127 ? 0 : this.drawitem);
                    }
                    if (this.key == 'c' || this.key == 'C' || this.key == 'x' || this.key == 'X') {
                        this.selection.normalize();
                        n = 0;
                        while (n <= this.selection.w) {
                            int n2 = 0;
                            while (n2 <= this.selection.h) {
                                point = new Point(this.selection.x + n, this.selection.y + n2);
                                this.clipboard[n][n2] = this.gameGrid[point.x][point.y];
                                ++n2;
                            }
                            ++n;
                        }
                        this.clip = true;
                        this.clipCut = this.key == 'x' || this.key == 'X';
                    }
                } else if (this.key >= '0' && this.key <= '9' || this.key >= 'a' && this.key <= 'f' || this.key >= 'A' && this.key <= 'F' || this.key == '?') {
                    n = this.key >= '0' && this.key <= '9' ? this.key - 48 : (this.key >= 'a' && this.key <= 'f' ? this.key - 97 + 10 : (this.key >= 'A' && this.key <= 'F' ? this.key - 65 + 10 : 16));
                    if (this.tileAvailable[this.crate + n] && (this.drawitem < this.barrel || this.drawitem > this.barrel + 16 || this.drawitem == this.barrel + n) && this.drawitem != this.crate + n) {
                        this.drawitem = this.crate + n;
                    } else if (this.tileAvailable[this.barrel + n]) {
                        this.drawitem = this.barrel + n;
                    }
                }
                if (this.key == '\uffff' && (this.keyCode == 38 || this.keyCode == 40 || this.keyCode == 37 || this.keyCode == 39)) {
                    Point point2 = this.keyCode == 38 ? new Point(0, -1) : (this.keyCode == 40 ? new Point(0, 1) : (this.keyCode == 37 ? new Point(-1, 0) : new Point(1, 0)));
                    Box box = new Box(0, 0, 28, 2);
                    point = this.toolboxCoordsForIndex(this.drawitem);
                    point.add(point2);
                    while (box.contains(point)) {
                        int n3 = point.y * 30 + point.x;
                        if (this.tileAvailable[n3]) {
                            this.drawitem = n3;
                            break;
                        }
                        point.add(point2);
                    }
                }
            }
            if (this.key == 'p' || this.key == 'P') {
                this.physicsVersion = 3 - this.physicsVersion;
            }
            if (this.key == 's' || this.key == 'S') {
                if (this.mode == this.running && this.singleStepping) {
                    this.doSingleStep = true;
                }
                if (this.mode == this.design) {
                    this.StartRunning();
                    this.doSingleStep = true;
                }
                this.singleStepping = true;
            }
        }
        if (this.key == '\u001b') {
            this.key = '\u0000';
        }
        if (this.key == '\u001b') {
            this.key = '\u0000';
        }
        this.loop();
    }

    public void mousePressed() {
        Point point = new Point(this.mouseX, this.mouseY);
        if (this.alertMessage != null) {
            this.alertMessage.mousePressed();
            this.waitForRelease = true;
        } else if (this.mode == this.menu) {
            if (this.menuButtonPlay.contains(point)) {
                this.loadLevel(this.level);
            }
            if (this.menuButtonLoad.contains(point)) {
                this.DoLoadAlert();
            }
            if (this.menuButtonSandbox.contains(point)) {
                this.setGameplay(false);
                this.mode = this.design;
                this.playingLevels = false;
            }
            this.waitForRelease = true;
        } else if (this.mouseY > 500) {
            int n;
            int n2;
            int n3;
            this.selection = null;
            if (this.buttonQuit.contains(point)) {
                if (this.mode == this.running) {
                    this.restoreFrom(this.unstartedMachine);
                }
                this.mode = this.menu;
            }
            if (this.mode == this.design) {
                if (this.buttonLoad.contains(point)) {
                    this.DoLoadAlert();
                } else if (this.buttonSave.contains(point)) {
                    this.alertMessage = new AlertBase("Please wait while your level is saved...");
                    this.goSaving = true;
                }
            }
            if (this.buttonClear.contains(point) && this.mode == this.design) {
                String string = this.gameplay ? "Clearing the level will remove all the\nmachinery you have built. Are you sure you\nwant to do this?" : "Clearing the level will blank the entire\nscreen. Are you sure you want to do this?";
                this.alertMessage = new AlertQuestion(string){

                    public void onOK() {
                        super.onOK();
                        rubicon.this.fillBox(rubicon.this.boxGameGrid, 0);
                        if (!rubicon.this.gameplay) {
                            rubicon.this.loadedURL = null;
                        }
                    }
                };
            }
            if (this.buttonStop.contains(point) && this.mode == this.running) {
                this.mode = this.design;
                this.restoreFrom(this.unstartedMachine);
            }
            if (this.buttonPlay.contains(point)) {
                if (this.mode == this.design) {
                    this.StartRunning();
                }
                this.singleStepping = false;
                boolean bl = this.fastForwarding = (this.mouseEvent.getModifiersEx() & 0x40) == 64;
            }
            if (this.buttonGame.contains(point) && !this.gameplay) {
                this.setGameplay(true);
            }
            if (this.buttonSandbox.contains(point) && this.gameplay) {
                if (this.playingLevels) {
                    this.alertMessage = new AlertQuestion("Switching to sandbox mode will abandon your\nprogress through the levels. Are you sure\nyou want to switch to sandbox mode?"){

                        public void onOK() {
                            super.onOK();
                            rubicon.this.playingLevels = false;
                            rubicon.this.setGameplay(false);
                        }
                    };
                } else {
                    this.setGameplay(false);
                }
            }
            if (this.buttonNext.contains(point) && this.playingLevels && this.mode == this.running && this.solvedFrames != -1) {
                if (this.level + 1 < this.passwords.length) {
                    ++this.level;
                    this.loadLevel(this.level);
                } else {
                    this.alertMessage = new AlertBig("Congratulations! You've solved the breakdowns,\nyou've routed all the crates to their destinations.\nYour work here on the factory floor is done, and\nyou are promoted to the R&D department.\n\nFor further user-designed levels (or to submit\nsome yourself), check the forum link below\nthis game window.");
                }
            }
            if (this.toolbox.contains(point) && this.tileAvailable[n3 = (n2 = (this.mouseX - this.toolbox.x) / 17) + (n = (this.mouseY - this.toolbox.y) / 17) * 30]) {
                this.drawitem = n3;
            }
            this.waitForRelease = true;
        } else if (this.mouseY < 496 && this.mode != this.running) {
            Point point2 = new Point(this.mouseX / 16, this.mouseY / 16);
            int cfr_ignored_0 = this.gameGrid[point2.x][point2.y];
            if (this.selection != null && this.clip && this.mouseButton == 37) {
                Point point3;
                int n;
                int n4;
                if (this.clipCut) {
                    n4 = 0;
                    while (n4 <= this.selection.w) {
                        n = 0;
                        while (n <= this.selection.h) {
                            point3 = new Point(this.selection.x + n4, this.selection.y + n);
                            if (this.isModifiable(point3)) {
                                this.gameGrid[point3.x][point3.y] = 0;
                            }
                            ++n;
                        }
                        ++n4;
                    }
                    this.selection.x = point2.x;
                    this.selection.y = point2.y;
                    this.selection.w = rubicon.min((int)this.selection.w, (int)(this.xsize - this.selection.x - 1));
                    this.selection.h = rubicon.min((int)this.selection.h, (int)(this.ysize - this.selection.y - 1));
                }
                n4 = 0;
                while (n4 <= this.selection.w) {
                    n = 0;
                    while (n <= this.selection.h) {
                        point3 = new Point(point2.x + n4, point2.y + n);
                        if (this.boxGameGrid.contains(point3) && this.isModifiable(point3) && this.tileAvailable[this.clipboard[n4][n]]) {
                            this.gameGrid[point3.x][point3.y] = this.clipboard[n4][n];
                        }
                        ++n;
                    }
                    ++n4;
                }
                this.clip = false;
            } else if ((this.mouseEvent.getModifiersEx() & 0x40) == 64) {
                this.selection = new Box(point2, 0, 0);
            } else if (this.isModifiable(point2) && !this.keyPressed) {
                int n = this.gameGrid[point2.x][point2.y] = this.mouseButton == 39 ? 0 : this.drawitem;
            }
        }
        if (this.mouseButton == 39) {
            this.selection = null;
            this.clip = false;
        }
        this.loop();
    }

    public void mouseReleased() {
        this.waitForRelease = false;
    }

    public void mouseDragged() {
        Point point;
        if (this.mode == this.design && this.alertMessage == null && !this.waitForRelease && this.boxGameGrid.contains(point = new Point(this.mouseX / 16, this.mouseY / 16))) {
            if ((this.mouseEvent.getModifiersEx() & 0x40) == 64 && this.selection != null) {
                this.selection.setSecondPoint(point);
                this.loop();
            } else if (this.isModifiable(point) && !this.keyPressed) {
                this.gameGrid[point.x][point.y] = this.mouseButton == 39 ? 0 : this.drawitem;
                this.loop();
            }
        }
    }

    public void mouseMoved() {
        if (this.alertMessage != null) {
            this.alertMessage.mouseMoved();
        } else if (this.mode == this.menu) {
            this.menuButtonPlay.loopIfNeeded();
            this.menuButtonLoad.loopIfNeeded();
            this.menuButtonSandbox.loopIfNeeded();
        } else if (this.clip) {
            this.loop();
        }
    }

    public void physics() {
        if (this.physicsVersion == 2) {
            this.physicsv2();
        } else {
            this.physicsv1();
        }
    }

    public void physicsv2() {
        int n;
        int n2;
        int n3 = 0;
        while (n3 < this.ysize) {
            n2 = 0;
            while (n2 < this.xsize) {
                this.moved[n2][n3] = 0;
                if (this.grid(n2, n3) == this.fixedblank) {
                    this.gameGrid[n2][n3] = 0;
                }
                if (this.grid(n2, n3) == this.doorkey && this.grid(n2, n3 - 1) == 0 && this.moved[n2][n3 - 1] == 0 && this.grid(n2, n3 + 1) == this.door && this.doorNorthWest[n2][n3 + 1]) {
                    this.gameGrid[n2][n3 + 1] = 0;
                    this.moved[n2][n3 + 1] = 1;
                }
                if (this.grid(n2, n3) == this.doorkey && this.grid(n2, n3 + 1) == 0 && this.moved[n2][n3 + 1] == 0 && this.grid(n2, n3 - 1) == this.door && !this.doorNorthWest[n2][n3 - 1]) {
                    this.gameGrid[n2][n3 - 1] = 0;
                    this.moved[n2][n3 - 1] = 1;
                }
                if (this.grid(n2, n3) == this.doorkey && this.grid(n2 - 1, n3) == 0 && this.moved[n2 - 1][n3] == 0 && this.grid(n2 + 1, n3) == this.trapdoor && this.doorNorthWest[n2 + 1][n3]) {
                    this.gameGrid[n2 + 1][n3] = 0;
                    this.moved[n2 + 1][n3] = 1;
                }
                if (this.grid(n2, n3) == this.doorkey && this.grid(n2 + 1, n3) == 0 && this.moved[n2 + 1][n3] == 0 && this.grid(n2 - 1, n3) == this.trapdoor && !this.doorNorthWest[n2 - 1][n3]) {
                    this.gameGrid[n2 - 1][n3] = 0;
                    this.moved[n2 - 1][n3] = 1;
                }
                ++n2;
            }
            ++n3;
        }
        n3 = 0;
        while (n3 < this.ysize) {
            n2 = 0;
            while (n2 < this.xsize) {
                if (!(n3 >= this.ysize - 1 || this.grid(n2, n3) != this.doorkey || this.grid(n2, n3 - 1) != 0 || this.grid(n2, n3 + 1) <= 0 || this.moved[n2][n3 + 1] != 0 || this.grid(n2, n3 + 1) == this.door && this.doorNorthWest[n2][n3 + 1])) {
                    this.gameGrid[n2][n3 - 1] = this.door;
                    this.moved[n2][n3 - 1] = 1;
                    this.doorNorthWest[n2][n3 - 1] = false;
                }
                if (n3 > 0 && this.grid(n2, n3) == this.doorkey && this.grid(n2, n3 + 1) == 0 && this.grid(n2, n3 - 1) > 0 && this.moved[n2][n3 - 1] == 0 && (this.grid(n2, n3 - 1) != this.door || this.doorNorthWest[n2][n3 - 1])) {
                    this.gameGrid[n2][n3 + 1] = this.door;
                    this.moved[n2][n3 + 1] = 1;
                    this.doorNorthWest[n2][n3 + 1] = true;
                }
                if (!(n2 >= this.xsize - 1 || this.grid(n2, n3) != this.doorkey || this.grid(n2 - 1, n3) != 0 || this.grid(n2 + 1, n3) <= 0 || this.moved[n2 + 1][n3] != 0 || this.grid(n2 + 1, n3) == this.trapdoor && this.doorNorthWest[n2 + 1][n3])) {
                    this.gameGrid[n2 - 1][n3] = this.trapdoor;
                    this.moved[n2 - 1][n3] = 1;
                    this.doorNorthWest[n2 - 1][n3] = false;
                }
                if (n2 > 0 && this.grid(n2, n3) == this.doorkey && this.grid(n2 + 1, n3) == 0 && this.grid(n2 - 1, n3) > 0 && this.moved[n2 - 1][n3] == 0 && (this.grid(n2 - 1, n3) != this.trapdoor || this.doorNorthWest[n2 - 1][n3])) {
                    this.gameGrid[n2 + 1][n3] = this.trapdoor;
                    this.moved[n2 + 1][n3] = 1;
                    this.doorNorthWest[n2 + 1][n3] = true;
                }
                if (this.grid(n2, n3) == this.furnace) {
                    if (this.isCrate(this.grid(n2, n3 - 1))) {
                        this.gameGrid[n2][n3 - 1] = 0;
                    }
                    if (this.isCrate(this.grid(n2 + 1, n3))) {
                        this.gameGrid[n2 + 1][n3] = 0;
                    }
                    if (this.isCrate(this.grid(n2 - 1, n3))) {
                        this.gameGrid[n2 - 1][n3] = 0;
                    }
                    if (this.isCrate(this.grid(n2, n3 + 1))) {
                        this.gameGrid[n2][n3 + 1] = 0;
                    }
                }
                ++n2;
            }
            ++n3;
        }
        n3 = this.ysize - 1;
        while (n3 >= 0) {
            n2 = 0;
            while (n2 < this.xsize) {
                if (this.grid(n2, n3) == this.randomcrate && this.grid(n2, n3 + 1) != this.copier && this.grid(n2, n3 - 1) != this.copierup) {
                    this.gameGrid[n2][n3] = (int)(60.0f + this.random(16.0f));
                }
                if (this.grid(n2, n3) == this.randombarrel && this.grid(n2, n3 + 1) != this.copier && this.grid(n2, n3 - 1) != this.copierup) {
                    this.gameGrid[n2][n3] = (int)(30.0f + this.random(16.0f));
                }
                if (this.moved[n2][n3] == 0) {
                    if ((this.isCrate(this.grid(n2, n3)) || this.grid(n2, n3) == this.dozerright || this.grid(n2, n3) == this.dozerleft) && this.grid(n2, n3 + 1) == 0) {
                        this.gameGrid[n2][n3 + 1] = this.gameGrid[n2][n3];
                        this.gameGrid[n2][n3] = 0;
                        this.moved[n2][n3 + 1] = 1;
                    }
                    if ((this.isCrate(this.grid(n2, n3)) || this.grid(n2, n3) == this.dozerleft) && this.grid(n2, n3 + 1) == this.rampright && this.grid(n2 - 1, n3 + 1) == 0 && this.grid(n2 - 1, n3) == 0) {
                        this.gameGrid[n2 - 1][n3 + 1] = this.gameGrid[n2][n3];
                        this.gameGrid[n2][n3] = 0;
                        this.moved[n2 - 1][n3 + 1] = 1;
                    }
                    if ((this.isCrate(this.grid(n2, n3)) || this.grid(n2, n3) == this.dozerright) && this.grid(n2, n3 + 1) == this.rampleft && this.grid(n2 + 1, n3 + 1) == 0 && this.grid(n2 + 1, n3) == 0) {
                        this.gameGrid[n2 + 1][n3 + 1] = this.gameGrid[n2][n3];
                        this.gameGrid[n2][n3] = 0;
                        this.moved[n2 + 1][n3 + 1] = 1;
                    }
                    if (this.isCrate(this.grid(n2, n3)) && this.grid(n2, n3 - 1) == this.pipeup) {
                        n = n3 - 2;
                        while (n >= 0) {
                            if (this.grid(n2, n) == 0) {
                                this.gameGrid[n2][n] = this.gameGrid[n2][n3];
                                this.gameGrid[n2][n3] = 0;
                                this.moved[n2][n] = 1;
                                n = 0;
                            } else if (this.grid(n2, n) != this.pipeup) {
                                n = 0;
                            }
                            --n;
                        }
                    }
                    if (this.isCrate(this.grid(n2, n3)) && this.grid(n2, n3 + 1) == this.pipedown) {
                        n = n3 + 2;
                        while (n < this.ysize) {
                            if (this.grid(n2, n) == 0) {
                                this.gameGrid[n2][n] = this.gameGrid[n2][n3];
                                this.gameGrid[n2][n3] = 0;
                                this.moved[n2][n] = 1;
                                n = this.ysize;
                            } else if (this.grid(n2, n) != this.pipedown) {
                                n = this.ysize;
                            }
                            ++n;
                        }
                    }
                    if (this.isCrate(this.grid(n2, n3)) && this.grid(n2, n3 + 1) == this.winchdown && this.grid(n2, n3 + 2) == 0) {
                        this.gameGrid[n2][n3 + 2] = this.gameGrid[n2][n3];
                        this.gameGrid[n2][n3] = 0;
                        this.gameGrid[n2][n3 + 1] = this.winchup;
                        this.moved[n2][n3 + 2] = 1;
                    }
                    if (this.isCrate(this.grid(n2, n3)) && this.grid(n2, n3 - 1) == this.winchup && this.grid(n2, n3 - 2) == 0) {
                        this.gameGrid[n2][n3 - 2] = this.gameGrid[n2][n3];
                        this.gameGrid[n2][n3] = 0;
                        this.gameGrid[n2][n3 - 1] = this.winchdown;
                        this.moved[n2][n3 - 2] = 1;
                    }
                    if (this.isCrate(this.grid(n2, n3 - 1)) && this.grid(n2, n3) == this.copier && this.grid(n2, n3 + 1) == 0 && this.moved[n2][n3 + 1] == 0) {
                        this.gameGrid[n2][n3 + 1] = this.gameGrid[n2][n3 - 1];
                        this.moved[n2][n3 + 1] = 1;
                    }
                    if (this.isCrate(this.grid(n2, n3 + 1)) && this.grid(n2, n3) == this.copierup && this.grid(n2, n3 - 1) == 0 && this.moved[n2][n3 + 1] == 0) {
                        this.gameGrid[n2][n3 - 1] = this.gameGrid[n2][n3 + 1];
                        this.moved[n2][n3 - 1] = 1;
                    }
                }
                ++n2;
            }
            --n3;
        }
        n3 = this.ysize - 1;
        while (n3 >= 0) {
            n2 = 0;
            while (n2 < this.xsize) {
                if (this.moved[n2][n3] == 0) {
                    if (this.isCrate(this.grid(n2, n3)) && this.grid(n2, n3 + 1) == this.conveyorright) {
                        this.pushCrate(n2, n3, 1);
                    }
                    if (this.isCrate(this.grid(n2, n3)) && this.grid(n2, n3 + 1) == this.conveyorleft) {
                        this.pushCrate(n2, n3, -1);
                    }
                    if (this.grid(n2, n3) == this.dozerright && this.grid(n2 + 1, n3 - 1) == this.flipsign) {
                        this.gameGrid[n2][n3] = this.dozerleft;
                        this.moved[n2][n3] = 1;
                    } else if (this.grid(n2, n3) == this.dozerright && this.grid(n2 + 1, n3) == 0 && this.grid(n2, n3 + 1) > 0) {
                        this.gameGrid[n2 + 1][n3] = this.gameGrid[n2][n3];
                        this.gameGrid[n2][n3] = 0;
                        this.moved[n2 + 1][n3] = 1;
                    } else if (this.grid(n2, n3) == this.dozerright && this.grid(n2 + 1, n3) == this.rampright && this.grid(n2 + 1, n3 - 1) == 0 && this.grid(n2, n3 - 1) == 0) {
                        this.gameGrid[n2 + 1][n3 - 1] = this.gameGrid[n2][n3];
                        this.gameGrid[n2][n3] = 0;
                        this.moved[n2 + 1][n3 - 1] = 2;
                    } else if (this.grid(n2, n3) == this.dozerright && this.grid(n2 + 1, n3) == this.rampright && this.isCrate(this.grid(n2 + 1, n3 - 1)) && this.grid(n2, n3 - 1) == 0) {
                        if (this.pushCrate(n2 + 1, n3 - 1, 1)) {
                            this.gameGrid[n2 + 1][n3 - 1] = this.gameGrid[n2][n3];
                            this.gameGrid[n2][n3] = 0;
                            this.moved[n2 + 1][n3 - 1] = 2;
                        }
                    } else if (this.grid(n2, n3) == this.dozerright && this.isCrate(this.grid(n2 + 1, n3))) {
                        if (this.pushCrate(n2 + 1, n3, 1)) {
                            this.gameGrid[n2 + 1][n3] = this.gameGrid[n2][n3];
                            this.gameGrid[n2][n3] = 0;
                            this.moved[n2 + 1][n3] = 1;
                        }
                    } else if (this.grid(n2, n3) == this.dozerleft && this.grid(n2 - 1, n3 - 1) == this.flipsign) {
                        this.gameGrid[n2][n3] = this.dozerright;
                        this.moved[n2][n3] = 1;
                    } else if (this.grid(n2, n3) == this.dozerleft && this.grid(n2 - 1, n3) == 0 && this.grid(n2, n3 + 1) > 0) {
                        this.gameGrid[n2 - 1][n3] = this.gameGrid[n2][n3];
                        this.gameGrid[n2][n3] = 0;
                        this.moved[n2 - 1][n3] = 1;
                    } else if (this.grid(n2, n3) == this.dozerleft && this.grid(n2 - 1, n3) == this.rampleft && this.grid(n2 - 1, n3 - 1) == 0 && this.grid(n2, n3 - 1) == 0) {
                        this.gameGrid[n2 - 1][n3 - 1] = this.gameGrid[n2][n3];
                        this.gameGrid[n2][n3] = 0;
                        this.moved[n2 - 1][n3 - 1] = 2;
                    } else if (this.grid(n2, n3) == this.dozerleft && this.grid(n2 - 1, n3) == this.rampleft && this.isCrate(this.grid(n2 - 1, n3 - 1)) && this.grid(n2, n3 - 1) == 0) {
                        if (this.pushCrate(n2 - 1, n3 - 1, -1)) {
                            this.gameGrid[n2 - 1][n3 - 1] = this.gameGrid[n2][n3];
                            this.gameGrid[n2][n3] = 0;
                            this.moved[n2 - 1][n3 - 1] = 2;
                        }
                    } else if (this.grid(n2, n3) == this.dozerleft && this.isCrate(this.grid(n2 - 1, n3)) && this.pushCrate(n2 - 1, n3, -1)) {
                        this.gameGrid[n2 - 1][n3] = this.gameGrid[n2][n3];
                        this.gameGrid[n2][n3] = 0;
                        this.moved[n2 - 1][n3] = 1;
                    }
                }
                ++n2;
            }
            --n3;
        }
        n3 = this.ysize - 1;
        while (n3 >= 0) {
            n2 = 0;
            while (n2 < this.xsize) {
                if (this.moved[n2][n3] == 0) {
                    boolean bl;
                    int n4;
                    if (this.grid(n2, n3) == this.gate && this.isCrate(this.grid(n2, n3 - 1)) && this.isCrate(this.grid(n2, n3 + 1)) && this.moved[n2][n3 - 1] == 0) {
                        n = this.grid(n2, n3 + 1);
                        n = n > 59 ? (n -= 60) : (n -= 30);
                        n4 = this.grid(n2, n3 - 1);
                        n4 = n4 > 59 ? (n4 -= 60) : (n4 -= 30);
                        if (n >= n4 && this.grid(n2 - 1, n3 - 1) == 0) {
                            this.gameGrid[n2 - 1][n3 - 1] = this.gameGrid[n2][n3 - 1];
                            this.gameGrid[n2][n3 - 1] = 0;
                            this.moved[n2 - 1][n3 - 1] = 1;
                        } else if (n < n4 && this.grid(n2 + 1, n3 - 1) == 0) {
                            this.gameGrid[n2 + 1][n3 - 1] = this.gameGrid[n2][n3 - 1];
                            this.gameGrid[n2][n3 - 1] = 0;
                            this.moved[n2 + 1][n3 - 1] = 1;
                        }
                    }
                    if ((this.grid(n2, n3) == this.matchgreen || this.grid(n2, n3) == this.matchred || this.grid(n2, n3) == this.matchoff) && this.isActualCrate(this.grid(n2, n3 - 1)) && this.isActualCrate(this.grid(n2, n3 + 1))) {
                        this.gameGrid[n2][n3] = this.grid(n2, n3 + 1) == this.grid(n2, n3 - 1) ? this.matchgreen : this.matchred;
                    }
                    if (!(this.grid(n2, n3) != this.matchgreen && this.grid(n2, n3) != this.matchred || this.isActualCrate(this.grid(n2, n3 - 1)) && this.isActualCrate(this.grid(n2, n3 + 1)))) {
                        this.gameGrid[n2][n3] = this.matchoff;
                    }
                    if (this.grid(n2, n3) == this.packer && this.isCrate(this.grid(n2 - 1, n3 + 1)) && this.isCrate(this.grid(n2, n3 + 1)) && this.grid(n2 + 1, n3 + 1) == 0 && this.moved[n2 - 1][n3 + 1] == 0 && this.moved[n2][n3 + 1] == 0) {
                        bl = false;
                        n = this.grid(n2 - 1, n3 + 1);
                        if (n > 59) {
                            n -= 60;
                        } else {
                            n -= 30;
                            bl = true;
                        }
                        n4 = this.grid(n2, n3 + 1);
                        if (n4 > 59) {
                            n4 -= 60;
                        } else {
                            n4 -= 30;
                            bl = true;
                        }
                        n = (n + n4) % 16;
                        this.gameGrid[n2 - 1][n3 + 1] = 0;
                        this.gameGrid[n2][n3 + 1] = 0;
                        this.gameGrid[n2 + 1][n3 + 1] = bl ? 30 + n : 60 + n;
                        this.moved[n2 + 1][n3 + 1] = 1;
                    } else if (this.grid(n2, n3) == this.unpacker && this.isCrate(this.grid(n2 - 1, n3 + 1)) && this.isCrate(this.grid(n2, n3 + 1)) && this.grid(n2 + 1, n3 + 1) == 0 && this.moved[n2 - 1][n3 + 1] == 0 && this.moved[n2][n3 + 1] == 0) {
                        bl = false;
                        n = this.grid(n2 - 1, n3 + 1);
                        if (n > 59) {
                            n -= 60;
                        } else {
                            n -= 30;
                            bl = true;
                        }
                        n4 = this.grid(n2, n3 + 1);
                        if (n4 > 59) {
                            n4 -= 60;
                        } else {
                            n4 -= 30;
                            bl = true;
                        }
                        n = (16 + n - n4) % 16;
                        this.gameGrid[n2 - 1][n3 + 1] = 0;
                        this.gameGrid[n2][n3 + 1] = 0;
                        this.gameGrid[n2 + 1][n3 + 1] = bl ? 30 + n : 60 + n;
                        this.moved[n2 + 1][n3 + 1] = 1;
                    }
                }
                ++n2;
            }
            --n3;
        }
    }

    public void physicsv1() {
        int n;
        int n2;
        int n3 = 0;
        while (n3 < this.ysize) {
            n2 = 0;
            while (n2 < this.xsize) {
                this.moved[n2][n3] = 0;
                if (this.grid(n2, n3) == this.fixedblank) {
                    this.gameGrid[n2][n3] = 0;
                }
                if (this.grid(n2, n3) == this.doorkey && this.grid(n2, n3 - 1) == 0 && this.moved[n2][n3 - 1] == 0 && this.grid(n2, n3 + 1) == this.door && this.doorNorthWest[n2][n3 + 1]) {
                    this.gameGrid[n2][n3 + 1] = 0;
                    this.moved[n2][n3 + 1] = 1;
                }
                if (this.grid(n2, n3) == this.doorkey && this.grid(n2, n3 + 1) == 0 && this.moved[n2][n3 + 1] == 0 && this.grid(n2, n3 - 1) == this.door && !this.doorNorthWest[n2][n3 - 1]) {
                    this.gameGrid[n2][n3 - 1] = 0;
                    this.moved[n2][n3 - 1] = 1;
                }
                if (this.grid(n2, n3) == this.doorkey && this.grid(n2 - 1, n3) == 0 && this.moved[n2 - 1][n3] == 0 && this.grid(n2 + 1, n3) == this.trapdoor && this.doorNorthWest[n2 + 1][n3]) {
                    this.gameGrid[n2 + 1][n3] = 0;
                    this.moved[n2 + 1][n3] = 1;
                }
                if (this.grid(n2, n3) == this.doorkey && this.grid(n2 + 1, n3) == 0 && this.moved[n2 + 1][n3] == 0 && this.grid(n2 - 1, n3) == this.trapdoor && !this.doorNorthWest[n2 - 1][n3]) {
                    this.gameGrid[n2 - 1][n3] = 0;
                    this.moved[n2 - 1][n3] = 1;
                }
                ++n2;
            }
            ++n3;
        }
        n3 = 0;
        while (n3 < this.ysize) {
            n2 = 0;
            while (n2 < this.xsize) {
                if (!(n3 >= this.ysize - 1 || this.grid(n2, n3) != this.doorkey || this.grid(n2, n3 - 1) != 0 || this.grid(n2, n3 + 1) <= 0 || this.moved[n2][n3 + 1] != 0 || this.grid(n2, n3 + 1) == this.door && this.doorNorthWest[n2][n3 + 1])) {
                    this.gameGrid[n2][n3 - 1] = this.door;
                    this.moved[n2][n3 - 1] = 1;
                    this.doorNorthWest[n2][n3 - 1] = false;
                }
                if (n3 > 0 && this.grid(n2, n3) == this.doorkey && this.grid(n2, n3 + 1) == 0 && this.grid(n2, n3 - 1) > 0 && this.moved[n2][n3 - 1] == 0 && (this.grid(n2, n3 - 1) != this.door || this.doorNorthWest[n2][n3 - 1])) {
                    this.gameGrid[n2][n3 + 1] = this.door;
                    this.moved[n2][n3 + 1] = 1;
                    this.doorNorthWest[n2][n3 + 1] = true;
                }
                if (!(n2 >= this.xsize - 1 || this.grid(n2, n3) != this.doorkey || this.grid(n2 - 1, n3) != 0 || this.grid(n2 + 1, n3) <= 0 || this.moved[n2 + 1][n3] != 0 || this.grid(n2 + 1, n3) == this.trapdoor && this.doorNorthWest[n2 + 1][n3])) {
                    this.gameGrid[n2 - 1][n3] = this.trapdoor;
                    this.moved[n2 - 1][n3] = 1;
                    this.doorNorthWest[n2 - 1][n3] = false;
                }
                if (n2 > 0 && this.grid(n2, n3) == this.doorkey && this.grid(n2 + 1, n3) == 0 && this.grid(n2 - 1, n3) > 0 && this.moved[n2 - 1][n3] == 0 && (this.grid(n2 - 1, n3) != this.trapdoor || this.doorNorthWest[n2 - 1][n3])) {
                    this.gameGrid[n2 + 1][n3] = this.trapdoor;
                    this.moved[n2 + 1][n3] = 1;
                    this.doorNorthWest[n2 + 1][n3] = true;
                }
                if (this.grid(n2, n3) == this.furnace) {
                    if (this.isCrate(this.grid(n2, n3 - 1))) {
                        this.gameGrid[n2][n3 - 1] = 0;
                    }
                    if (this.isCrate(this.grid(n2 + 1, n3))) {
                        this.gameGrid[n2 + 1][n3] = 0;
                    }
                    if (this.isCrate(this.grid(n2 - 1, n3))) {
                        this.gameGrid[n2 - 1][n3] = 0;
                    }
                    if (this.isCrate(this.grid(n2, n3 + 1))) {
                        this.gameGrid[n2][n3 + 1] = 0;
                    }
                }
                ++n2;
            }
            ++n3;
        }
        n3 = this.ysize - 1;
        while (n3 >= 0) {
            n2 = 0;
            while (n2 < this.xsize) {
                if (this.grid(n2, n3) == this.randomcrate && this.grid(n2, n3 + 1) != this.copier && this.grid(n2, n3 - 1) != this.copierup) {
                    this.gameGrid[n2][n3] = (int)(60.0f + this.random(16.0f));
                }
                if (this.grid(n2, n3) == this.randombarrel && this.grid(n2, n3 + 1) != this.copier && this.grid(n2, n3 - 1) != this.copierup) {
                    this.gameGrid[n2][n3] = (int)(30.0f + this.random(16.0f));
                }
                if (this.moved[n2][n3] == 0) {
                    if ((this.isCrate(this.grid(n2, n3)) || this.grid(n2, n3) == this.dozerright || this.grid(n2, n3) == this.dozerleft) && this.grid(n2, n3 + 1) == 0) {
                        this.gameGrid[n2][n3 + 1] = this.gameGrid[n2][n3];
                        this.gameGrid[n2][n3] = 0;
                        this.moved[n2][n3 + 1] = 1;
                    }
                    if ((this.isCrate(this.grid(n2, n3)) || this.grid(n2, n3) == this.dozerleft) && this.grid(n2, n3 + 1) == this.rampright && this.grid(n2 - 1, n3 + 1) == 0 && this.grid(n2 - 1, n3) == 0) {
                        this.gameGrid[n2 - 1][n3 + 1] = this.gameGrid[n2][n3];
                        this.gameGrid[n2][n3] = 0;
                        this.moved[n2 - 1][n3 + 1] = 1;
                    }
                    if ((this.isCrate(this.grid(n2, n3)) || this.grid(n2, n3) == this.dozerright) && this.grid(n2, n3 + 1) == this.rampleft && this.grid(n2 + 1, n3 + 1) == 0 && this.grid(n2 + 1, n3) == 0) {
                        this.gameGrid[n2 + 1][n3 + 1] = this.gameGrid[n2][n3];
                        this.gameGrid[n2][n3] = 0;
                        this.moved[n2 + 1][n3 + 1] = 1;
                    }
                    if (this.isCrate(this.grid(n2, n3)) && this.grid(n2, n3 - 1) == this.pipeup) {
                        n = n3 - 2;
                        while (n > 0) {
                            if (this.grid(n2, n) == 0) {
                                this.gameGrid[n2][n] = this.gameGrid[n2][n3];
                                this.gameGrid[n2][n3] = 0;
                                this.moved[n2][n] = 1;
                                n = 0;
                            } else if (this.grid(n2, n) != this.pipeup) {
                                n = 0;
                            }
                            --n;
                        }
                    }
                    if (this.isCrate(this.grid(n2, n3)) && this.grid(n2, n3 + 1) == this.pipedown) {
                        n = n3 + 2;
                        while (n < this.ysize) {
                            if (this.grid(n2, n) == 0) {
                                this.gameGrid[n2][n] = this.gameGrid[n2][n3];
                                this.gameGrid[n2][n3] = 0;
                                this.moved[n2][n] = 1;
                                n = this.ysize;
                            } else if (this.grid(n2, n) != this.pipedown) {
                                n = this.ysize;
                            }
                            ++n;
                        }
                    }
                    if (this.isCrate(this.grid(n2, n3)) && this.grid(n2, n3 + 1) == this.winchdown && this.grid(n2, n3 + 2) == 0) {
                        this.gameGrid[n2][n3 + 2] = this.gameGrid[n2][n3];
                        this.gameGrid[n2][n3] = 0;
                        this.gameGrid[n2][n3 + 1] = this.winchup;
                        this.moved[n2][n3 + 2] = 1;
                    }
                    if (this.isCrate(this.grid(n2, n3)) && this.grid(n2, n3 - 1) == this.winchup && this.grid(n2, n3 - 2) == 0) {
                        this.gameGrid[n2][n3 - 2] = this.gameGrid[n2][n3];
                        this.gameGrid[n2][n3] = 0;
                        this.gameGrid[n2][n3 - 1] = this.winchdown;
                        this.moved[n2][n3 - 2] = 1;
                    }
                }
                ++n2;
            }
            --n3;
        }
        n3 = this.ysize - 1;
        while (n3 >= 0) {
            n2 = 0;
            while (n2 < this.xsize) {
                if (this.moved[n2][n3] == 0) {
                    if (this.isCrate(this.grid(n2, n3)) && this.grid(n2, n3 + 1) == this.conveyorright) {
                        this.pushCrate(n2, n3, 1);
                    }
                    if (this.isCrate(this.grid(n2, n3)) && this.grid(n2, n3 + 1) == this.conveyorleft) {
                        this.pushCrate(n2, n3, -1);
                    }
                    if (this.grid(n2, n3) == this.dozerright && this.grid(n2 + 1, n3 - 1) == this.flipsign) {
                        this.gameGrid[n2][n3] = this.dozerleft;
                        this.moved[n2][n3] = 1;
                    } else if (this.grid(n2, n3) == this.dozerright && this.grid(n2 + 1, n3) == 0 && this.grid(n2, n3 + 1) > 0) {
                        this.gameGrid[n2 + 1][n3] = this.gameGrid[n2][n3];
                        this.gameGrid[n2][n3] = 0;
                        this.moved[n2 + 1][n3] = 1;
                    } else if (this.grid(n2, n3) == this.dozerright && this.grid(n2 + 1, n3) == this.rampright && this.grid(n2 + 1, n3 - 1) == 0 && this.grid(n2, n3 - 1) == 0) {
                        this.gameGrid[n2 + 1][n3 - 1] = this.gameGrid[n2][n3];
                        this.gameGrid[n2][n3] = 0;
                        this.moved[n2 + 1][n3 - 1] = 2;
                    } else if (this.grid(n2, n3) == this.dozerright && this.grid(n2 + 1, n3) == this.rampright && this.isCrate(this.grid(n2 + 1, n3 - 1)) && this.grid(n2, n3 - 1) == 0) {
                        if (this.pushCrate(n2 + 1, n3 - 1, 1)) {
                            this.gameGrid[n2 + 1][n3 - 1] = this.gameGrid[n2][n3];
                            this.gameGrid[n2][n3] = 0;
                            this.moved[n2 + 1][n3 - 1] = 2;
                        }
                    } else if (this.grid(n2, n3) == this.dozerright && this.isCrate(this.grid(n2 + 1, n3))) {
                        if (this.pushCrate(n2 + 1, n3, 1)) {
                            this.gameGrid[n2 + 1][n3] = this.gameGrid[n2][n3];
                            this.gameGrid[n2][n3] = 0;
                            this.moved[n2 + 1][n3] = 1;
                        }
                    } else if (this.grid(n2, n3) == this.dozerleft && this.grid(n2 - 1, n3 - 1) == this.flipsign) {
                        this.gameGrid[n2][n3] = this.dozerright;
                        this.moved[n2][n3] = 1;
                    } else if (this.grid(n2, n3) == this.dozerleft && this.grid(n2 - 1, n3) == 0 && this.grid(n2, n3 + 1) > 0) {
                        this.gameGrid[n2 - 1][n3] = this.gameGrid[n2][n3];
                        this.gameGrid[n2][n3] = 0;
                        this.moved[n2 - 1][n3] = 1;
                    } else if (this.grid(n2, n3) == this.dozerleft && this.grid(n2 - 1, n3) == this.rampleft && this.grid(n2 - 1, n3 - 1) == 0 && this.grid(n2, n3 - 1) == 0) {
                        this.gameGrid[n2 - 1][n3 - 1] = this.gameGrid[n2][n3];
                        this.gameGrid[n2][n3] = 0;
                        this.moved[n2 - 1][n3 - 1] = 2;
                    } else if (this.grid(n2, n3) == this.dozerleft && this.grid(n2 - 1, n3) == this.rampleft && this.isCrate(this.grid(n2 - 1, n3 - 1)) && this.grid(n2, n3 - 1) == 0) {
                        if (this.pushCrate(n2 - 1, n3 - 1, -1)) {
                            this.gameGrid[n2 - 1][n3 - 1] = this.gameGrid[n2][n3];
                            this.gameGrid[n2][n3] = 0;
                            this.moved[n2 - 1][n3 - 1] = 2;
                        }
                    } else if (this.grid(n2, n3) == this.dozerleft && this.isCrate(this.grid(n2 - 1, n3)) && this.pushCrate(n2 - 1, n3, -1)) {
                        this.gameGrid[n2 - 1][n3] = this.gameGrid[n2][n3];
                        this.gameGrid[n2][n3] = 0;
                        this.moved[n2 - 1][n3] = 1;
                    }
                }
                ++n2;
            }
            --n3;
        }
        n3 = this.ysize - 1;
        while (n3 >= 0) {
            n2 = 0;
            while (n2 < this.xsize) {
                if (this.moved[n2][n3] == 0) {
                    boolean bl;
                    int n4;
                    if (this.isCrate(this.grid(n2, n3 - 1)) && this.grid(n2, n3) == this.copier && this.grid(n2, n3 + 1) == 0) {
                        this.gameGrid[n2][n3 + 1] = this.gameGrid[n2][n3 - 1];
                        this.moved[n2][n3 + 1] = 1;
                    }
                    if (this.isCrate(this.grid(n2, n3 + 1)) && this.grid(n2, n3) == this.copierup && this.grid(n2, n3 - 1) == 0) {
                        this.gameGrid[n2][n3 - 1] = this.gameGrid[n2][n3 + 1];
                        this.moved[n2][n3 - 1] = 1;
                    }
                    if (this.grid(n2, n3) == this.gate && this.isCrate(this.grid(n2, n3 - 1)) && this.isCrate(this.grid(n2, n3 + 1)) && this.moved[n2][n3 - 1] == 0) {
                        n = this.grid(n2, n3 + 1);
                        n = n > 59 ? (n -= 60) : (n -= 30);
                        n4 = this.grid(n2, n3 - 1);
                        n4 = n4 > 59 ? (n4 -= 60) : (n4 -= 30);
                        if (n >= n4 && this.grid(n2 - 1, n3 - 1) == 0) {
                            this.gameGrid[n2 - 1][n3 - 1] = this.gameGrid[n2][n3 - 1];
                            this.gameGrid[n2][n3 - 1] = 0;
                            this.moved[n2 - 1][n3 - 1] = 1;
                        } else if (n < n4 && this.grid(n2 + 1, n3 - 1) == 0) {
                            this.gameGrid[n2 + 1][n3 - 1] = this.gameGrid[n2][n3 - 1];
                            this.gameGrid[n2][n3 - 1] = 0;
                            this.moved[n2 + 1][n3 - 1] = 1;
                        }
                    }
                    if ((this.grid(n2, n3) == this.matchgreen || this.grid(n2, n3) == this.matchred || this.grid(n2, n3) == this.matchoff) && this.isActualCrate(this.grid(n2, n3 - 1)) && this.isActualCrate(this.grid(n2, n3 + 1))) {
                        this.gameGrid[n2][n3] = this.grid(n2, n3 + 1) == this.grid(n2, n3 - 1) ? this.matchgreen : this.matchred;
                    }
                    if (!(this.grid(n2, n3) != this.matchgreen && this.grid(n2, n3) != this.matchred || this.isActualCrate(this.grid(n2, n3 - 1)) && this.isActualCrate(this.grid(n2, n3 + 1)))) {
                        this.gameGrid[n2][n3] = this.matchoff;
                    }
                    if (this.grid(n2, n3) == this.packer && this.isCrate(this.grid(n2 - 1, n3 + 1)) && this.isCrate(this.grid(n2, n3 + 1)) && this.grid(n2 + 1, n3 + 1) == 0) {
                        bl = false;
                        n = this.grid(n2 - 1, n3 + 1);
                        if (n > 59) {
                            n -= 60;
                        } else {
                            n -= 30;
                            bl = true;
                        }
                        n4 = this.grid(n2, n3 + 1);
                        if (n4 > 59) {
                            n4 -= 60;
                        } else {
                            n4 -= 30;
                            bl = true;
                        }
                        n = (n + n4) % 16;
                        this.gameGrid[n2 - 1][n3 + 1] = 0;
                        this.gameGrid[n2][n3 + 1] = 0;
                        this.gameGrid[n2 + 1][n3 + 1] = bl ? 30 + n : 60 + n;
                        this.moved[n2 + 1][n3 + 1] = 1;
                    } else if (this.grid(n2, n3) == this.unpacker && this.isCrate(this.grid(n2 - 1, n3 + 1)) && this.isCrate(this.grid(n2, n3 + 1)) && this.grid(n2 + 1, n3 + 1) == 0) {
                        bl = false;
                        n = this.grid(n2 - 1, n3 + 1);
                        if (n > 59) {
                            n -= 60;
                        } else {
                            n -= 30;
                            bl = true;
                        }
                        n4 = this.grid(n2, n3 + 1);
                        if (n4 > 59) {
                            n4 -= 60;
                        } else {
                            n4 -= 30;
                            bl = true;
                        }
                        n = (16 + n - n4) % 16;
                        this.gameGrid[n2 - 1][n3 + 1] = 0;
                        this.gameGrid[n2][n3 + 1] = 0;
                        this.gameGrid[n2 + 1][n3 + 1] = bl ? 30 + n : 60 + n;
                        this.moved[n2 + 1][n3 + 1] = 1;
                    }
                }
                ++n2;
            }
            --n3;
        }
    }

    public boolean isCrate(int n) {
        return n > 29 && n < 47 || n > 59 && n < 77;
    }

    public boolean isActualCrate(int n) {
        return n > 59 && n < 77;
    }

    public boolean pushCrate(int n, int n2, int n3) {
        boolean bl = false;
        if (this.grid(n + n3, n2) == 0) {
            bl = true;
        } else if (this.grid(n + n3, n2) == this.rampright && this.isCrate(this.grid(n + n3, n2 - 1)) && this.grid(n, n2 - 1) == 0 && n3 == 1) {
            bl = this.pushCrate(n + n3, n2 - 1, n3);
        } else if (this.grid(n + n3, n2) == this.rampleft && this.isCrate(this.grid(n + n3, n2 - 1)) && this.grid(n, n2 - 1) == 0 && n3 == -1) {
            bl = this.pushCrate(n + n3, n2 - 1, n3);
        } else if (this.grid(n + n3, n2) == this.rampright && this.grid(n + n3, n2 - 1) == 0 && this.grid(n, n2 - 1) == 0 && n3 == 1) {
            bl = true;
        } else if (this.grid(n + n3, n2) == this.rampleft && this.grid(n + n3, n2 - 1) == 0 && this.grid(n, n2 - 1) == 0 && n3 == -1) {
            bl = true;
        } else if (this.isCrate(this.grid(n + n3, n2))) {
            bl = this.pushCrate(n + n3, n2, n3);
        }
        if (bl) {
            if (this.grid(n + n3, n2) == this.rampright && this.grid(n + n3, n2 - 1) == 0 && n3 == 1 || this.grid(n + n3, n2) == this.rampleft && this.grid(n + n3, n2 - 1) == 0 && n3 == -1) {
                this.gameGrid[n + n3][n2 - 1] = this.gameGrid[n][n2];
                this.gameGrid[n][n2] = 0;
                this.moved[n + n3][n2 - 1] = 1;
            } else {
                this.gameGrid[n + n3][n2] = this.gameGrid[n][n2];
                this.gameGrid[n][n2] = 0;
                this.moved[n + n3][n2] = 1;
            }
        }
        return bl;
    }

    public boolean isModifiable(Point point) {
        return !this.gameplay || this.tileAvailable[this.gameGrid[point.x][point.y]] && !this.locked[point.x][point.y];
    }

    public void fillBox(Box box, int n) {
        int n2 = 0;
        while (n2 <= box.w) {
            int n3 = 0;
            while (n3 <= box.h) {
                Point point = new Point(box.x + n2, box.y + n3);
                if (this.isModifiable(point)) {
                    this.gameGrid[point.x][point.y] = n;
                }
                ++n3;
            }
            ++n2;
        }
    }

    public int grid(int n, int n2) {
        if (n > -1 && n < this.xsize && n2 > -1 && n2 < this.ysize) {
            return this.gameGrid[n][n2];
        }
        return this.girder;
    }

    public void loadLevel(int n) {
        int n2 = 0;
        while (n2 < this.ysize) {
            int n3 = 0;
            while (n3 < this.xsize) {
                this.gameGrid[n3][n2] = 0;
                this.locked[n3][n2] = false;
                ++n3;
            }
            ++n2;
        }
        this.level = n;
        this.physicsVersion = 2;
        this.playingLevels = true;
        String[] stringArray = this.loadStrings("level" + (this.level + 1) + ".rub");
        this.restoreFrom(stringArray);
        this.mode = this.design;
        this.setGameplay(true);
        this.loadedURL = this.passwords[this.level];
        this.alertMessage = new Alert("                           Level " + (this.level + 1) + " of " + this.passwords.length + "\n\n" + "                      Password: " + this.passwords[this.level]);
    }

    public void restoreFrom(String[] stringArray) {
        boolean bl = false;
        int n = 0;
        while (n < this.ysize) {
            int n2 = 0;
            while (n2 < this.xsize) {
                if (n < stringArray.length && stringArray[n] != null && n2 < stringArray[n].length()) {
                    this.gameGrid[n2][n] = this.blocksASCII.indexOf(stringArray[n].charAt(n2));
                    if (this.gameGrid[n2][n] == -1) {
                        this.gameGrid[n2][n] = 0;
                        if (!bl) {
                            this.alertMessage = new Alert("Warning: unrecognized character found\nat row " + (n + 1) + ", column " + (n2 + 1) + ".\n" + "Level may be corrupt or incompatible.\n");
                        }
                        bl = true;
                    }
                } else {
                    this.gameGrid[n2][n] = 0;
                }
                ++n2;
            }
            ++n;
        }
    }

    public void saveTo(String[] stringArray) {
        int n = 0;
        while (n < this.ysize) {
            String string = "";
            int n2 = 0;
            while (n2 < this.xsize) {
                string = String.valueOf(string) + this.blocksASCII.charAt(this.gameGrid[n2][n]);
                ++n2;
            }
            stringArray[n] = string;
            ++n;
        }
    }

    public void loadUserLevel(String string) {
        String[] stringArray;
        String string2;
        int n = 0;
        while (n < this.passwords.length) {
            if (string.equals(this.passwords[n])) {
                this.loadLevel(n);
                return;
            }
            ++n;
        }
        if (string.startsWith("local")) {
            string2 = this.getCookie(string);
            if (string2 == null) {
                this.alertMessage = new Alert("The level \"" + string + "\" could not be found.");
                return;
            }
            stringArray = URLDecoder.decode(string2).split("@");
        } else {
            try {
                stringArray = this.loadStrings(String.valueOf(this.loaderPath) + string);
            }
            catch (Exception exception) {
                stringArray = null;
            }
            if (stringArray == null) {
                this.alertMessage = new Alert("Unable to contact server.\nCheck your network connection.");
                return;
            }
        }
        if (stringArray.length == 0 || stringArray[0].equals("NOT FOUND")) {
            this.alertMessage = new Alert("The level \"" + string + "\" could not be found.");
            return;
        }
        string2 = null;
        String string3 = null;
        String string4 = null;
        String string5 = null;
        this.physicsVersion = 1;
        String[] stringArray2 = new String[this.ysize];
        int n2 = 0;
        int n3 = 0;
        while (n2 < stringArray.length && n3 < stringArray2.length) {
            if (stringArray[n2].startsWith("*")) {
                if (stringArray[n2].startsWith("* Title:")) {
                    string2 = stringArray[n2].substring(8);
                } else if (stringArray[n2].startsWith("* Designer:")) {
                    string3 = stringArray[n2].substring(11);
                    if (string3.length() == 0) {
                        string3 = "Anonymous";
                    }
                } else if (stringArray[n2].startsWith("* Follows:")) {
                    string5 = stringArray[n2].substring(10);
                } else if (stringArray[n2].equals("* Physics:2")) {
                    this.physicsVersion = 2;
                } else if (stringArray[n2].equals("* Physics:1")) {
                    this.physicsVersion = 1;
                } else if (stringArray[n2].startsWith("* Type:")) {
                    string4 = stringArray[n2].substring(7);
                    if (string4.length() == 0) {
                        string4 = "Unknown";
                    }
                } else {
                    String string6 = stringArray[n2].substring(1).trim();
                    String[] stringArray3 = rubicon.split((String)string6, (String)"*");
                    if (stringArray3.length > 1) {
                        string2 = stringArray3[0];
                        string3 = stringArray3[1];
                    } else if (string2 == null) {
                        string2 = "Corrupted Level";
                        string3 = "Unknown";
                    }
                }
            } else {
                stringArray2[n3] = stringArray[n2];
                ++n3;
            }
            ++n2;
        }
        if (string2 != null) {
            String string7;
            String string8 = "";
            if (string4 != null) {
                if (string4.equals("Puzzle (1)")) {
                    string8 = "A 'Newbie' Level Puzzle\n";
                } else if (string4.equals("Puzzle (2)")) {
                    string8 = "An 'Easy' Level Puzzle\n";
                } else if (string4.equals("Puzzle (3)")) {
                    string8 = "A 'Medium' Level Puzzle\n";
                } else if (string4.equals("Puzzle (4)")) {
                    string8 = "A 'Hard' Level Puzzle\n";
                } else if (string4.equals("Puzzle (5)")) {
                    string8 = "An 'Expert' Level Puzzle\n";
                } else if (string4.equals("Solution")) {
                    string8 = string5 != null ? "A Solution to '" + string5 + "'\n" : "A Solution\n";
                }
            }
            String string9 = string7 = string3 != null ? "Designed by " + string3 + "\n" : "";
            this.alertMessage = this.physicsVersion == 1 ? new AlertBig("\"" + string2 + "\"\n" + string8 + string7 + "\n" + "(Note that this level was designed using the old\n" + "physics model - Packers, Unpackers and\n" + "Copiers are green here, and run slightly faster.\n" + "See the main page for details.)") : new Alert("\"" + string2 + "\"\n" + string8 + string7);
        } else {
            this.alertMessage = this.physicsVersion == 1 ? new AlertBig("This level has not been archived! It will be\ndeleted after seven days, unless someone\narchives it in the Warehouse.\n\n(It also uses the old physics model. See the main\nRubicon page for more details.)") : new Alert("This level has not been archived! It will be\ndeleted after seven days, unless someone\narchives it in the Warehouse.");
        }
        int n4 = 0;
        while (n4 < this.ysize) {
            int n5 = 0;
            while (n5 < this.xsize) {
                this.gameGrid[n5][n4] = 0;
                this.locked[n5][n4] = false;
                ++n5;
            }
            ++n4;
        }
        this.playingLevels = false;
        this.restoreFrom(stringArray2);
        this.mode = this.design;
        this.setGameplay(true);
        this.loadedURL = string;
    }

    public String serializeLevel() {
        String string = "";
        string = String.valueOf(string) + "* Physics:" + this.physicsVersion + "@";
        int n = 0;
        while (n < this.ysize) {
            int n2 = 0;
            while (n2 < this.xsize) {
                string = String.valueOf(string) + this.blocksASCII.charAt(this.gameGrid[n2][n]);
                ++n2;
            }
            string = String.valueOf(string) + "@";
            ++n;
        }
        return URLEncoder.encode(string);
    }

    public boolean saveLevel() {
        String string;
        block4: {
            String string2;
            String string3 = "aeiouy";
            String string4 = "bcdfghklmnprstvxzbdgj";
            do {
                string2 = String.valueOf(string4.charAt(PApplet.parseInt((float)this.random(0.0f, 21.0f)))) + string3.charAt(PApplet.parseInt((float)this.random(0.0f, 6.0f))) + string4.charAt(PApplet.parseInt((float)this.random(0.0f, 20.0f))) + string3.charAt(PApplet.parseInt((float)this.random(0.0f, 6.0f))) + string4.charAt(PApplet.parseInt((float)this.random(0.0f, 20.0f))) + string3.charAt(PApplet.parseInt((float)this.random(0.0f, 6.0f))) + string4.charAt(PApplet.parseInt((float)this.random(0.0f, 20.0f)));
            } while (this.loadStrings(String.valueOf(this.webLevelPath) + string2 + ".rub") != null);
            String string5 = this.serializeLevel();
            URL uRL = new URL("http://kevan.org/rubicon/rubisave.php");
            URLConnection uRLConnection = uRL.openConnection();
            uRLConnection.setDoInput(true);
            uRLConnection.setDoOutput(true);
            uRLConnection.setUseCaches(false);
            uRLConnection.setRequestProperty("Content-Type", "application/x-www-form-urlencoded");
            DataOutputStream dataOutputStream = new DataOutputStream(uRLConnection.getOutputStream());
            String string6 = "filename=" + string2 + "&content=" + string5;
            dataOutputStream.writeBytes(string6);
            dataOutputStream.flush();
            dataOutputStream.close();
            DataInputStream dataInputStream = new DataInputStream(uRLConnection.getInputStream());
            string = dataInputStream.readLine();
            dataInputStream.close();
            if (!string.equals("SUCCESS")) break block4;
            this.alertMessage = new AlertBig("Level has been saved as '" + string2 + "'.\n\nThis level will be deleted after seven days! If you\nwant to save the level permanently so that you\ncan share it with others without it expiring, you\nmust click the 'warehouse' link below the game\nwindow.");
            return true;
        }
        try {
            rubicon.println((String)("Error from server: " + string));
        }
        catch (Exception exception) {
            rubicon.println((String)("Exception: " + exception.getMessage()));
        }
        this.alertMessage = new Alert("Unable to save file on server.\nPlease report this on the forums. Try saving\nlocally by Shift-clicking the Save button.");
        return false;
    }

    public boolean saveLevelCookie() {
        int n = 0;
        while (n < 256) {
            String string = Integer.toHexString(n);
            while (string.length() < 2) {
                string = "0" + string;
            }
            String string2 = "local" + string;
            if (this.getCookie(string2) == null) {
                String string3 = this.serializeLevel();
                if (this.setCookie(string2, string3)) {
                    this.alertMessage = new AlertBig("Level has been saved locally as '" + string2 + "'.\n\nThis level is available only on this computer.\nIf you want to share it with others, you must\nsave it again without holding Shift.");
                    return true;
                }
                this.alertMessage = new Alert("Unable to save file locally.\nThis will only work if you are running\nin a browser and using an http:// URL.");
                return false;
            }
            ++n;
        }
        this.alertMessage = new Alert("Unable to save file locally.\nYou already have 256 saved levels.\nYou can delete them all by clearing\nyour cookies");
        return false;
    }

    public void setGameplay(boolean bl) {
        int n;
        this.gameplay = bl;
        int n2 = 0;
        while (n2 < this.tileAvailable.length) {
            this.tileAvailable[n2] = true;
            ++n2;
        }
        this.tileAvailable[28] = false;
        this.tileAvailable[58] = false;
        if (!this.gameplay) {
            return;
        }
        n2 = 0;
        while (n2 < this.ysize) {
            n = 0;
            while (n < this.xsize) {
                if (this.gameGrid[n][n2] == this.antisign) {
                    int n3 = n2 - 1;
                    while (n3 <= n2 + 1) {
                        int n4 = n - 1;
                        while (n4 <= n + 1) {
                            Point point = new Point(n4, n3);
                            if (this.boxGameGrid.contains(point)) {
                                this.tileAvailable[this.gameGrid[point.x][point.y]] = false;
                            }
                            ++n4;
                        }
                        ++n3;
                    }
                }
                ++n;
            }
            ++n2;
        }
        n2 = 19;
        while (n2 < 30) {
            this.tileAvailable[n2] = false;
            ++n2;
        }
        n2 = 49;
        while (n2 < 60) {
            this.tileAvailable[n2] = false;
            ++n2;
        }
        n2 = 60;
        while (n2 < 90) {
            this.tileAvailable[n2] = false;
            ++n2;
        }
        this.tileAvailable[0] = true;
        n2 = 0;
        while (n2 < this.ysize) {
            n = 0;
            while (n < this.xsize) {
                this.locked[n][n2] = this.gameGrid[n][n2] > 0 && this.tileAvailable[this.gameGrid[n][n2]];
                ++n;
            }
            ++n2;
        }
        if (!this.tileAvailable[this.drawitem]) {
            this.drawitem = 0;
        }
    }

    public HashMap getCookies() {
        String string;
        HashMap<String, String> hashMap;
        block6: {
            hashMap = new HashMap<String, String>();
            JSObject jSObject = JSObject.getWindow((Applet)((Object)this));
            JSObject jSObject2 = (JSObject)jSObject.getMember("document");
            string = (String)jSObject2.getMember("cookie");
            if (string != null) break block6;
            return null;
        }
        try {
            String[] stringArray = string.split(";");
            int n = 0;
            while (n < stringArray.length) {
                String[] stringArray2 = stringArray[n].trim().split("=", 2);
                if (stringArray2.length == 2) {
                    hashMap.put(stringArray2[0], stringArray2[1]);
                } else {
                    hashMap.put(stringArray2[0], null);
                }
                ++n;
            }
            return hashMap;
        }
        catch (Exception exception) {
            return null;
        }
    }

    public String getCookie(String string) {
        HashMap hashMap = this.getCookies();
        if (hashMap == null) {
            return null;
        }
        return (String)hashMap.get(string);
    }

    public boolean setCookie(String string, String string2) {
        try {
            JSObject jSObject = JSObject.getWindow((Applet)((Object)this));
            JSObject jSObject2 = (JSObject)jSObject.getMember("document");
            jSObject2.setMember("cookie", String.valueOf(string) + "=" + string2);
            return true;
        }
        catch (Exception exception) {
            return false;
        }
    }

    public static void main(String[] stringArray) {
        PApplet.main((String[])new String[]{"--bgcolor=#F0F0F0", "rubicon"});
    }

    class Alert
    extends AlertBase {
        private Button buttonOK;

        Alert(String string) {
            super(string);
            this.buttonOK = new Button(new Box(500, 270, 60, 20), rubicon.this.color(215), new Point(16, 16), "OK");
        }

        protected void drawButtons() {
            this.buttonOK.draw();
        }

        public void mouseMoved() {
            this.buttonOK.loopIfNeeded();
        }

        public void keyPressed() {
            if (rubicon.this.keyCode == 13 || rubicon.this.keyCode == 10) {
                this.onOK();
            } else if (rubicon.this.keyCode == 27) {
                this.onOK();
            }
        }

        public void mousePressed() {
            Point point = new Point(rubicon.this.mouseX, rubicon.this.mouseY);
            if (this.buttonOK.contains(point)) {
                this.onOK();
            }
        }

        protected void onOK() {
            rubicon.this.alertMessage = null;
        }
    }

    class AlertBase {
        protected String message;
        protected Box bx;

        AlertBase(String string) {
            this.bx = new Box(225, 170, 350, 130);
            this.message = string;
        }

        public void draw() {
            rubicon.this.textFont(rubicon.this.font16);
            rubicon.this.stroke(90);
            rubicon.this.fill(15);
            this.bx.rect();
            rubicon.this.fill(215);
            rubicon.this.text(this.message, this.bx.x + 24, this.bx.y + 30);
            this.drawButtons();
        }

        protected void drawButtons() {
        }

        public void mouseMoved() {
        }

        public void keyPressed() {
        }

        public void mousePressed() {
        }
    }

    class AlertBig
    extends Alert {
        AlertBig(String string) {
            super(string);
            this.bx = new Box(225, 100, 365, 210);
        }
    }

    class AlertQuestion
    extends AlertBase {
        private Button questionButtonOK;
        private Button questionButtonCancel;

        AlertQuestion(String string) {
            super(string);
            this.questionButtonOK = new Button(new Box(450, 270, 40, 20), rubicon.this.color(215), new Point(8, 16), "OK");
            this.questionButtonCancel = new Button(new Box(500, 270, 60, 20), rubicon.this.color(215), new Point(8, 16), "Cancel");
        }

        protected void drawButtons() {
            this.questionButtonOK.draw();
            this.questionButtonCancel.draw();
        }

        public void mouseMoved() {
            this.questionButtonOK.loopIfNeeded();
            this.questionButtonCancel.loopIfNeeded();
        }

        public void keyPressed() {
            if (rubicon.this.keyCode == 13 || rubicon.this.keyCode == 10) {
                this.onOK();
            } else if (rubicon.this.keyCode == 27) {
                this.onCancel();
            }
        }

        public void mousePressed() {
            Point point = new Point(rubicon.this.mouseX, rubicon.this.mouseY);
            if (this.questionButtonOK.contains(point)) {
                this.onOK();
            } else if (this.questionButtonCancel.contains(point)) {
                this.onCancel();
            }
        }

        protected void onOK() {
            rubicon.this.alertMessage = null;
        }

        protected void onCancel() {
            rubicon.this.alertMessage = null;
        }
    }

    class AlertTextInput
    extends AlertQuestion {
        public String input;
        protected String initialMessage;
        protected int maxLen;

        AlertTextInput(String string, int n) {
            super("");
            this.input = "";
            this.initialMessage = string;
            this.maxLen = n;
            this.update();
        }

        private void update() {
            this.message = String.valueOf(this.initialMessage) + this.input + "_";
        }

        public void keyPressed() {
            super.keyPressed();
            String string = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
            if ((rubicon.this.keyCode == 8 || rubicon.this.keyCode == 37) && this.input.length() > 0) {
                this.input = this.input.substring(0, this.input.length() - 1);
                this.update();
            } else if (string.indexOf(rubicon.this.key) >= 0 && this.input.length() < this.maxLen) {
                this.input = (String.valueOf(this.input) + rubicon.this.key).toLowerCase();
                this.update();
            }
        }
    }

    class Box {
        int x;
        int y;
        int w;
        int h;

        Box(int n, int n2, int n3, int n4) {
            this.x = n;
            this.y = n2;
            this.w = n3;
            this.h = n4;
        }

        Box(Box box) {
            this.x = box.x;
            this.y = box.y;
            this.w = box.w;
            this.h = box.h;
        }

        Box(Point point, int n, int n2) {
            this.x = point.x;
            this.y = point.y;
            this.w = n;
            this.h = n2;
        }

        public boolean contains(Point point) {
            return point.x >= this.x && point.x <= this.x + this.w && point.y >= this.y && point.y <= this.y + this.h;
        }

        public void normalize() {
            int n = rubicon.min((int)this.x, (int)(this.x + this.w));
            int n2 = rubicon.min((int)this.y, (int)(this.y + this.h));
            int n3 = rubicon.max((int)this.x, (int)(this.x + this.w));
            int n4 = rubicon.max((int)this.y, (int)(this.y + this.h));
            this.x = n;
            this.y = n2;
            this.w = n3 - n;
            this.h = n4 - n2;
        }

        public void setSecondPoint(Point point) {
            this.w = point.x - this.x;
            this.h = point.y - this.y;
        }

        public void rect() {
            rubicon.this.rect(this.x, this.y, this.w, this.h);
        }

        public void gameGridRect() {
            if (this.w < 0 || this.h < 0) {
                Box box = new Box(this);
                box.normalize();
                box.gameGridRect();
                return;
            }
            if (this.x >= rubicon.this.xsize || this.y >= rubicon.this.ysize) {
                return;
            }
            int n = this.x + this.w + 1;
            int n2 = this.y + this.h + 1;
            int n3 = rubicon.min((int)n, (int)rubicon.this.xsize);
            int n4 = rubicon.min((int)n2, (int)rubicon.this.ysize);
            int n5 = this.x * 16;
            int n6 = this.y * 16;
            int n7 = n3 * 16 - 1;
            int n8 = n4 * 16 - 1;
            rubicon.this.line(n5, n6, n7, n6);
            rubicon.this.line(n5, n6, n5, n8);
            if (n == n3) {
                rubicon.this.line(n7, n6, n7, n8);
            }
            if (n2 == n4) {
                rubicon.this.line(n5, n8, n7, n8);
            }
        }
    }

    class Button {
        private Box bx;
        private int caption_color;
        private Point caption_offset;
        private String caption;
        private boolean hovered;

        Button(Box box, int n, Point point, String string) {
            this.bx = box;
            this.caption_color = n;
            this.caption_offset = point;
            this.caption = string;
        }

        public void draw() {
            Point point = new Point(rubicon.this.mouseX, rubicon.this.mouseY);
            this.hovered = this.bx.contains(point);
            if (this.hovered) {
                rubicon.this.fill(150);
            } else {
                rubicon.this.fill(100);
            }
            this.bx.rect();
            rubicon.this.textFont(rubicon.this.font16);
            rubicon.this.fill(this.caption_color);
            rubicon.this.text(this.caption, this.bx.x + this.caption_offset.x, this.bx.y + this.caption_offset.y);
        }

        public boolean contains(Point point) {
            return this.bx.contains(point);
        }

        public void loopIfNeeded() {
            Point point = new Point(rubicon.this.mouseX, rubicon.this.mouseY);
            if (this.hovered != this.bx.contains(point)) {
                rubicon.this.loop();
            }
        }
    }

    class Point {
        int x;
        int y;

        Point(int n, int n2) {
            this.x = n;
            this.y = n2;
        }

        public void add(Point point) {
            this.x += point.x;
            this.y += point.y;
        }
    }
}

