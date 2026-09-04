package com.example

import android.annotation.SuppressLint
import android.app.Activity
import android.app.AlertDialog
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.print.PrintAttributes
import android.print.PrintManager
import android.webkit.JavascriptInterface
import android.webkit.JsPromptResult
import android.webkit.JsResult
import android.webkit.ValueCallback
import android.webkit.WebChromeClient
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.EditText
import androidx.activity.ComponentActivity
import androidx.activity.OnBackPressedCallback
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.safeDrawingPadding
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.viewinterop.AndroidView
import com.example.ui.theme.MyApplicationTheme

class MainActivity : ComponentActivity() {

  private var webView: WebView? = null
  private var filePathCallback: ValueCallback<Array<Uri>>? = null

  private val fileChooserLauncher =
    registerForActivityResult(ActivityResultContracts.StartActivityForResult()) { result ->
      if (filePathCallback != null) {
        val uris: Array<Uri>? =
          if (result.resultCode == Activity.RESULT_OK && result.data != null) {
            val clipData = result.data?.clipData
            if (clipData != null) {
              Array(clipData.itemCount) { i -> clipData.getItemAt(i).uri }
            } else {
              result.data?.data?.let { arrayOf(it) }
            }
          } else {
            null
          }
        filePathCallback?.onReceiveValue(uris)
        filePathCallback = null
      }
    }

  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    enableEdgeToEdge()

    onBackPressedDispatcher.addCallback(
      this,
      object : OnBackPressedCallback(true) {
        override fun handleOnBackPressed() {
          if (webView?.canGoBack() == true) {
            webView?.goBack()
          } else {
            finish()
          }
        }
      }
    )

    setContent {
      MyApplicationTheme {
        SalaryWebViewScreen(
          modifier = Modifier.fillMaxSize().safeDrawingPadding(),
          onWebViewCreated = { wv ->
            webView = wv
            setupWebView(wv)
          }
        )
      }
    }
  }

  @SuppressLint("SetJavaScriptEnabled")
  private fun setupWebView(wv: WebView) {
    val settings = wv.settings
    settings.javaScriptEnabled = true
    settings.domStorageEnabled = true
    settings.databaseEnabled = true
    settings.allowFileAccess = true
    settings.allowContentAccess = true
    settings.useWideViewPort = true
    settings.loadWithOverviewMode = true
    settings.builtInZoomControls = false
    settings.displayZoomControls = false
    settings.cacheMode = WebSettings.LOAD_DEFAULT

    wv.addJavascriptInterface(WebAppInterface(this, wv), "Android")

    wv.webViewClient = object : WebViewClient() {
      override fun shouldOverrideUrlLoading(view: WebView?, url: String?): Boolean {
        if (url != null && (url.startsWith("tel:") || url.startsWith("mailto:") || url.startsWith("https://api.whatsapp.com/"))) {
          try {
            val intent = Intent(Intent.ACTION_VIEW, Uri.parse(url))
            startActivity(intent)
            return true
          } catch (e: Exception) {
            e.printStackTrace()
          }
        }
        return false
      }
    }

    wv.webChromeClient = object : WebChromeClient() {
      override fun onShowFileChooser(
        view: WebView?,
        filePathCallback: ValueCallback<Array<Uri>>?,
        fileChooserParams: FileChooserParams?
      ): Boolean {
        this@MainActivity.filePathCallback?.onReceiveValue(null)
        this@MainActivity.filePathCallback = filePathCallback

        val intent = fileChooserParams?.createIntent() ?: Intent(Intent.ACTION_GET_CONTENT).apply {
          type = "*/*"
          addCategory(Intent.CATEGORY_OPENABLE)
        }

        try {
          fileChooserLauncher.launch(intent)
        } catch (e: Exception) {
          this@MainActivity.filePathCallback = null
          return false
        }
        return true
      }

      override fun onJsAlert(view: WebView?, url: String?, message: String?, result: JsResult?): Boolean {
        AlertDialog.Builder(this@MainActivity)
          .setTitle("SALARY")
          .setMessage(message)
          .setPositiveButton(android.R.string.ok) { _, _ -> result?.confirm() }
          .setCancelable(false)
          .create()
          .show()
        return true
      }

      override fun onJsConfirm(view: WebView?, url: String?, message: String?, result: JsResult?): Boolean {
        AlertDialog.Builder(this@MainActivity)
          .setTitle("SALARY")
          .setMessage(message)
          .setPositiveButton(android.R.string.ok) { _, _ -> result?.confirm() }
          .setNegativeButton(android.R.string.cancel) { _, _ -> result?.cancel() }
          .setCancelable(false)
          .create()
          .show()
        return true
      }

      override fun onJsPrompt(
        view: WebView?,
        url: String?,
        message: String?,
        defaultValue: String?,
        result: JsPromptResult?
      ): Boolean {
        val input = EditText(this@MainActivity).apply {
          setText(defaultValue)
        }
        AlertDialog.Builder(this@MainActivity)
          .setTitle("SALARY")
          .setMessage(message)
          .setView(input)
          .setPositiveButton(android.R.string.ok) { _, _ -> result?.confirm(input.text.toString()) }
          .setNegativeButton(android.R.string.cancel) { _, _ -> result?.cancel() }
          .setCancelable(false)
          .create()
          .show()
        return true
      }
    }

    wv.loadUrl("file:///android_asset/www/index.html")
  }

  class WebAppInterface(private val activity: Activity, private val webView: WebView) {
    @JavascriptInterface
    fun printPage() {
      activity.runOnUiThread {
        val printManager = activity.getSystemService(Context.PRINT_SERVICE) as? PrintManager
        val printAdapter = webView.createPrintDocumentAdapter("Salary_Document")
        printManager?.print("SALARY Payslip", printAdapter, PrintAttributes.Builder().build())
      }
    }
  }
}

@Composable
fun SalaryWebViewScreen(
  modifier: Modifier = Modifier,
  onWebViewCreated: (WebView) -> Unit
) {
  AndroidView(
    modifier = modifier,
    factory = { context ->
      WebView(context).apply {
        onWebViewCreated(this)
      }
    }
  )
}
