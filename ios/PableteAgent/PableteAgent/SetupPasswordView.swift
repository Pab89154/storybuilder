import SwiftUI

struct SetupPasswordView: View {
    @EnvironmentObject var appState: AppState

    @State private var password = ""
    @State private var confirm = ""
    @State private var errorMessage: String?

    var body: some View {
        VStack(spacing: 24) {
            Spacer()

            Image(systemName: "lock.shield.fill")
                .font(.system(size: 56))
                .foregroundStyle(.indigo)

            VStack(spacing: 8) {
                Text("Welcome to Pablete")
                    .font(.title.bold())
                Text("Create a password to protect your private agent.")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                    .multilineTextAlignment(.center)
            }

            VStack(spacing: 12) {
                SecureField("Password", text: $password)
                    .textFieldStyle(.roundedBorder)

                SecureField("Confirm password", text: $confirm)
                    .textFieldStyle(.roundedBorder)
            }
            .padding(.horizontal)

            if let errorMessage {
                Text(errorMessage)
                    .font(.footnote)
                    .foregroundStyle(.red)
            }

            Button("Create password") {
                createPassword()
            }
            .buttonStyle(.borderedProminent)
            .tint(.indigo)
            .disabled(password.count < 4 || confirm.count < 4)

            Spacer()
        }
        .padding()
    }

    private func createPassword() {
        errorMessage = nil

        guard password.count >= 4 else {
            errorMessage = "Use at least 4 characters."
            return
        }

        guard password == confirm else {
            errorMessage = "Passwords do not match."
            return
        }

        do {
            try appState.completeSetup(password: password)
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}
