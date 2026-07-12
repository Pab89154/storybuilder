import Foundation

@MainActor
final class AppState: ObservableObject {
    @Published var isUnlocked = false
    @Published var hasPassword: Bool

    private let keychain = KeychainHelper.shared

    init() {
        hasPassword = keychain.hasPassword()
    }

    func completeSetup(password: String) throws {
        try keychain.savePassword(password)
        hasPassword = true
        isUnlocked = true
    }

    func unlock(password: String) -> Bool {
        guard keychain.verifyPassword(password) else { return false }
        isUnlocked = true
        return true
    }

    func lock() {
        isUnlocked = false
    }
}
