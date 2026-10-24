package com.wildcard.game;

import android.app.Activity;
import android.os.Bundle;
import android.view.InputDevice;
import android.view.KeyEvent;
import android.view.MotionEvent;
import android.view.View;
import android.view.WindowManager;
import android.webkit.ValueCallback;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

/** Hosts the game (bundled in assets/) in a full-screen WebView. Kept to plain Java 8 so it dexes with dx. */
public class MainActivity extends Activity {
  private static final String HOME = "file:///android_asset/index.html";
  private WebView web;

  @Override protected void onCreate(Bundle state) {
    super.onCreate(state);
    getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
    web = new WebView(this);
    web.setBackgroundColor(0xFF101018);
    web.setOverScrollMode(View.OVER_SCROLL_NEVER);
    web.setLongClickable(false);
    web.setHapticFeedbackEnabled(false);
    WebSettings s = web.getSettings();
    s.setJavaScriptEnabled(true);
    s.setDomStorageEnabled(true);                 // localStorage holds the save file
    s.setMediaPlaybackRequiresUserGesture(false); // lets WebAudio start from the touch pad
    s.setAllowContentAccess(false);
    s.setAllowFileAccessFromFileURLs(false);
    s.setAllowUniversalAccessFromFileURLs(false);
    s.setBuiltInZoomControls(false);
    web.setWebViewClient(new WebViewClient() {
      @Override public boolean shouldOverrideUrlLoading(WebView v, WebResourceRequest r) {
        return !HOME.equals(r.getUrl().toString().split("[?#]")[0]); // never navigate away from the game
      }
    });
    setContentView(web);
    immersive();
    web.loadUrl(HOME);
  }

  private void immersive() {
    getWindow().getDecorView().setSystemUiVisibility(View.SYSTEM_UI_FLAG_LAYOUT_STABLE | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
        | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION | View.SYSTEM_UI_FLAG_FULLSCREEN | View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY);
  }

  @Override public void onWindowFocusChanged(boolean focus) { super.onWindowFocusChanged(focus); if (focus) immersive(); }

  @Override protected void onPause() {
    web.evaluateJavascript("window.G&&G.autosave&&G.autosave()", null);
    web.onPause();
    web.pauseTimers();
    super.onPause();
  }

  @Override protected void onResume() {
    super.onResume();
    web.resumeTimers();
    web.onResume();
  }


  // ---- Game controllers (Backbone One, Xbox, PlayStation and other standard pads) ----
  // The pad's keys and sticks are caught here and passed to the game as button indexes of the web "standard" gamepad layout
  // (js/gamepad.js), so they work whether or not the WebView exposes the Gamepad API, and never reach the page as Enter or arrows.
  private static boolean isPad(InputDevice d, int source) {
    if (d == null) return false;
    return (source & InputDevice.SOURCE_GAMEPAD) == InputDevice.SOURCE_GAMEPAD || (source & InputDevice.SOURCE_JOYSTICK) == InputDevice.SOURCE_JOYSTICK;
  }

  private static int button(int code) {
    switch (code) {
      case KeyEvent.KEYCODE_BUTTON_A: return 0;
      case KeyEvent.KEYCODE_BUTTON_B: return 1;
      case KeyEvent.KEYCODE_BUTTON_X: return 2;
      case KeyEvent.KEYCODE_BUTTON_Y: return 3;
      case KeyEvent.KEYCODE_BUTTON_L1: return 4;
      case KeyEvent.KEYCODE_BUTTON_R1: return 5;
      case KeyEvent.KEYCODE_BUTTON_L2: return 6;
      case KeyEvent.KEYCODE_BUTTON_R2: return 7;
      case KeyEvent.KEYCODE_BUTTON_SELECT: return 8;
      case KeyEvent.KEYCODE_BUTTON_START: return 9;
      case KeyEvent.KEYCODE_BUTTON_THUMBL: return 10;
      case KeyEvent.KEYCODE_BUTTON_THUMBR: return 11;
      case KeyEvent.KEYCODE_DPAD_UP: return 12;
      case KeyEvent.KEYCODE_DPAD_DOWN: return 13;
      case KeyEvent.KEYCODE_DPAD_LEFT: return 14;
      case KeyEvent.KEYCODE_DPAD_RIGHT: return 15;
      case KeyEvent.KEYCODE_BUTTON_MODE: return 16;
      default: return -1;
    }
  }

  @Override public boolean dispatchKeyEvent(KeyEvent e) {
    int idx = button(e.getKeyCode());
    if (idx >= 0 && isPad(e.getDevice(), e.getSource())) {
      if (e.getRepeatCount() == 0) {
        String name = e.getDevice().getName().replace("\\", " ").replace("'", " ");
        web.evaluateJavascript("window.G&&G.pad&&G.pad.native(" + idx + "," + (e.getAction() == KeyEvent.ACTION_DOWN) + ",'" + name + "')", null);
      }
      return true;
    }
    return super.dispatchKeyEvent(e);
  }

  @Override public boolean dispatchGenericMotionEvent(MotionEvent e) {
    if (e.getAction() == MotionEvent.ACTION_MOVE && isPad(e.getDevice(), e.getSource())) {
      web.evaluateJavascript("window.G&&G.pad&&G.pad.axes(" + e.getAxisValue(MotionEvent.AXIS_X) + "," + e.getAxisValue(MotionEvent.AXIS_Y) + ","
          + e.getAxisValue(MotionEvent.AXIS_HAT_X) + "," + e.getAxisValue(MotionEvent.AXIS_HAT_Y) + ")", null);
      return true;
    }
    return super.dispatchGenericMotionEvent(e);
  }

  /** Back acts as the game's B button; on the title screen it closes the app. */
  @Override public void onBackPressed() {
    web.evaluateJavascript("window.G&&G.androidBack?G.androidBack():'exit'", new ValueCallback<String>() {
      @Override public void onReceiveValue(String v) { if (v == null || !v.contains("handled")) finish(); }
    });
  }

  @Override protected void onDestroy() { web.destroy(); super.onDestroy(); }
}
