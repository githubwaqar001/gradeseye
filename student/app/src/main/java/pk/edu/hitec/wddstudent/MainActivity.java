package pk.edu.hitec.wddstudent;

import android.Manifest;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.ConnectivityManager;
import android.net.Network;
import android.net.NetworkRequest;
import android.os.Build;
import android.os.Bundle;
import android.util.Base64;
import android.view.View;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.TextView;

import androidx.activity.OnBackPressedCallback;
import androidx.activity.result.ActivityResultLauncher;
import androidx.activity.result.contract.ActivityResultContracts;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.content.ContextCompat;
import androidx.core.content.FileProvider;
import androidx.swiperefreshlayout.widget.SwipeRefreshLayout;

import java.io.File;
import java.io.FileOutputStream;

/**
 * Hosts the Student web app (assets/www/index.html) and bridges the native capabilities
 * section 24 asks for: offline login, notifications, connectivity awareness and file
 * sharing. See activity_main.xml for why there's no second native toolbar — the web app
 * owns its own top nav bar.
 */
public class MainActivity extends AppCompatActivity {

    private WebView webView;
    private TextView offlineBanner;
    private ActivityResultLauncher<String> notifPermLauncher;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        webView = findViewById(R.id.webView);
        offlineBanner = findViewById(R.id.offlineBanner);
        SwipeRefreshLayout swipeRefresh = findViewById(R.id.swipeRefresh);

        setUpWebView();
        setUpActivityResultLaunchers();
        setUpBackNavigation();
        monitorConnectivity();

        swipeRefresh.setOnRefreshListener(() -> {
            webView.reload();
            swipeRefresh.setRefreshing(false);
        });

        requestNotificationPermissionIfNeeded();
        SyncWorker.schedulePeriodic(this);

        webView.loadUrl("file:///android_asset/www/index.html");
    }

    private void setUpWebView() {
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setAllowFileAccess(true);
        settings.setCacheMode(WebSettings.LOAD_DEFAULT);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);

        webView.addJavascriptInterface(new JsBridge(this), "Native");

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                String url = request.getUrl().toString();
                if (url.startsWith("file:///android_asset/")) {
                    return false;
                }
                startActivity(new Intent(Intent.ACTION_VIEW, request.getUrl()));
                return true;
            }
        });
    }

    private void setUpActivityResultLaunchers() {
        notifPermLauncher = registerForActivityResult(
                new ActivityResultContracts.RequestPermission(), granted -> { });
    }

    private void setUpBackNavigation() {
        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override
            public void handleOnBackPressed() {
                if (webView.canGoBack()) {
                    webView.goBack();
                } else {
                    setEnabled(false);
                    getOnBackPressedDispatcher().onBackPressed();
                }
            }
        });
    }

    private void monitorConnectivity() {
        ConnectivityManager cm = (ConnectivityManager) getSystemService(CONNECTIVITY_SERVICE);
        if (cm == null) return;
        cm.registerNetworkCallback(new NetworkRequest.Builder().build(), new ConnectivityManager.NetworkCallback() {
            @Override
            public void onAvailable(Network network) {
                runOnUiThread(() -> {
                    offlineBanner.setVisibility(View.GONE);
                    postToWebView("window.onConnectivityChange && window.onConnectivityChange(true)");
                });
            }

            @Override
            public void onLost(Network network) {
                runOnUiThread(() -> {
                    offlineBanner.setVisibility(View.VISIBLE);
                    postToWebView("window.onConnectivityChange && window.onConnectivityChange(false)");
                });
            }
        });
    }

    void requestNotificationPermissionIfNeeded() {
        if (Build.VERSION.SDK_INT >= 33 &&
                ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS)
                        != PackageManager.PERMISSION_GRANTED) {
            notifPermLauncher.launch(Manifest.permission.POST_NOTIFICATIONS);
        }
    }

    void shareFile(String base64Data, String filename, String mime) {
        try {
            File dir = new File(getCacheDir(), "exports");
            if (!dir.exists()) dir.mkdirs();
            File file = new File(dir, filename);
            byte[] bytes = Base64.decode(base64Data, Base64.DEFAULT);
            try (FileOutputStream out = new FileOutputStream(file)) {
                out.write(bytes);
            }
            android.net.Uri uri = FileProvider.getUriForFile(this, getPackageName() + ".fileprovider", file);
            Intent share = new Intent(Intent.ACTION_SEND);
            share.setType(mime);
            share.putExtra(Intent.EXTRA_STREAM, uri);
            share.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
            startActivity(Intent.createChooser(share, getString(R.string.app_name)));
        } catch (Exception e) {
            postToWebView("window.onShareFileError && window.onShareFileError('" + e.getMessage() + "')");
        }
    }

    private void postToWebView(String script) {
        runOnUiThread(() -> webView.evaluateJavascript(script, null));
    }
}
