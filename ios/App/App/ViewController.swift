import UIKit
import Capacitor
import WebKit

class ViewController: CAPBridgeViewController {

    override func viewDidLoad() {
        super.viewDidLoad()
        webView?.uiDelegate = self
    }
}

// MARK: - WKUIDelegate: trap window.open() and target="_blank" inside the app
extension ViewController: WKUIDelegate {

    func webView(
        _ webView: WKWebView,
        createWebViewWith configuration: WKWebViewConfiguration,
        for navigationAction: WKNavigationAction,
        windowFeatures: WKWindowFeatures
    ) -> WKWebView? {
        // Any link that would normally open a new window/Safari loads here instead
        if let url = navigationAction.request.url {
            webView.load(URLRequest(url: url))
        }
        return nil
    }
}
