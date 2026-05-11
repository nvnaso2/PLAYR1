import UIKit
import Capacitor

class ViewController: CAPBridgeViewController {
    override open func instanceDescriptor() -> InstanceDescriptor {
        let descriptor = super.instanceDescriptor()
        descriptor.serverURL = nil
        return descriptor
    }
}
