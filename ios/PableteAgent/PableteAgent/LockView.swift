import SwiftUI

struct LockView: View {
    @EnvironmentObject var appState: AppState

    @State private var password = ""
    @State private var errorMessage: String?
    @State private var shake = false

    var body: some View {
        VStack(spacing: 24) {
            Spacer()

            Image(systemName: "lock.fill")
                .font(.system(size: 48))
                .foregroundStyle(.indigo)

            VStack(spacing: 8) {
                Text("Pablete")
                    .font(.title.bold())
                Text("Enter your password")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }

            SecureField("Password", text: $password)
                .textFieldStyle(.roundedBorder)
                .padding(.horizontal)
                .offset(x: shake ? -8 : 0)
                .onSubmit { unlock() }

            if let errorMessage {
                Text(errorMessage)
                    .font(.footnote)
                    .foregroundStyle(.red)
            }

            Button("Unlock") {
                unlock()
            }
            .buttonStyle(.borderedProminent)
            .tint(.indigo)
            .disabled(password.isEmpty)

            Spacer()
        }
        .padding()
    }

    private func unlock() {
        errorMessage = nil

        if appState.unlock(password: password) {
            password = ""
            return
        }

        errorMessage = "Wrong password."
        password = ""

        withAnimation(.default) { shake = true }
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) {
            withAnimation(.default) { shake = false }
        }
    }
}
