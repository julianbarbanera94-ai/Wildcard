package com.wildcard.game;

import android.app.Activity;
import android.os.Bundle;
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

  /** Back acts as the game's B button; on the title screen it closes the app. */
  @Override public void onBackPressed() {
    web.evaluateJavascript("window.G&&G.androidBack?G.androidBack():'exit'", new ValueCallback<String>() {
      @Override public void onReceiveValue(String v) { if (v == null || !v.contains("handled")) finish(); }
    });
  }

  @Override protected void onDestroy() { web.destroy(); super.onDestroy(); }
}
