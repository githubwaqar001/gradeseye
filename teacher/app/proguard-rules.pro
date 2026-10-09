# Keep the JS bridge classes/methods so WebView @JavascriptInterface calls still resolve after shrinking.
-keepclassmembers class pk.edu.hitec.wddregister.** {
    @android.webkit.JavascriptInterface <methods>;
}
