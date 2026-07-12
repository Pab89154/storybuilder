import SwiftUI

@main
struct PableteApp: App {
    @StateObject private var appState = AppState()

    var body: some Scene {
        WindowGroup {
            RootView()
                .environmentObject(appState)
        }
    }
}

struct RootView: View {
    @EnvironmentObject var appState: AppState

    var body: some View {
        Group {
            if !appState.hasPassword {
                SetupPasswordView()
            } else if !appState.isUnlocked {
                LockView()
            } else {
                ChatView()
            }
        }
        .animation(.easeInOut(duration: 0.25), value: appState.isUnlocked)
        .animation(.easeInOut(duration: 0.25), value: appState.hasPassword)
    }
}
